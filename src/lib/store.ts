import { useSyncExternalStore } from 'react';
import { AppState } from 'react-native';

import { supabase } from './supabase';
import type { Account, Category, Data, Payee, Profile, Table, Txn, TxnType } from './types';

// One in-memory copy of everything, mirrored to the phone's storage so the app opens instantly
// and works offline. Changes are applied locally first, then sent to Supabase from a queue.

type Op = { table: Table; kind: 'upsert'; row: { id: string } } | { table: Table; kind: 'delete'; id: string };

export type State = {
  auth: 'loading' | 'out' | 'in';
  userId: string | null;
  email: string | null;
  data: Data;
  activeProfileId: string | null;
  outbox: Op[];
  syncing: boolean;
  lastSync: number | null;
  syncError: string | null;
  // Current time. Kept here so every screen agrees on which transactions have happened yet.
  now: number;
};

const EMPTY: Data = { profiles: [], accounts: [], categories: [], payees: [], transactions: [] };

const COLUMNS: Record<Table, string> = {
  profiles: 'id,name,currency,created_at',
  accounts: 'id,profile_id,name,start_balance,color,created_at',
  categories: 'id,profile_id,name,type,color,created_at',
  payees: 'id,profile_id,name,created_at',
  transactions:
    'id,profile_id,account_id,type,amount,payee,category_id,check_num,memo,occurs_at,done_at,created_at',
};
// Parents first, so a queued account is saved before its transactions.
const TABLES: Table[] = ['profiles', 'accounts', 'categories', 'payees', 'transactions'];

let state: State = {
  auth: 'loading',
  userId: null,
  email: null,
  data: EMPTY,
  activeProfileId: null,
  outbox: [],
  syncing: false,
  lastSync: null,
  syncError: null,
  now: Date.now(),
};

const listeners = new Set<() => void>();

function set(patch: Partial<State>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

export function getState(): State {
  return state;
}

export function useStore(): State {
  return useSyncExternalStore(subscribe, getState, getState);
}

// ---- local storage ---------------------------------------------------------------------------

function kvGet(key: string): string | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage.getItem(key);
  } catch {
    return null;
  }
}

function kvSet(key: string, value: string) {
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(key, value);
  } catch {
    // Storage full or unavailable: the app still works, it just won't open offline.
  }
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;

function save() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    if (!state.userId) return;
    kvSet(
      `pb:cache:${state.userId}`,
      JSON.stringify({ data: state.data, outbox: state.outbox, activeProfileId: state.activeProfileId })
    );
  }, 250);
}

// ---- ids -------------------------------------------------------------------------------------

export function uuid(): string {
  const b = new Uint8Array(16);
  const c = (globalThis as { crypto?: Crypto }).crypto;
  if (c?.getRandomValues) c.getRandomValues(b);
  else for (let i = 0; i < 16; i++) b[i] = Math.floor(Math.random() * 256);
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

// ---- applying changes ------------------------------------------------------------------------

function applyOp(data: Data, op: Op): Data {
  if (op.kind === 'upsert') {
    const rows = data[op.table] as { id: string }[];
    const exists = rows.some((r) => r.id === op.row.id);
    const next = exists ? rows.map((r) => (r.id === op.row.id ? op.row : r)) : [...rows, op.row];
    return { ...data, [op.table]: next };
  }
  const id = op.id;
  const next: Data = { ...data, [op.table]: (data[op.table] as { id: string }[]).filter((r) => r.id !== id) };
  // Mirror the database's cascade rules locally.
  if (op.table === 'profiles') {
    next.accounts = next.accounts.filter((r) => r.profile_id !== id);
    next.categories = next.categories.filter((r) => r.profile_id !== id);
    next.payees = next.payees.filter((r) => r.profile_id !== id);
    next.transactions = next.transactions.filter((r) => r.profile_id !== id);
  } else if (op.table === 'accounts') {
    next.transactions = next.transactions.filter((r) => r.account_id !== id);
  } else if (op.table === 'categories') {
    next.transactions = next.transactions.map((r) => (r.category_id === id ? { ...r, category_id: null } : r));
  }
  return next;
}

function enqueue(ops: Op[]) {
  let data = state.data;
  for (const op of ops) data = applyOp(data, op);
  set({ data, outbox: [...state.outbox, ...ops], now: Date.now() });
  save();
  scheduleSync(400);
}

export function put<T extends Table>(table: T, row: Data[T][number]) {
  enqueue([{ table, kind: 'upsert', row }]);
}

export function remove(table: Table, id: string) {
  enqueue([{ table, kind: 'delete', id }]);
}

// ---- sync ------------------------------------------------------------------------------------

let syncTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleSync(ms: number) {
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => void sync(), ms);
}

class RetryLater extends Error {}

async function send(op: Op) {
  const res =
    op.kind === 'upsert'
      ? await supabase.from(op.table).upsert(op.row)
      : await supabase.from(op.table).delete().eq('id', op.id);
  if (!res.error) return;
  const s = res.status;
  // No connection, expired login or a server hiccup: keep the change and try again later.
  if (!s || s === 401 || s === 408 || s === 429 || s >= 500) throw new RetryLater(res.error.message);
  // The server refused this change for good; drop it so the queue doesn't get stuck.
  set({ syncError: `A change could not be saved: ${res.error.message}` });
}

async function fetchAll(table: Table): Promise<{ id: string }[]> {
  const rows: { id: string }[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from(table)
      .select(COLUMNS[table])
      .order('created_at')
      .order('id')
      .range(from, from + 999);
    if (error) throw new RetryLater(error.message);
    rows.push(...(data as unknown as { id: string }[]));
    if (!data || data.length < 1000) return rows;
  }
}

export async function sync() {
  if (state.syncing || state.auth !== 'in') return;
  const userId = state.userId;
  set({ syncing: true });
  try {
    while (state.outbox.length > 0) {
      await send(state.outbox[0]);
      set({ outbox: state.outbox.slice(1) });
      save();
    }
    const [profiles, accounts, categories, payees, transactions] = await Promise.all(TABLES.map(fetchAll));
    if (state.userId !== userId) return;
    let data = {
      profiles,
      accounts: (accounts as Account[]).map((a) => ({ ...a, start_balance: Number(a.start_balance) })),
      categories,
      payees,
      transactions: (transactions as Txn[]).map((t) => ({ ...t, amount: Number(t.amount) })),
    } as Data;
    // Changes made while we were downloading are still queued; keep them visible.
    for (const op of state.outbox) data = applyOp(data, op);
    set({ data, lastSync: Date.now(), syncError: null });
    ensureProfile();
    save();
  } catch (e) {
    if (e instanceof RetryLater) set({ syncError: 'Offline. Changes are saved on this phone and will sync later.' });
    else set({ syncError: String((e as Error)?.message ?? e) });
  } finally {
    set({ syncing: false });
    if (state.outbox.length > 0) scheduleSync(state.syncError ? 15000 : 0);
  }
}

// ---- profiles --------------------------------------------------------------------------------

const DEFAULT_CATEGORIES: { name: string; type: TxnType; color: string }[] = [
  { name: 'Food', type: 'expense', color: '#EA580C' },
  { name: 'Transport', type: 'expense', color: '#2563EB' },
  { name: 'Shopping', type: 'expense', color: '#DB2777' },
  { name: 'Bills', type: 'expense', color: '#D97706' },
  { name: 'Health', type: 'expense', color: '#0891B2' },
  { name: 'Other', type: 'expense', color: '#6B7280' },
  { name: 'Salary', type: 'income', color: '#0F7B5F' },
  { name: 'Business', type: 'income', color: '#65A30D' },
  { name: 'Other', type: 'income', color: '#6B7280' },
];

export function createProfile(name: string, currency = 'INR'): string {
  const now = new Date().toISOString();
  const profile: Profile = { id: uuid(), name, currency, created_at: now };
  const ops: Op[] = [{ table: 'profiles', kind: 'upsert', row: profile }];
  const account: Account = {
    id: uuid(),
    profile_id: profile.id,
    name: 'Cash',
    start_balance: 0,
    color: '#7C3AED',
    created_at: now,
  };
  ops.push({ table: 'accounts', kind: 'upsert', row: account });
  for (const c of DEFAULT_CATEGORIES) {
    const row: Category = { id: uuid(), profile_id: profile.id, created_at: now, ...c };
    ops.push({ table: 'categories', kind: 'upsert', row });
  }
  enqueue(ops);
  setActiveProfile(profile.id);
  return profile.id;
}

export function setActiveProfile(id: string) {
  set({ activeProfileId: id });
  save();
}

// Called after a successful download: guarantees there is a profile and that one is selected.
function ensureProfile() {
  const { profiles } = state.data;
  if (profiles.length === 0) {
    createProfile('Personal');
  } else if (!profiles.some((p) => p.id === state.activeProfileId)) {
    set({ activeProfileId: profiles[0].id });
  }
}

// ---- transactions ----------------------------------------------------------------------------

// Counts an upcoming transaction right now instead of waiting for its time.
export function markDone(txn: Txn) {
  const now = new Date().toISOString();
  put('transactions', { ...txn, occurs_at: now, done_at: now });
}

// Remembers a typed payee name so it is suggested next time.
export function rememberPayee(profileId: string, name: string) {
  const clean = name.trim();
  if (!clean) return;
  const known = state.data.payees.some(
    (p) => p.profile_id === profileId && p.name.toLowerCase() === clean.toLowerCase()
  );
  if (known) return;
  const row: Payee = { id: uuid(), profile_id: profileId, name: clean, created_at: new Date().toISOString() };
  put('payees', row);
}

// ---- auth ------------------------------------------------------------------------------------

function signedIn(userId: string, email: string | null) {
  if (state.userId === userId && state.auth === 'in') return;
  let cached: Partial<Pick<State, 'data' | 'outbox' | 'activeProfileId'>> = {};
  try {
    cached = JSON.parse(kvGet(`pb:cache:${userId}`) ?? '{}');
  } catch {
    // Unreadable cache: start empty and download again.
  }
  set({
    auth: 'in',
    userId,
    email,
    data: { ...EMPTY, ...cached.data },
    outbox: cached.outbox ?? [],
    activeProfileId: cached.activeProfileId ?? null,
    lastSync: null,
    syncError: null,
  });
  void sync();
}

function signedOut() {
  set({ auth: 'out', userId: null, email: null, data: EMPTY, outbox: [], activeProfileId: null });
}

let started = false;

export function startStore() {
  if (started) return;
  started = true;

  supabase.auth.getSession().then(({ data }) => {
    const user = data.session?.user;
    if (user) signedIn(user.id, user.email ?? null);
    else signedOut();
  });

  supabase.auth.onAuthStateChange((_event, session) => {
    // Deferred: Supabase must not be called from inside this callback.
    setTimeout(() => {
      const user = session?.user;
      if (user) signedIn(user.id, user.email ?? null);
      else signedOut();
    }, 0);
  });

  AppState.addEventListener('change', (s) => {
    if (s === 'active') {
      set({ now: Date.now() });
      supabase.auth.startAutoRefresh();
      void sync();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
  setInterval(() => {
    if (AppState.currentState === 'active') void sync();
  }, 60000);
  // Moves the clock forward so upcoming transactions start counting on their own.
  setInterval(() => {
    if (AppState.currentState === 'active') set({ now: Date.now() });
  }, 15000);
  if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    window.addEventListener('online', () => void sync());
  }
}

export async function signOut() {
  await supabase.auth.signOut();
}

// ---- derived data ----------------------------------------------------------------------------

export type ProfileData = {
  profile: Profile | null;
  currency: string;
  accounts: Account[];
  categories: Category[];
  payees: Payee[];
  txns: Txn[];
};

let memo: { data: Data; id: string | null; value: ProfileData } | null = null;

function profileData(data: Data, id: string | null): ProfileData {
  if (memo && memo.data === data && memo.id === id) return memo.value;
  const profile = data.profiles.find((p) => p.id === id) ?? null;
  const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name);
  const time = (t: Txn) => new Date(t.occurs_at).getTime();
  const value: ProfileData = {
    profile,
    currency: profile?.currency ?? 'INR',
    accounts: data.accounts.filter((r) => r.profile_id === id),
    categories: data.categories.filter((r) => r.profile_id === id).sort(byName),
    payees: data.payees.filter((r) => r.profile_id === id).sort(byName),
    // Newest first.
    txns: data.transactions.filter((r) => r.profile_id === id).sort((a, b) => time(b) - time(a)),
  };
  memo = { data, id, value };
  return value;
}

// Everything that belongs to the profile currently selected on this phone.
export function useProfileData(): ProfileData {
  const s = useStore();
  return profileData(s.data, s.activeProfileId);
}

// Current time, refreshed every few seconds and after every change.
export function useNow(): number {
  return useStore().now;
}

export function isDone(t: Txn, now: number): boolean {
  return new Date(t.occurs_at).getTime() <= now;
}

export function signed(t: Txn): number {
  return t.type === 'income' ? t.amount : -t.amount;
}

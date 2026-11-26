-- PaisaBook database setup.
-- Run this once in Supabase: Dashboard -> SQL Editor -> New query -> paste -> Run.
-- It is safe to run again; existing tables and data are kept.

create table if not exists public.profiles (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  currency text not null default 'INR',
  created_at timestamptz not null default now()
);

create table if not exists public.accounts (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  start_balance numeric(14, 2) not null default 0,
  color text not null default '#7C3AED',
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
-- Added later: position of the account in the list (changed by dragging).
alter table public.accounts add column if not exists sort_order integer not null default 0;

create table if not exists public.categories (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  type text not null check (type in ('income', 'expense')),
  color text not null default '#7C3AED',
  created_at timestamptz not null default now()
);

create table if not exists public.payees (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

-- occurs_at is the moment a transaction starts counting towards the balance.
-- A transaction with occurs_at in the future is "upcoming" until that time passes.
-- done_at is set when someone taps "Done" to count it early.
create table if not exists public.transactions (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  account_id uuid not null references public.accounts (id) on delete cascade,
  type text not null check (type in ('income', 'expense')),
  amount numeric(14, 2) not null check (amount >= 0),
  payee text not null default '',
  category_id uuid references public.categories (id) on delete set null,
  check_num text not null default '',
  memo text not null default '',
  occurs_at timestamptz not null,
  done_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists accounts_user_idx on public.accounts (user_id);
create index if not exists categories_user_idx on public.categories (user_id);
create index if not exists payees_user_idx on public.payees (user_id);
create index if not exists transactions_user_idx on public.transactions (user_id, occurs_at);
create index if not exists transactions_account_idx on public.transactions (account_id);

-- Security: every row belongs to the signed-in user, and nobody else can read or change it.
do $$
declare
  t text;
begin
  foreach t in array array['profiles', 'accounts', 'categories', 'payees', 'transactions']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "own rows" on public.%I', t);
    execute format(
      'create policy "own rows" on public.%I for all to authenticated
         using (user_id = (select auth.uid()))
         with check (user_id = (select auth.uid()))',
      t
    );
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('revoke all on public.%I from anon', t);
  end loop;
end $$;

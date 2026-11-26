import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { DateModal } from '@/components/date-modal';
import { Icon } from '@/components/icon';
import { TimeModal } from '@/components/time-modal';
import { Button, Chip, ConfirmButton, Header, IconButton, Screen, goBack } from '@/components/ui';
import { currencySymbol, dateLabel, dayKey, parseAmount, timeLabel } from '@/lib/format';
import { OFFLINE_MESSAGE, isOnline } from '@/lib/online';
import { put, remove, useNow, useProfileData, uuid } from '@/lib/store';
import { C, PALETTE } from '@/lib/theme';
import type { TxnType } from '@/lib/types';

// Add or edit one income or expense, in two steps:
// 1. tap a category (shown as round buttons), 2. type the amount and save.
export default function TxnForm() {
  const params = useLocalSearchParams<{ id?: string; type?: TxnType; accountId?: string; date?: string }>();
  const { profile, accounts, categories, txns, currency } = useProfileData();
  const existing = txns.find((t) => t.id === params.id);
  const now = useNow();

  const [step, setStep] = useState<'category' | 'details'>(existing ? 'details' : 'category');
  const [type, setType] = useState<TxnType>(existing?.type ?? (params.type === 'income' ? 'income' : 'expense'));
  const [amount, setAmount] = useState(existing ? String(existing.amount) : '');
  const [categoryId, setCategoryId] = useState<string | null>(existing?.category_id ?? null);
  const [accountId, setAccountId] = useState(
    existing?.account_id ?? params.accountId ?? txns[0]?.account_id ?? accounts[0]?.id ?? ''
  );
  const [when, setWhen] = useState(() => {
    if (existing) return new Date(existing.occurs_at);
    const d = new Date();
    if (params.date) {
      // Opened from the calendar: that day, at the current time of day.
      const [y, m, day] = params.date.split('-').map(Number);
      d.setFullYear(y, m - 1, day);
    }
    return d;
  });
  // A new entry left on "now" is stamped with the moment it is saved.
  const [whenTouched, setWhenTouched] = useState(Boolean(existing || params.date));
  const [remark, setRemark] = useState(existing?.memo ?? '');
  const [picking, setPicking] = useState<'date' | 'time' | null>(null);
  const [newCategory, setNewCategory] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [warning, setWarning] = useState('');

  const typeColor = type === 'income' ? C.income : C.expense;
  const options = categories.filter((c) => c.type === type);
  const category = options.find((c) => c.id === categoryId);
  const upcoming = whenTouched && when.getTime() > now;
  const today = dayKey(when) === dayKey(new Date(now));

  const value = parseAmount(amount);
  const canSave = value > 0 && accountId !== '' && profile != null && !busy;

  // Transactions are only recorded while connected, so every phone sees them straight away.
  const whenOnline = async (action: () => void) => {
    setBusy(true);
    setWarning('');
    const online = await isOnline();
    setBusy(false);
    if (online) action();
    else setWarning(OFFLINE_MESSAGE);
  };

  const save = () => {
    if (!canSave) return;
    void whenOnline(commit);
  };

  const commit = () => {
    if (!profile) return;
    const occurs = whenTouched ? when : new Date();
    put('transactions', {
      id: existing?.id ?? uuid(),
      profile_id: profile.id,
      account_id: accountId,
      type,
      amount: value,
      category_id: category?.id ?? null,
      memo: remark.trim(),
      occurs_at: occurs.toISOString(),
      // Rescheduling to the future clears an earlier "Done".
      done_at: occurs.getTime() > new Date().getTime() ? null : (existing?.done_at ?? null),
      created_at: existing?.created_at ?? new Date().toISOString(),
    });
    goBack();
  };

  const choose = (id: string) => {
    setCategoryId(id);
    setStep('details');
  };

  const addCategory = () => {
    const name = (newCategory ?? '').trim();
    setNewCategory(null);
    if (!name || !profile) return;
    const id = uuid();
    put('categories', {
      id,
      profile_id: profile.id,
      name,
      type,
      color: PALETTE[categories.length % PALETTE.length],
      created_at: new Date().toISOString(),
    });
    choose(id);
  };

  const typeToggle = (
    <View style={styles.types}>
      {(['expense', 'income'] as const).map((t) => (
        <Pressable
          key={t}
          onPress={() => setType(t)}
          style={[styles.type, type === t && { backgroundColor: t === 'income' ? C.income : C.expense }]}>
          <Text style={[styles.typeText, type === t && { color: C.white }]}>
            {t === 'income' ? 'Income' : 'Expense'}
          </Text>
        </Pressable>
      ))}
    </View>
  );

  if (step === 'category') {
    return (
      <Screen>
        <Header
          title="Choose category"
          left={
            <IconButton
              name="close"
              label="Cancel"
              // While editing, closing the list returns to the entry instead of discarding it.
              onPress={existing ? () => setStep('details') : goBack}
            />
          }
        />
        <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
          {typeToggle}
          {newCategory != null && (
            <View style={styles.timeRow}>
              <TextInput
                style={[styles.input, styles.flex]}
                value={newCategory}
                onChangeText={setNewCategory}
                placeholder="New category name"
                placeholderTextColor={C.faint}
                autoFocus
                onSubmitEditing={addCategory}
              />
              <Pressable style={[styles.now, styles.nowOn]} onPress={addCategory}>
                <Text style={[styles.nowText, { color: C.white }]}>Add</Text>
              </Pressable>
            </View>
          )}
          <View style={styles.grid}>
            {options.map((c) => (
              <Pressable key={c.id} style={styles.cell} onPress={() => choose(c.id)}>
                <View style={[styles.round, { backgroundColor: c.color }, c.id === categoryId && styles.roundOn]}>
                  <Text style={styles.initial}>{c.name.slice(0, 2)}</Text>
                </View>
                <Text style={styles.cellName} numberOfLines={2}>
                  {c.name}
                </Text>
              </Pressable>
            ))}
            <Pressable style={styles.cell} onPress={() => setNewCategory('')}>
              <View style={[styles.round, styles.roundNew]}>
                <Icon name="plus" color={C.muted} />
              </View>
              <Text style={styles.cellName}>New</Text>
            </Pressable>
          </View>
        </ScrollView>
      </Screen>
    );
  }

  return (
    <Screen>
      <Header
        title={type === 'income' ? 'Income' : 'Expense'}
        left={<IconButton name="close" label="Cancel" onPress={goBack} />}
        right={<IconButton name="check" label="Save" onPress={save} color={canSave ? C.text : C.faint} />}
      />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
          <Pressable style={styles.picked} onPress={() => setStep('category')}>
            <View style={[styles.dot, { backgroundColor: category?.color ?? C.faint }]} />
            <Text style={styles.pickedName} numberOfLines={1}>
              {category?.name ?? 'No category'}
            </Text>
            <Text style={styles.change}>Change</Text>
          </Pressable>

          <View style={styles.amountRow}>
            <Text style={[styles.symbol, { color: typeColor }]}>{currencySymbol(currency)}</Text>
            <TextInput
              style={[styles.amount, { color: typeColor }]}
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              placeholder="0.00"
              placeholderTextColor={C.faint}
              autoFocus={!existing}
              selectTextOnFocus
            />
          </View>

          {accounts.length > 1 && (
            <>
              <Text style={styles.label}>Account</Text>
              <View style={styles.wrap}>
                {accounts.map((a) => (
                  <Chip
                    key={a.id}
                    label={a.name}
                    color={a.color}
                    selected={a.id === accountId}
                    onPress={() => setAccountId(a.id)}
                  />
                ))}
              </View>
            </>
          )}

          <Text style={styles.label}>Date</Text>
          <Pressable style={[styles.input, styles.when]} onPress={() => setPicking('date')}>
            <Icon name="calendar" size={20} color={C.muted} />
            <Text style={styles.whenText}>{today ? 'Today' : dateLabel(when)}</Text>
          </Pressable>

          <Text style={styles.label}>Time</Text>
          <View style={styles.timeRow}>
            <Pressable style={[styles.input, styles.when, styles.flex]} onPress={() => setPicking('time')}>
              <Icon name="clock" size={20} color={C.muted} />
              <Text style={styles.whenText}>{whenTouched ? timeLabel(when) : 'Now'}</Text>
            </Pressable>
            <Pressable
              style={[styles.now, !whenTouched && styles.nowOn]}
              onPress={() => {
                setWhen(new Date());
                setWhenTouched(false);
              }}>
              <Text style={[styles.nowText, !whenTouched && { color: C.white }]}>Now</Text>
            </Pressable>
          </View>
          {upcoming && (
            <Text style={styles.note}>
              This is in the future. It will be counted automatically at that time, or earlier if you tap Done on
              it.
            </Text>
          )}

          <Text style={styles.label}>Remark</Text>
          <TextInput
            style={styles.input}
            value={remark}
            onChangeText={setRemark}
            placeholder="Optional"
            placeholderTextColor={C.faint}
          />

          {warning !== '' && <Text style={styles.warning}>{warning}</Text>}
          <Button title={busy ? 'Checking connection…' : 'Save'} color={typeColor} onPress={save} disabled={!canSave} />
          {existing && upcoming && (
            <Button
              title="Done — count it now"
              outline
              disabled={busy}
              onPress={() =>
                whenOnline(() => {
                  const stamp = new Date().toISOString();
                  put('transactions', { ...existing, occurs_at: stamp, done_at: stamp });
                  goBack();
                })
              }
            />
          )}
          {existing && (
            <ConfirmButton
              title="Delete"
              onConfirm={() =>
                whenOnline(() => {
                  remove('transactions', existing.id);
                  goBack();
                })
              }
            />
          )}
        </ScrollView>
      </KeyboardAvoidingView>
      {picking === 'date' && (
        <DateModal
          value={when}
          onClose={() => setPicking(null)}
          onChange={(d) => {
            setWhen(d);
            setWhenTouched(true);
          }}
        />
      )}
      {picking === 'time' && (
        <TimeModal
          value={when}
          onClose={() => setPicking(null)}
          onChange={(d) => {
            setWhen(d);
            setWhenTouched(true);
          }}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  form: { padding: 16, gap: 10, paddingBottom: 40 },
  types: { flexDirection: 'row', backgroundColor: C.band, borderRadius: 10, overflow: 'hidden' },
  type: { flex: 1, height: 44, alignItems: 'center', justifyContent: 'center' },
  typeText: { fontSize: 17, fontWeight: '600', color: C.muted },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingTop: 10 },
  cell: { width: '25%', alignItems: 'center', gap: 6, paddingVertical: 10, paddingHorizontal: 2 },
  round: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  roundOn: { borderWidth: 3, borderColor: C.text },
  roundNew: { backgroundColor: C.bg, borderWidth: 1.5, borderColor: C.faint, borderStyle: 'dashed' },
  initial: { color: C.white, fontSize: 22, fontWeight: '700' },
  cellName: { fontSize: 14, color: C.text, textAlign: 'center' },
  picked: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: C.band,
    borderRadius: 10,
    paddingHorizontal: 12,
    minHeight: 46,
  },
  dot: { width: 16, height: 16, borderRadius: 8 },
  pickedName: { flex: 1, fontSize: 17, color: C.text, fontWeight: '600' },
  change: { fontSize: 14, color: C.accent, fontWeight: '600' },
  amountRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4 },
  symbol: { fontSize: 32, fontWeight: '700' },
  amount: { flex: 1, fontSize: 40, fontWeight: '700', paddingVertical: 4, minWidth: 0 },
  label: { fontSize: 13, color: C.muted, marginTop: 6 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  input: {
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 10,
    paddingHorizontal: 12,
    minHeight: 46,
    fontSize: 17,
    color: C.text,
  },
  when: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  whenText: { fontSize: 17, color: C.text },
  timeRow: { flexDirection: 'row', gap: 10 },
  now: {
    minHeight: 46,
    paddingHorizontal: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nowOn: { backgroundColor: C.accent },
  nowText: { fontSize: 16, fontWeight: '700', color: C.accent },
  warning: { fontSize: 14, color: C.white, backgroundColor: C.expense, padding: 10, borderRadius: 8, fontWeight: '600' },
  note: { fontSize: 13, color: '#9A6B00', backgroundColor: C.pending, padding: 10, borderRadius: 8 },
});

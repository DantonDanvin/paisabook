import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { DateTimeModal } from '@/components/date-time-modal';
import { Icon } from '@/components/icon';
import { Button, Chip, ConfirmButton, Header, IconButton, Screen, goBack } from '@/components/ui';
import { currencySymbol, dateTimeLabel, parseAmount } from '@/lib/format';
import { put, rememberPayee, remove, useNow, useProfileData, uuid } from '@/lib/store';
import { C, PALETTE } from '@/lib/theme';
import type { TxnType } from '@/lib/types';

// Add or edit one income or expense. Opens with the amount focused so a typical entry is:
// type the amount, tap a category, tap save.
export default function TxnForm() {
  const params = useLocalSearchParams<{ id?: string; type?: TxnType; accountId?: string; date?: string }>();
  const { profile, accounts, categories, payees, txns, currency } = useProfileData();
  const existing = txns.find((t) => t.id === params.id);
  const now = useNow();

  const [type, setType] = useState<TxnType>(existing?.type ?? (params.type === 'income' ? 'income' : 'expense'));
  const [amount, setAmount] = useState(existing ? String(existing.amount) : '');
  const [payee, setPayee] = useState(existing?.payee ?? '');
  const [categoryId, setCategoryId] = useState<string | null>(existing?.category_id ?? null);
  const [accountId, setAccountId] = useState(
    existing?.account_id ?? params.accountId ?? txns[0]?.account_id ?? accounts[0]?.id ?? ''
  );
  const [when, setWhen] = useState(() => {
    if (existing) return new Date(existing.occurs_at);
    const now = new Date();
    if (params.date) {
      // Opened from the calendar: that day, at the current time of day.
      const [y, m, d] = params.date.split('-').map(Number);
      now.setFullYear(y, m - 1, d);
    }
    return now;
  });
  // A new entry left on "now" is stamped with the moment it is saved.
  const [whenTouched, setWhenTouched] = useState(Boolean(existing || params.date));
  const [checkNum, setCheckNum] = useState(existing?.check_num ?? '');
  const [memo, setMemo] = useState(existing?.memo ?? '');
  const [picking, setPicking] = useState(false);
  const [newCategory, setNewCategory] = useState<string | null>(null);

  const typeColor = type === 'income' ? C.income : C.expense;
  const options = categories.filter((c) => c.type === type);
  const upcoming = whenTouched && when.getTime() > now;
  const query = payee.trim().toLowerCase();
  const suggestions = payees
    .filter((p) => p.name.toLowerCase() !== query && p.name.toLowerCase().includes(query))
    .slice(0, 6);

  const value = parseAmount(amount);
  const canSave = value > 0 && accountId !== '' && profile != null;

  const save = () => {
    if (!canSave) return;
    const occurs = whenTouched ? when : new Date();
    put('transactions', {
      id: existing?.id ?? uuid(),
      profile_id: profile.id,
      account_id: accountId,
      type,
      amount: value,
      payee: payee.trim(),
      category_id: options.some((c) => c.id === categoryId) ? categoryId : null,
      check_num: checkNum.trim(),
      memo: memo.trim(),
      occurs_at: occurs.toISOString(),
      // Rescheduling to the future clears an earlier "Done".
      done_at: occurs.getTime() > Date.now() ? null : (existing?.done_at ?? null),
      created_at: existing?.created_at ?? new Date().toISOString(),
    });
    rememberPayee(profile.id, payee);
    goBack();
  };

  const addCategory = () => {
    const name = (newCategory ?? '').trim();
    if (!name || !profile) return setNewCategory(null);
    const id = uuid();
    put('categories', {
      id,
      profile_id: profile.id,
      name,
      type,
      color: PALETTE[categories.length % PALETTE.length],
      created_at: new Date().toISOString(),
    });
    setCategoryId(id);
    setNewCategory(null);
  };

  return (
    <Screen>
      <Header
        title=""
        left={<IconButton name="close" label="Cancel" onPress={goBack} />}
        right={<IconButton name="check" label="Save" onPress={save} color={canSave ? C.text : C.faint} />}
      />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
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

          <Text style={styles.label}>Category</Text>
          <View style={styles.wrap}>
            {options.map((c) => (
              <Chip
                key={c.id}
                label={c.name}
                color={c.color}
                selected={c.id === categoryId}
                onPress={() => setCategoryId(c.id === categoryId ? null : c.id)}
              />
            ))}
            <Chip label="+ New" selected={false} onPress={() => setNewCategory('')} />
          </View>
          {newCategory != null && (
            <TextInput
              style={styles.input}
              value={newCategory}
              onChangeText={setNewCategory}
              placeholder="New category name, then press enter"
              placeholderTextColor={C.faint}
              autoFocus
              onSubmitEditing={addCategory}
              onBlur={addCategory}
            />
          )}

          <Text style={styles.label}>{type === 'income' ? 'Received from' : 'Paid to'}</Text>
          <TextInput
            style={styles.input}
            value={payee}
            onChangeText={setPayee}
            placeholder="Payee"
            placeholderTextColor={C.faint}
          />
          {suggestions.length > 0 && (
            <View style={styles.wrap}>
              {suggestions.map((p) => (
                <Chip key={p.id} label={p.name} selected={false} onPress={() => setPayee(p.name)} />
              ))}
            </View>
          )}

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

          <Text style={styles.label}>Date and time</Text>
          <Pressable style={[styles.input, styles.when]} onPress={() => setPicking(true)}>
            <Icon name="clock" size={20} color={C.muted} />
            <Text style={styles.whenText}>{whenTouched ? dateTimeLabel(when) : 'Now'}</Text>
          </Pressable>
          {upcoming && (
            <Text style={styles.note}>
              This is in the future. It will be counted automatically at that time, or earlier if you tap Done on
              it.
            </Text>
          )}

          <Text style={styles.label}>Check number</Text>
          <TextInput
            style={styles.input}
            value={checkNum}
            onChangeText={setCheckNum}
            placeholder="Optional"
            placeholderTextColor={C.faint}
          />

          <Text style={styles.label}>Memo</Text>
          <TextInput
            style={styles.input}
            value={memo}
            onChangeText={setMemo}
            placeholder="Optional"
            placeholderTextColor={C.faint}
          />

          <Button title="Save" color={typeColor} onPress={save} disabled={!canSave} />
          {existing && upcoming && (
            <Button
              title="Done — count it now"
              outline
              onPress={() => {
                const now = new Date().toISOString();
                put('transactions', { ...existing, occurs_at: now, done_at: now });
                goBack();
              }}
            />
          )}
          {existing && (
            <ConfirmButton
              title="Delete"
              onConfirm={() => {
                remove('transactions', existing.id);
                goBack();
              }}
            />
          )}
        </ScrollView>
      </KeyboardAvoidingView>
      {picking && (
        <DateTimeModal
          value={when}
          onClose={() => setPicking(false)}
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
  note: { fontSize: 13, color: '#9A6B00', backgroundColor: C.pending, padding: 10, borderRadius: 8 },
});

import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Donut } from '@/components/donut';
import { Band, Empty, Header, IconButton, Screen } from '@/components/ui';
import { money, monthLabel, sum } from '@/lib/format';
import { isDone, useNow, useProfileData } from '@/lib/store';
import { C } from '@/lib/theme';
import type { TxnType } from '@/lib/types';

export default function Chart() {
  const { txns, categories, accounts, currency } = useProfileData();
  const now = useNow();
  const [view, setView] = useState(() => {
    const d = new Date();
    return { y: d.getFullYear(), m: d.getMonth() };
  });
  const [type, setType] = useState<TxnType>('expense');

  const shift = (by: number) => {
    const d = new Date(view.y, view.m + by, 1);
    setView({ y: d.getFullYear(), m: d.getMonth() });
  };

  const from = new Date(view.y, view.m, 1).getTime();
  const to = new Date(view.y, view.m + 1, 1).getTime();
  const inMonth = txns.filter((t) => {
    const at = new Date(t.occurs_at).getTime();
    return at >= from && at < to;
  });
  // Only transactions that have already happened are charted.
  const counted = inMonth.filter((t) => isDone(t, now));
  const waiting = inMonth.filter((t) => !isDone(t, now));
  const total = (t: TxnType, list = counted) => sum(list.filter((x) => x.type === t).map((x) => x.amount));

  const shown = counted.filter((t) => t.type === type);
  const shownTotal = total(type);
  const slices = [...categories.filter((c) => c.type === type), null]
    .map((c) => ({
      id: c?.id ?? 'none',
      name: c?.name ?? 'No category',
      color: c?.color ?? C.faint,
      value: sum(
        shown
          .filter((t) => (c ? t.category_id === c.id : !categories.some((k) => k.id === t.category_id && k.type === type)))
          .map((t) => t.amount)
      ),
    }))
    .filter((s) => s.value > 0)
    .sort((a, b) => b.value - a.value);

  const perAccount = accounts.map((a) => {
    const mine = counted.filter((t) => t.account_id === a.id);
    return { account: a, income: total('income', mine), expense: total('expense', mine) };
  });
  const biggest = Math.max(1, ...perAccount.map((p) => Math.max(p.income, p.expense)));
  const waitingTotal = sum(waiting.map((t) => (t.type === 'income' ? t.amount : -t.amount)));

  return (
    <Screen>
      <Header
        title={monthLabel(view.y, view.m)}
        left={<IconButton name="back" label="Previous month" onPress={() => shift(-1)} />}
        right={<IconButton name="next" label="Next month" onPress={() => shift(1)} />}
      />
      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.toggle}>
          {(['expense', 'income'] as const).map((t) => {
            const on = type === t;
            const color = t === 'income' ? C.income : C.expense;
            return (
              <Pressable key={t} style={[styles.side, on && { borderBottomColor: color }]} onPress={() => setType(t)}>
                <Text style={[styles.sideAmount, on && { color }]}>{money(total(t), currency)}</Text>
                <Text style={[styles.sideLabel, on && { color }]}>{t === 'income' ? 'Income' : 'Expense'}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.donut}>
          <Donut segments={slices}>
            <Text style={styles.net}>Net</Text>
            <Text style={styles.netValue}>{money(sum([total('income'), -total('expense')]), currency)}</Text>
          </Donut>
        </View>

        {slices.length === 0 && <Empty text={`No ${type} this month.`} />}
        {slices.map((s) => (
          <View key={s.id} style={styles.slice}>
            <View style={[styles.dot, { backgroundColor: s.color }]} />
            <View style={styles.flex}>
              <Text style={styles.sliceName}>{s.name}</Text>
              <Text style={styles.slicePct}>{((s.value / shownTotal) * 100).toFixed(1)}%</Text>
            </View>
            <Text style={[styles.sliceAmount, { color: type === 'income' ? C.income : C.expense }]}>
              {money(s.value, currency)}
            </Text>
          </View>
        ))}

        <Band left="By account" right="Income / Expense" />
        {perAccount.map(({ account, income, expense }) => (
          <View key={account.id} style={styles.account}>
            <Text style={styles.sliceName}>{account.name}</Text>
            <Bar value={income} max={biggest} color={C.income} label={money(income, currency)} />
            <Bar value={expense} max={biggest} color={C.expense} label={money(expense, currency)} />
          </View>
        ))}

        {waiting.length > 0 && (
          <Text style={styles.waiting}>
            {waiting.length} upcoming transaction{waiting.length === 1 ? '' : 's'} this month (
            {money(waitingTotal, currency)}) not counted yet.
          </Text>
        )}
      </ScrollView>
    </Screen>
  );
}

function Bar({ value, max, color, label }: { value: number; max: number; color: string; label: string }) {
  return (
    <View style={styles.barRow}>
      <View style={styles.track}>
        <View style={[styles.bar, { backgroundColor: color, width: `${(value / max) * 100}%` }]} />
      </View>
      <Text style={[styles.barLabel, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  body: { paddingBottom: 32 },
  toggle: { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.line },
  side: { flex: 1, alignItems: 'center', paddingVertical: 12, borderBottomWidth: 3, borderBottomColor: 'transparent' },
  sideAmount: { fontSize: 21, fontWeight: '700', color: C.text },
  sideLabel: { fontSize: 15, color: C.muted },
  donut: { alignItems: 'center', paddingVertical: 20 },
  net: { color: C.muted, fontSize: 14 },
  netValue: { color: C.text, fontSize: 18, fontWeight: '700' },
  slice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.line,
  },
  dot: { width: 14, height: 14, borderRadius: 7 },
  sliceName: { fontSize: 17, color: C.text },
  slicePct: { fontSize: 13, color: C.muted },
  sliceAmount: { fontSize: 17, fontWeight: '600' },
  account: { paddingHorizontal: 20, paddingVertical: 12, gap: 6 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  track: { flex: 1, height: 12, borderRadius: 6, backgroundColor: C.band, overflow: 'hidden' },
  bar: { height: 12, borderRadius: 6 },
  barLabel: { width: 120, textAlign: 'right', fontSize: 14, fontWeight: '600' },
  waiting: { margin: 20, padding: 10, borderRadius: 8, backgroundColor: C.pending, color: '#9A6B00', fontSize: 13 },
});

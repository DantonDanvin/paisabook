import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/icon';
import { dateLabel, money, timeLabel } from '@/lib/format';
import { isOnline } from '@/lib/online';
import { isDone, markDone } from '@/lib/store';
import { C } from '@/lib/theme';
import type { Category, Txn } from '@/lib/types';

// One transaction in a list. Upcoming ones are highlighted and get a one-tap "Done" button.
export function TxnRow({
  txn,
  category,
  currency,
  now,
  running,
  accountName,
  onPress,
}: {
  txn: Txn;
  category?: Category;
  currency: string;
  now: number;
  running?: number;
  accountName?: string;
  onPress: () => void;
}) {
  const income = txn.type === 'income';
  const [offline, setOffline] = useState(false);
  const done = async () => {
    const online = await isOnline();
    setOffline(!online);
    if (online) markDone(txn);
  };
  const upcoming = !isDone(txn, now);
  const when = new Date(txn.occurs_at);
  const details = [`${dateLabel(when)}, ${timeLabel(when)}`, accountName].filter(Boolean);
  // "Business (Sujal)": the category, with the remark in brackets when there is one.
  const name = category?.name ?? (income ? 'Income' : 'Expense');

  return (
    <Pressable onPress={onPress} style={[styles.row, upcoming && styles.upcoming]}>
      <View style={[styles.badge, { backgroundColor: category?.color ?? (income ? C.income : C.expense) }]}>
        <Icon name={income ? 'income' : 'expense'} size={20} color={C.white} />
      </View>
      <View style={styles.middle}>
        <Text style={styles.title} numberOfLines={1}>
          {txn.memo ? `${name} (${txn.memo})` : name}
        </Text>
        <Text style={styles.sub} numberOfLines={1}>
          {details.join(' · ')}
        </Text>
        {upcoming && <Text style={styles.wait}>Upcoming · counts at this time</Text>}
        {offline && <Text style={styles.offline}>No internet. Connect and tap Done again.</Text>}
      </View>
      <View style={styles.right}>
        <Text style={[styles.amount, { color: income ? C.income : C.expense }]}>
          {money(income ? txn.amount : -txn.amount, currency)}
        </Text>
        {running != null && <Text style={styles.sub}>{money(running, currency)}</Text>}
        {upcoming && (
          <Pressable style={styles.done} onPress={() => void done()} hitSlop={6}>
            <Text style={styles.doneText}>Done</Text>
          </Pressable>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.line,
  },
  upcoming: { backgroundColor: C.pending },
  badge: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  middle: { flex: 1, gap: 2 },
  right: { alignItems: 'flex-end', gap: 2 },
  title: { fontSize: 17, color: C.text },
  sub: { fontSize: 13, color: C.muted },
  wait: { fontSize: 12, color: '#9A6B00' },
  offline: { fontSize: 12, color: C.expense, fontWeight: '600' },
  amount: { fontSize: 17, fontWeight: '600' },
  done: {
    marginTop: 4,
    backgroundColor: C.accent,
    borderRadius: 14,
    paddingHorizontal: 14,
    minHeight: 28,
    justifyContent: 'center',
  },
  doneText: { color: C.white, fontWeight: '700', fontSize: 14 },
});

import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text } from 'react-native';

import { type DayMarks, MonthGrid } from '@/components/month-grid';
import { TxnRow } from '@/components/txn-row';
import { AddButtons, Band, Empty, Header, IconButton, Screen } from '@/components/ui';
import { dateLabel, dayKey, money, monthLabel, sum } from '@/lib/format';
import { signed, useNow, useProfileData } from '@/lib/store';
import { C } from '@/lib/theme';

export default function Calendar() {
  const { txns, categories, accounts, currency } = useProfileData();
  const now = useNow();
  const [selected, setSelected] = useState(() => new Date());
  const [view, setView] = useState(() => ({ y: selected.getFullYear(), m: selected.getMonth() }));

  const shift = (by: number) => {
    const d = new Date(view.y, view.m + by, 1);
    setView({ y: d.getFullYear(), m: d.getMonth() });
  };
  const today = () => {
    const d = new Date();
    setSelected(d);
    setView({ y: d.getFullYear(), m: d.getMonth() });
  };

  const marks: DayMarks = {};
  for (const t of txns) {
    const key = dayKey(new Date(t.occurs_at));
    marks[key] = { ...marks[key], [t.type]: true };
  }
  const key = dayKey(selected);
  const rows = txns.filter((t) => dayKey(new Date(t.occurs_at)) === key);

  return (
    <Screen tabs>
      <Header
        title={monthLabel(view.y, view.m)}
        left={
          <>
            <Pressable onPress={today} hitSlop={8} style={styles.today}>
              <Text style={styles.todayText}>Today</Text>
            </Pressable>
            <IconButton name="back" label="Previous month" onPress={() => shift(-1)} />
          </>
        }
        right={<IconButton name="next" label="Next month" onPress={() => shift(1)} />}
      />
      <MonthGrid year={view.y} month={view.m} selected={key} marks={marks} onSelect={setSelected} />
      <Band left={dateLabel(selected)} right={money(sum(rows.map(signed)), currency)} />
      <FlatList
        data={rows}
        keyExtractor={(t) => t.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Empty text="No transactions on this date." />}
        renderItem={({ item: t }) => (
          <TxnRow
            txn={t}
            category={categories.find((c) => c.id === t.category_id)}
            currency={currency}
            now={now}
            accountName={accounts.find((a) => a.id === t.account_id)?.name}
            onPress={() => router.push({ pathname: '/txn', params: { id: t.id } })}
          />
        )}
      />
      <AddButtons date={key} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { paddingBottom: 90 },
  today: { paddingHorizontal: 8, height: 40, justifyContent: 'center' },
  todayText: { color: C.accent, fontSize: 16, fontWeight: '600' },
});

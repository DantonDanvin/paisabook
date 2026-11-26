import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { DragHandle } from '@/components/drag-handle';
import { Icon } from '@/components/icon';
import { AddButtons, Band, Empty, Header, IconButton, Screen } from '@/components/ui';
import { money, sum } from '@/lib/format';
import { isDone, reorderAccounts, signed, useNow, useProfileData } from '@/lib/store';
import { C } from '@/lib/theme';

export default function Accounts() {
  const { profile, accounts, txns, currency } = useProfileData();
  const now = useNow();
  // The account being dragged: where it started and how far the finger has moved.
  const [drag, setDrag] = useState<{ from: number; dy: number } | null>(null);

  const totals = new Map<string, { cleared: number[]; upcoming: number[] }>();
  for (const a of accounts) totals.set(a.id, { cleared: [a.start_balance], upcoming: [] });
  for (const t of txns) {
    const entry = totals.get(t.account_id);
    if (entry) (isDone(t, now) ? entry.cleared : entry.upcoming).push(signed(t));
  }
  const cleared = (id: string) => sum(totals.get(id)?.cleared ?? []);
  const upcoming = (id: string) => sum(totals.get(id)?.upcoming ?? []);
  const total = sum(accounts.map((a) => cleared(a.id)));

  const last = accounts.length - 1;
  // The position the dragged account would land in if released now.
  const landing = (from: number, dy: number) => Math.max(0, Math.min(last, from + Math.round(dy / ROW_HEIGHT)));
  const drop = (from: number, dy: number) => {
    const to = landing(from, dy);
    setDrag(null);
    if (to === from) return;
    const ids = accounts.map((a) => a.id);
    ids.splice(to, 0, ids.splice(from, 1)[0]);
    reorderAccounts(ids);
  };
  // How far a row is drawn from its normal place while a drag is in progress.
  const offset = (index: number) => {
    if (!drag) return 0;
    const to = landing(drag.from, drag.dy);
    if (index === drag.from) return Math.max(-drag.from, Math.min(last - drag.from, drag.dy / ROW_HEIGHT)) * ROW_HEIGHT;
    if (drag.from < to && index > drag.from && index <= to) return -ROW_HEIGHT;
    if (to < drag.from && index >= to && index < drag.from) return ROW_HEIGHT;
    return 0;
  };

  return (
    <Screen tabs>
      <Header
        big
        title="Accounts"
        right={
          <>
            <Pressable style={styles.profile} onPress={() => router.push('/profiles')}>
              <Icon name="user" size={16} color={C.accent} />
              <Text style={styles.profileText} numberOfLines={1}>
                {profile?.name}
              </Text>
            </Pressable>
            <IconButton name="search" label="Search" onPress={() => router.push('/search')} />
            <IconButton name="plus" label="New account" onPress={() => router.push('/account-edit')} />
          </>
        }
      />
      <Band left="Balance" right={money(total, currency)} />
      <ScrollView contentContainerStyle={styles.list} scrollEnabled={!drag}>
        {accounts.length === 0 && <Empty text="No accounts yet. Tap + at the top to add one." />}
        {accounts.map((a, index) => {
          const bal = cleared(a.id);
          const next = upcoming(a.id);
          const lifted = drag?.from === index;
          return (
            <View
              key={a.id}
              style={[styles.row, { transform: [{ translateY: offset(index) }] }, lifted && styles.lifted]}>
              <DragHandle
                onStart={() => setDrag({ from: index, dy: 0 })}
                onMove={(dy) => setDrag({ from: index, dy })}
                onEnd={(dy) => drop(index, dy)}
              />
              <Pressable
                style={styles.open}
                onPress={() => router.push({ pathname: '/account/[id]', params: { id: a.id } })}>
                <View style={[styles.badge, { backgroundColor: a.color }]}>
                  <Icon name="card" size={20} color={C.white} />
                </View>
                <Text style={styles.name} numberOfLines={2}>
                  {a.name}
                </Text>
                <View style={styles.right}>
                  <Text style={[styles.amount, bal < 0 && { color: C.expense }]}>{money(bal, currency)}</Text>
                  {next !== 0 && <Text style={styles.sub}>Upcoming {money(next, currency)}</Text>}
                </View>
              </Pressable>
            </View>
          );
        })}
      </ScrollView>
      <AddButtons />
    </Screen>
  );
}

const ROW_HEIGHT = 72;

const styles = StyleSheet.create({
  list: { paddingBottom: 90 },
  profile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 16,
    paddingHorizontal: 10,
    height: 32,
    maxWidth: 130,
    flexShrink: 1,
  },
  profileText: { color: C.text, fontSize: 14, flexShrink: 1 },
  // Fixed height: dragging works out positions by counting rows.
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    height: ROW_HEIGHT,
    backgroundColor: C.bg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.line,
  },
  lifted: { zIndex: 1, elevation: 6, backgroundColor: C.band },
  open: { flex: 1, alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', gap: 14, paddingRight: 20 },
  badge: { width: 42, height: 42, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  // Two lines of this size still fit inside the fixed row height.
  name: { flex: 1, fontSize: 19, lineHeight: 24, color: C.text },
  right: { alignItems: 'flex-end' },
  amount: { fontSize: 21, fontWeight: '700', color: C.text },
  sub: { fontSize: 13, color: C.muted },
});

import { router } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/icon';
import { AddButtons, Band, Empty, Header, IconButton, Screen } from '@/components/ui';
import { money, sum } from '@/lib/format';
import { isDone, signed, useNow, useProfileData } from '@/lib/store';
import { C } from '@/lib/theme';

export default function Accounts() {
  const { profile, accounts, txns, currency } = useProfileData();
  const now = useNow();

  const totals = new Map<string, { cleared: number[]; upcoming: number[] }>();
  for (const a of accounts) totals.set(a.id, { cleared: [a.start_balance], upcoming: [] });
  for (const t of txns) {
    const entry = totals.get(t.account_id);
    if (entry) (isDone(t, now) ? entry.cleared : entry.upcoming).push(signed(t));
  }
  const cleared = (id: string) => sum(totals.get(id)?.cleared ?? []);
  const upcoming = (id: string) => sum(totals.get(id)?.upcoming ?? []);
  const total = sum(accounts.map((a) => cleared(a.id)));

  return (
    <Screen>
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
      <FlatList
        data={accounts}
        keyExtractor={(a) => a.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Empty text="No accounts yet. Tap + at the top to add one." />}
        renderItem={({ item: a }) => {
          const bal = cleared(a.id);
          const next = upcoming(a.id);
          return (
            <Pressable
              style={styles.row}
              onPress={() => router.push({ pathname: '/account/[id]', params: { id: a.id } })}>
              <View style={[styles.badge, { backgroundColor: a.color }]}>
                <Icon name="card" size={20} color={C.white} />
              </View>
              <Text style={styles.name} numberOfLines={1}>
                {a.name}
              </Text>
              <View style={styles.right}>
                <Text style={[styles.amount, bal < 0 && { color: C.expense }]}>{money(bal, currency)}</Text>
                {next !== 0 && <Text style={styles.sub}>Upcoming {money(next, currency)}</Text>}
              </View>
            </Pressable>
          );
        }}
      />
      <AddButtons />
    </Screen>
  );
}

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
  },
  profileText: { color: C.text, fontSize: 14, flexShrink: 1 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 20,
    minHeight: 72,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.line,
  },
  badge: { width: 42, height: 42, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  name: { flex: 1, fontSize: 19, color: C.text },
  right: { alignItems: 'flex-end' },
  amount: { fontSize: 21, fontWeight: '700', color: C.text },
  sub: { fontSize: 13, color: C.muted },
});

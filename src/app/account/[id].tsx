import { router, useLocalSearchParams } from 'expo-router';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import { TxnRow } from '@/components/txn-row';
import { AddButtons, Empty, Header, IconButton, Screen } from '@/components/ui';
import { money, sum } from '@/lib/format';
import { isDone, signed, useNow, useProfileData } from '@/lib/store';
import { C } from '@/lib/theme';

export default function AccountDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { accounts, txns, categories, currency } = useProfileData();
  const now = useNow();
  const account = accounts.find((a) => a.id === id);

  if (!account) {
    return (
      <Screen>
        <Header back title="Account" />
        <Empty text="This account no longer exists." />
      </Screen>
    );
  }

  // `txns` is newest first; walk it oldest first to build the running balance.
  const rows = txns.filter((t) => t.account_id === id);
  const running = new Map<string, number>();
  let cents = Math.round(account.start_balance * 100);
  for (let i = rows.length - 1; i >= 0; i--) {
    cents += Math.round(signed(rows[i]) * 100);
    running.set(rows[i].id, cents / 100);
  }
  const cleared = sum([account.start_balance, ...rows.filter((t) => isDone(t, now)).map(signed)]);
  const upcoming = sum(rows.filter((t) => !isDone(t, now)).map(signed));

  return (
    <Screen>
      <Header
        back
        tint={account.color}
        title={account.name}
        right={
          <IconButton
            name="edit"
            color={C.white}
            label="Edit account"
            onPress={() => router.push({ pathname: '/account-edit', params: { id: account.id } })}
          />
        }
      />
      <View style={[styles.stats, { backgroundColor: account.color }]}>
        <Stat label="Cleared" value={money(cleared, currency)} />
        <Stat label="Upcoming" value={money(upcoming, currency)} />
        <Stat label="Balance" value={money(sum([cleared, upcoming]), currency)} />
      </View>
      <FlatList
        data={rows}
        keyExtractor={(t) => t.id}
        contentContainerStyle={styles.list}
        renderItem={({ item: t }) => (
          <TxnRow
            txn={t}
            category={categories.find((c) => c.id === t.category_id)}
            currency={currency}
            now={now}
            running={running.get(t.id)}
            onPress={() => router.push({ pathname: '/txn', params: { id: t.id } })}
          />
        )}
        ListFooterComponent={
          <View style={styles.start}>
            <Text style={styles.startText}>Start balance</Text>
            <Text style={styles.startText}>{money(account.start_balance, currency)}</Text>
          </View>
        }
      />
      <AddButtons accountId={account.id} />
    </Screen>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  stats: { flexDirection: 'row', paddingBottom: 16, paddingHorizontal: 8 },
  stat: { flex: 1, alignItems: 'center', gap: 6, paddingHorizontal: 4 },
  statLabel: { color: C.white, fontSize: 14, opacity: 0.9 },
  statValue: { color: C.white, fontSize: 18, fontWeight: '700' },
  list: { paddingBottom: 90 },
  start: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16 },
  startText: { fontSize: 16, color: C.muted },
});

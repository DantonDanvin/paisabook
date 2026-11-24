import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { ConfirmButton, Header, Row, Screen } from '@/components/ui';
import { buildCsv } from '@/lib/csv';
import { exportCsv } from '@/lib/export';
import { CURRENCIES, dayKey, timeLabel } from '@/lib/format';
import { signOut, sync, useProfileData, useStore } from '@/lib/store';
import { C } from '@/lib/theme';

export default function Settings() {
  const s = useStore();
  const data = useProfileData();
  const [exportNote, setExportNote] = useState('');
  const currency = CURRENCIES.find((c) => c.code === data.currency);

  const runExport = async () => {
    try {
      const name = `paisabook-${(data.profile?.name ?? 'data').replace(/[^a-z0-9]+/gi, '-')}-${dayKey(new Date())}.csv`;
      await exportCsv(name, buildCsv(data, Date.now()));
      setExportNote(`${data.txns.length} transactions exported.`);
    } catch (e) {
      setExportNote(`Export failed: ${(e as Error).message}`);
    }
  };

  const pending = s.outbox.length;
  const syncStatus = s.syncing
    ? 'Syncing…'
    : pending > 0
      ? `${pending} change${pending === 1 ? '' : 's'} waiting`
      : s.lastSync
        ? `Synced ${timeLabel(new Date(s.lastSync))}`
        : 'Not synced yet';

  return (
    <Screen>
      <Header big title="Settings" />
      <ScrollView contentContainerStyle={styles.body}>
        <Row
          icon="user"
          title={data.profile?.name ?? 'Profile'}
          value="Switch profile"
          onPress={() => router.push('/profiles')}
        />
        <View style={styles.gap} />
        <Row icon="user" iconColor="#2563EB" title="Payee" onPress={() => router.push('/payees')} />
        <Row icon="tag" iconColor="#7C3AED" title="Category" onPress={() => router.push('/categories')} />
        <Row icon="export" iconColor="#0891B2" title="Export Data" value="CSV" onPress={runExport} />
        {exportNote !== '' && <Text style={styles.note}>{exportNote}</Text>}
        <View style={styles.gap} />
        <Row
          icon="money"
          iconColor="#D97706"
          title="Currency"
          value={currency ? `${currency.symbol.trim()} - ${currency.name}` : data.currency}
          onPress={() => router.push('/currency')}
        />
        <View style={styles.gap} />
        <Row icon="sync" title="Sync now" value={syncStatus} chevron={false} onPress={() => void sync()} />
        {s.syncError != null && <Text style={styles.note}>{s.syncError}</Text>}
        <View style={styles.gap} />
        <Row icon="user" iconColor={C.muted} title="Signed in as" value={s.email ?? ''} />
        <View style={styles.signOut}>
          <ConfirmButton title="Sign out" onConfirm={() => void signOut()} />
          {pending > 0 && (
            <Text style={styles.warn}>
              {pending} change{pending === 1 ? ' has' : 's have'} not reached the server yet. Sync before signing out.
            </Text>
          )}
        </View>
        <Text style={styles.footer}>PaisaBook 1.0.0</Text>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { paddingBottom: 32 },
  gap: { height: 12, backgroundColor: C.band },
  note: { paddingHorizontal: 20, paddingVertical: 8, color: C.muted, fontSize: 13 },
  signOut: { padding: 20, gap: 8 },
  warn: { color: C.expense, fontSize: 13 },
  footer: { textAlign: 'center', color: C.faint, fontSize: 13 },
});

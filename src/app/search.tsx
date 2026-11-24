import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, StyleSheet, TextInput } from 'react-native';

import { TxnRow } from '@/components/txn-row';
import { Empty, Header, Screen } from '@/components/ui';
import { useNow, useProfileData } from '@/lib/store';
import { C } from '@/lib/theme';

export default function Search() {
  const { txns, categories, accounts, currency } = useProfileData();
  const now = useNow();
  const [text, setText] = useState('');
  const q = text.trim().toLowerCase();

  const results = !q
    ? []
    : txns
        .filter((t) => {
          const category = categories.find((c) => c.id === t.category_id)?.name ?? '';
          return [t.payee, t.memo, t.check_num, category, String(t.amount)].some((v) => v.toLowerCase().includes(q));
        })
        .slice(0, 200);

  return (
    <Screen>
      <Header back title="Search" />
      <TextInput
        style={styles.input}
        value={text}
        onChangeText={setText}
        autoFocus
        placeholder="Payee, memo, check number, amount…"
        placeholderTextColor={C.faint}
      />
      <FlatList
        data={results}
        keyExtractor={(t) => t.id}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={<Empty text={q ? 'Nothing found.' : 'Type to search all transactions.'} />}
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
    </Screen>
  );
}

const styles = StyleSheet.create({
  input: {
    marginHorizontal: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 10,
    paddingHorizontal: 12,
    minHeight: 46,
    fontSize: 17,
    color: C.text,
  },
});

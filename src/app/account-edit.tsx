import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';

import { Button, ColorPicker, ConfirmButton, Field, Header, IconButton, Screen, goBack } from '@/components/ui';
import { parseAmount } from '@/lib/format';
import { put, remove, useProfileData, uuid } from '@/lib/store';
import { C, PALETTE } from '@/lib/theme';

export default function AccountEdit() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { profile, accounts } = useProfileData();
  const existing = accounts.find((a) => a.id === id);

  const [name, setName] = useState(existing?.name ?? '');
  const [start, setStart] = useState(existing ? String(existing.start_balance) : '');
  const [color, setColor] = useState(existing?.color ?? PALETTE[accounts.length % PALETTE.length]);

  const canSave = name.trim() !== '' && profile != null;
  const save = () => {
    if (!canSave) return;
    put('accounts', {
      id: existing?.id ?? uuid(),
      profile_id: profile.id,
      name: name.trim(),
      start_balance: parseAmount(start),
      color,
      // New accounts go to the bottom of the list.
      sort_order: existing?.sort_order ?? accounts.length,
      created_at: existing?.created_at ?? new Date().toISOString(),
    });
    goBack();
  };

  return (
    <Screen>
      <Header
        back
        title={existing ? 'Edit account' : 'New account'}
        right={<IconButton name="check" label="Save" onPress={save} />}
      />
      <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
        <Field
          label="Account name"
          value={name}
          onChangeText={setName}
          autoFocus={!existing}
          placeholder="Bank, Cash, Wallet…"
          onSubmitEditing={save}
        />
        <Field
          label="Start balance"
          value={start}
          onChangeText={setStart}
          keyboardType="numbers-and-punctuation"
          placeholder="0.00"
          onSubmitEditing={save}
        />
        <Text style={styles.label}>Color</Text>
        <ColorPicker value={color} onChange={setColor} />
        <Button title="Save" onPress={save} disabled={!canSave} />
        {existing && (
          <ConfirmButton
            title="Delete account and its transactions"
            onConfirm={() => {
              remove('accounts', existing.id);
              router.replace('/');
            }}
          />
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { padding: 20, gap: 16 },
  label: { fontSize: 13, color: C.muted },
});

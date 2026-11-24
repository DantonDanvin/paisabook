import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button, ConfirmButton, Empty, Field, Header, IconButton, Screen } from '@/components/ui';
import { put, remove, useProfileData, uuid } from '@/lib/store';
import { C } from '@/lib/theme';

export default function Payees() {
  const { profile, payees } = useProfileData();
  // null = closed, '' = adding, otherwise the id being edited.
  const [editing, setEditing] = useState<string | null>(null);
  const [name, setName] = useState('');
  const current = payees.find((p) => p.id === editing);

  const open = (id: string, value: string) => {
    setEditing(id);
    setName(value);
  };
  const save = () => {
    const clean = name.trim();
    if (!clean || !profile) return;
    put('payees', {
      id: current?.id ?? uuid(),
      profile_id: profile.id,
      name: clean,
      created_at: current?.created_at ?? new Date().toISOString(),
    });
    setEditing(null);
  };

  return (
    <Screen>
      <Header back title="Payee" right={<IconButton name="plus" label="New payee" onPress={() => open('', '')} />} />
      <ScrollView keyboardShouldPersistTaps="handled">
        {editing != null && (
          <View style={styles.editor}>
            <Field
              label={current ? 'Rename payee' : 'New payee'}
              value={name}
              onChangeText={setName}
              autoFocus
              onSubmitEditing={save}
            />
            <Button title="Save" onPress={save} disabled={name.trim() === ''} />
            {current && (
              <ConfirmButton
                title="Delete"
                onConfirm={() => {
                  remove('payees', current.id);
                  setEditing(null);
                }}
              />
            )}
            <Button title="Cancel" outline color={C.muted} onPress={() => setEditing(null)} />
          </View>
        )}
        {payees.length === 0 && <Empty text="No payees yet. Names you type in a transaction are saved here." />}
        {payees.map((p) => (
          <Pressable key={p.id} style={styles.row} onPress={() => open(p.id, p.name)}>
            <Text style={styles.name}>{p.name}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  editor: { padding: 20, gap: 12, backgroundColor: C.band },
  row: {
    paddingHorizontal: 20,
    minHeight: 54,
    justifyContent: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.line,
  },
  name: { fontSize: 17, color: C.text },
});

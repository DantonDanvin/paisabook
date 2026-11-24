import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Band, Button, Chip, ColorPicker, ConfirmButton, Field, Header, IconButton, Screen } from '@/components/ui';
import { put, remove, useProfileData, uuid } from '@/lib/store';
import { C, PALETTE } from '@/lib/theme';
import type { TxnType } from '@/lib/types';

export default function Categories() {
  const { profile, categories } = useProfileData();
  // null = closed, '' = adding, otherwise the id being edited.
  const [editing, setEditing] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [type, setType] = useState<TxnType>('expense');
  const [color, setColor] = useState(PALETTE[0]);
  const current = categories.find((c) => c.id === editing);

  const open = (id: string, n: string, t: TxnType, c: string) => {
    setEditing(id);
    setName(n);
    setType(t);
    setColor(c);
  };
  const save = () => {
    const clean = name.trim();
    if (!clean || !profile) return;
    put('categories', {
      id: current?.id ?? uuid(),
      profile_id: profile.id,
      name: clean,
      type,
      color,
      created_at: current?.created_at ?? new Date().toISOString(),
    });
    setEditing(null);
  };

  return (
    <Screen>
      <Header
        back
        title="Category"
        right={
          <IconButton
            name="plus"
            label="New category"
            onPress={() => open('', '', 'expense', PALETTE[categories.length % PALETTE.length])}
          />
        }
      />
      <ScrollView keyboardShouldPersistTaps="handled">
        {editing != null && (
          <View style={styles.editor}>
            <Field
              label={current ? 'Edit category' : 'New category'}
              value={name}
              onChangeText={setName}
              autoFocus
              onSubmitEditing={save}
            />
            <View style={styles.types}>
              <Chip label="Expense" color={C.expense} selected={type === 'expense'} onPress={() => setType('expense')} />
              <Chip label="Income" color={C.income} selected={type === 'income'} onPress={() => setType('income')} />
            </View>
            <ColorPicker value={color} onChange={setColor} />
            <Button title="Save" onPress={save} disabled={name.trim() === ''} />
            {current && (
              <ConfirmButton
                title="Delete"
                onConfirm={() => {
                  remove('categories', current.id);
                  setEditing(null);
                }}
              />
            )}
            <Button title="Cancel" outline color={C.muted} onPress={() => setEditing(null)} />
          </View>
        )}
        {(['expense', 'income'] as const).map((t) => (
          <View key={t}>
            <Band left={t === 'expense' ? 'Expense categories' : 'Income categories'} />
            {categories
              .filter((c) => c.type === t)
              .map((c) => (
                <Pressable key={c.id} style={styles.row} onPress={() => open(c.id, c.name, c.type, c.color)}>
                  <View style={[styles.dot, { backgroundColor: c.color }]} />
                  <Text style={styles.name}>{c.name}</Text>
                </Pressable>
              ))}
          </View>
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  editor: { padding: 20, gap: 12, backgroundColor: C.band },
  types: { flexDirection: 'row', gap: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 20,
    minHeight: 54,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.line,
  },
  dot: { width: 16, height: 16, borderRadius: 8 },
  name: { fontSize: 17, color: C.text },
});

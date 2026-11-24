import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/icon';
import { Button, ConfirmButton, Field, Header, IconButton, Screen, goBack } from '@/components/ui';
import { createProfile, put, remove, setActiveProfile, useStore } from '@/lib/store';
import { C } from '@/lib/theme';

// Each profile has its own accounts, transactions, categories and payees.
export default function Profiles() {
  const s = useStore();
  const profiles = s.data.profiles;
  // null = closed, '' = adding a new profile, otherwise the id being renamed.
  const [editing, setEditing] = useState<string | null>(null);
  const [name, setName] = useState('');
  const current = profiles.find((p) => p.id === editing);

  const open = (id: string, value: string) => {
    setEditing(id);
    setName(value);
  };
  const save = () => {
    const clean = name.trim();
    if (!clean) return;
    if (current) put('profiles', { ...current, name: clean });
    else createProfile(clean, profiles.find((p) => p.id === s.activeProfileId)?.currency);
    setEditing(null);
  };

  return (
    <Screen>
      <Header
        back
        title="Profiles"
        right={<IconButton name="plus" label="New profile" onPress={() => open('', '')} />}
      />
      <ScrollView keyboardShouldPersistTaps="handled">
        {editing != null && (
          <View style={styles.editor}>
            <Field
              label={current ? 'Rename profile' : 'New profile name'}
              value={name}
              onChangeText={setName}
              autoFocus
              placeholder="Personal, Business, Home…"
              onSubmitEditing={save}
            />
            <Button title="Save" onPress={save} disabled={name.trim() === ''} />
            {current && profiles.length > 1 && (
              <ConfirmButton
                title="Delete profile and all its data"
                onConfirm={() => {
                  if (current.id === s.activeProfileId) {
                    setActiveProfile(profiles.find((p) => p.id !== current.id)!.id);
                  }
                  remove('profiles', current.id);
                  setEditing(null);
                }}
              />
            )}
            <Button title="Cancel" outline color={C.muted} onPress={() => setEditing(null)} />
          </View>
        )}
        {profiles.map((p) => {
          const active = p.id === s.activeProfileId;
          return (
            <Pressable
              key={p.id}
              style={styles.row}
              onPress={() => {
                setActiveProfile(p.id);
                goBack();
              }}>
              <View style={[styles.avatar, active && { backgroundColor: C.accent }]}>
                <Text style={[styles.initial, active && { color: C.white }]}>{p.name.slice(0, 1).toUpperCase()}</Text>
              </View>
              <Text style={styles.name} numberOfLines={1}>
                {p.name}
              </Text>
              {active && <Icon name="check" color={C.accent} />}
              <IconButton name="edit" color={C.muted} label={`Rename ${p.name}`} onPress={() => open(p.id, p.name)} />
            </Pressable>
          );
        })}
        <Text style={styles.hint}>Tap a profile to switch to it.</Text>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  editor: { padding: 20, gap: 12, backgroundColor: C.band },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 20,
    minHeight: 64,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.line,
  },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.band, alignItems: 'center', justifyContent: 'center' },
  initial: { fontSize: 18, fontWeight: '700', color: C.text },
  name: { flex: 1, fontSize: 18, color: C.text },
  hint: { textAlign: 'center', color: C.muted, fontSize: 13, padding: 20 },
});

import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { IconButton, Button, Chip } from '@/components/ui';
import { MonthGrid } from '@/components/month-grid';
import { dateTimeLabel, dayKey, monthLabel } from '@/lib/format';
import { C } from '@/lib/theme';

const HOURS = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

// Date and time picker that looks the same on Android and on the web version.
export function DateTimeModal({
  value,
  onChange,
  onClose,
}: {
  value: Date;
  onChange: (d: Date) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(value);
  const [view, setView] = useState({ y: value.getFullYear(), m: value.getMonth() });

  const patch = (fn: (d: Date) => void) => {
    const d = new Date(draft);
    fn(d);
    setDraft(d);
  };
  const shift = (by: number) => {
    const d = new Date(view.y, view.m + by, 1);
    setView({ y: d.getFullYear(), m: d.getMonth() });
  };
  const pm = draft.getHours() >= 12;
  const hour12 = draft.getHours() % 12 === 0 ? 12 : draft.getHours() % 12;
  const setHour = (h12: number, isPm: boolean) => patch((d) => d.setHours((h12 % 12) + (isPm ? 12 : 0)));

  return (
    <Modal transparent animationType="none" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card} onPress={() => {}}>
          <ScrollView keyboardShouldPersistTaps="handled">
            <Text style={styles.summary}>{dateTimeLabel(draft)}</Text>

            <View style={styles.nav}>
              <IconButton name="back" label="Previous month" onPress={() => shift(-1)} />
              <Text style={styles.month}>{monthLabel(view.y, view.m)}</Text>
              <IconButton name="next" label="Next month" onPress={() => shift(1)} />
            </View>
            <MonthGrid
              compact
              year={view.y}
              month={view.m}
              selected={dayKey(draft)}
              onSelect={(day) => patch((d) => d.setFullYear(day.getFullYear(), day.getMonth(), day.getDate()))}
            />

            <Text style={styles.label}>Hour</Text>
            <View style={styles.wrap}>
              {HOURS.map((h) => (
                <Chip key={h} label={String(h)} selected={h === hour12} onPress={() => setHour(h, pm)} />
              ))}
            </View>
            <Text style={styles.label}>Minute</Text>
            <View style={styles.wrap}>
              {MINUTES.map((m) => (
                <Chip
                  key={m}
                  label={String(m).padStart(2, '0')}
                  selected={m === draft.getMinutes()}
                  onPress={() => patch((d) => d.setMinutes(m, 0, 0))}
                />
              ))}
            </View>
            <View style={[styles.wrap, styles.ampm]}>
              <Chip label="AM" selected={!pm} onPress={() => setHour(hour12, false)} />
              <Chip label="PM" selected={pm} onPress={() => setHour(hour12, true)} />
              <View style={styles.spacer} />
              <Chip
                label="Now"
                selected={false}
                onPress={() => {
                  const now = new Date();
                  setDraft(now);
                  setView({ y: now.getFullYear(), m: now.getMonth() });
                }}
              />
            </View>

            <Button
              title="Set date and time"
              onPress={() => {
                onChange(draft);
                onClose();
              }}
            />
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 16 },
  card: {
    backgroundColor: C.bg,
    borderRadius: 16,
    padding: 16,
    maxHeight: '92%',
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
  },
  summary: { fontSize: 18, fontWeight: '700', color: C.text, textAlign: 'center', paddingBottom: 4 },
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  month: { fontSize: 17, color: C.text, fontWeight: '600' },
  label: { fontSize: 13, color: C.muted, marginTop: 10, marginBottom: 6 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  ampm: { marginTop: 12, marginBottom: 16, alignItems: 'center' },
  spacer: { flex: 1 },
});

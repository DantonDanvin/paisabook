import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { MonthGrid } from '@/components/month-grid';
import { IconButton } from '@/components/ui';
import { dayKey, monthLabel } from '@/lib/format';
import { C } from '@/lib/theme';

// Calendar popup. Tapping a day picks it and closes the popup straight away.
export function DateModal({
  value,
  onChange,
  onClose,
}: {
  value: Date;
  onChange: (d: Date) => void;
  onClose: () => void;
}) {
  const [view, setView] = useState({ y: value.getFullYear(), m: value.getMonth() });
  const shift = (by: number) => {
    const d = new Date(view.y, view.m + by, 1);
    setView({ y: d.getFullYear(), m: d.getMonth() });
  };

  return (
    <Modal transparent animationType="none" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card} onPress={() => {}}>
          <View style={styles.nav}>
            <IconButton name="back" label="Previous month" onPress={() => shift(-1)} />
            <Text style={styles.month}>{monthLabel(view.y, view.m)}</Text>
            <IconButton name="next" label="Next month" onPress={() => shift(1)} />
          </View>
          <MonthGrid
            year={view.y}
            month={view.m}
            selected={dayKey(value)}
            onSelect={(day) => {
              // Keep the time of day, change only the date.
              const d = new Date(value);
              d.setFullYear(day.getFullYear(), day.getMonth(), day.getDate());
              onChange(d);
              onClose();
            }}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 16 },
  card: { backgroundColor: C.bg, borderRadius: 16, padding: 16, width: '100%', maxWidth: 440, alignSelf: 'center' },
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  month: { fontSize: 17, color: C.text, fontWeight: '600' },
});

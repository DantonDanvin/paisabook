import { Pressable, StyleSheet, Text, View } from 'react-native';

import { dayKey } from '@/lib/format';
import { C } from '@/lib/theme';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export type DayMarks = Record<string, { income?: boolean; expense?: boolean }>;

// One month of days. `selected` and the keys of `marks` are "YYYY-MM-DD" strings.
export function MonthGrid({
  year,
  month,
  selected,
  onSelect,
  marks,
  compact = false,
}: {
  year: number;
  month: number;
  selected: string | null;
  onSelect: (day: Date) => void;
  marks?: DayMarks;
  compact?: boolean;
}) {
  const first = new Date(year, month, 1).getDay();
  const count = new Date(year, month + 1, 0).getDate();
  const today = dayKey(new Date());
  const cells: (number | null)[] = [];
  for (let i = 0; i < first; i++) cells.push(null);
  for (let d = 1; d <= count; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  const size = compact ? 36 : 44;

  return (
    <View>
      <View style={styles.week}>
        {WEEKDAYS.map((w) => (
          <Text key={w} style={styles.weekday}>
            {w}
          </Text>
        ))}
      </View>
      <View style={styles.grid}>
        {cells.map((d, i) => {
          if (d == null) return <View key={i} style={[styles.cell, { height: size + 8 }]} />;
          const date = new Date(year, month, d);
          const key = dayKey(date);
          const on = key === selected;
          const mark = marks?.[key];
          return (
            <Pressable key={i} style={[styles.cell, { height: size + 8 }]} onPress={() => onSelect(date)}>
              <View
                style={[
                  styles.day,
                  { width: size, height: size, borderRadius: size / 2 },
                  on && styles.dayOn,
                  !on && key === today && styles.dayToday,
                ]}>
                <Text style={[styles.dayText, on && styles.dayTextOn]}>{d}</Text>
                <View style={styles.dots}>
                  {mark?.income && <View style={[styles.dot, { backgroundColor: on ? C.white : C.income }]} />}
                  {mark?.expense && <View style={[styles.dot, { backgroundColor: on ? C.white : C.expense }]} />}
                </View>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  week: { flexDirection: 'row', paddingVertical: 6 },
  weekday: { width: `${100 / 7}%`, textAlign: 'center', color: C.muted, fontSize: 13 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, alignItems: 'center', justifyContent: 'center' },
  day: { alignItems: 'center', justifyContent: 'center' },
  dayOn: { backgroundColor: C.accent },
  dayToday: { borderWidth: 1.5, borderColor: C.accent },
  dayText: { fontSize: 17, color: C.text },
  dayTextOn: { color: C.white, fontWeight: '700' },
  dots: { flexDirection: 'row', gap: 3, height: 5 },
  dot: { width: 5, height: 5, borderRadius: 3 },
});

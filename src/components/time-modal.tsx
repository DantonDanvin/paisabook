import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';

import { Button } from '@/components/ui';
import { C } from '@/lib/theme';

const SIZE = 264;
const CENTER = SIZE / 2;
const RADIUS = 104;
const NUMBER = 40;

// Where a value sits on the dial: 0 is at the top, going clockwise.
function point(fraction: number, r = RADIUS) {
  const a = fraction * 2 * Math.PI;
  return { x: CENTER + r * Math.sin(a), y: CENTER - r * Math.cos(a) };
}

// Clock-face time picker: tap the hour, then the minute, then OK.
export function TimeModal({
  value,
  onChange,
  onClose,
}: {
  value: Date;
  onChange: (d: Date) => void;
  onClose: () => void;
}) {
  const [hour, setHour] = useState(value.getHours());
  const [minute, setMinute] = useState(value.getMinutes());
  const [mode, setMode] = useState<'hour' | 'minute'>('hour');

  const pm = hour >= 12;
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  const hand = point(mode === 'hour' ? (hour % 12) / 12 : minute / 60);
  const bump = (by: number) => setMinute((minute + by + 60) % 60);

  return (
    <Modal transparent animationType="none" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card} onPress={() => {}}>
          <View style={styles.top}>
            <Pressable onPress={() => setMode('hour')} style={[styles.digits, mode === 'hour' && styles.digitsOn]}>
              <Text style={[styles.digitsText, mode === 'hour' && styles.digitsTextOn]}>{hour12}</Text>
            </Pressable>
            <Text style={styles.colon}>:</Text>
            <Pressable onPress={() => setMode('minute')} style={[styles.digits, mode === 'minute' && styles.digitsOn]}>
              <Text style={[styles.digitsText, mode === 'minute' && styles.digitsTextOn]}>
                {String(minute).padStart(2, '0')}
              </Text>
            </Pressable>
            <View style={styles.ampm}>
              <Pressable onPress={() => setHour(hour % 12)} style={[styles.half, !pm && styles.halfOn]}>
                <Text style={[styles.halfText, !pm && styles.halfTextOn]}>AM</Text>
              </Pressable>
              <Pressable onPress={() => setHour((hour % 12) + 12)} style={[styles.half, pm && styles.halfOn]}>
                <Text style={[styles.halfText, pm && styles.halfTextOn]}>PM</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.dial}>
            <Svg width={SIZE} height={SIZE} style={StyleSheet.absoluteFill}>
              <Circle cx={CENTER} cy={CENTER} r={CENTER} fill={C.band} />
              <Line x1={CENTER} y1={CENTER} x2={hand.x} y2={hand.y} stroke={C.accent} strokeWidth={2} />
              <Circle cx={CENTER} cy={CENTER} r={4} fill={C.accent} />
              <Circle cx={hand.x} cy={hand.y} r={NUMBER / 2} fill={C.accent} />
            </Svg>
            {Array.from({ length: 12 }, (_, i) => {
              const p = point(i / 12);
              const on = mode === 'hour' ? i === hour % 12 : i * 5 === minute;
              const label = mode === 'hour' ? String(i === 0 ? 12 : i) : String(i * 5).padStart(2, '0');
              return (
                <Pressable
                  key={i}
                  style={[styles.number, { left: p.x - NUMBER / 2, top: p.y - NUMBER / 2 }]}
                  onPress={() => {
                    if (mode === 'hour') {
                      setHour(i + (pm ? 12 : 0));
                      setMode('minute');
                    } else {
                      setMinute(i * 5);
                    }
                  }}>
                  <Text style={[styles.numberText, on && styles.numberTextOn]}>{label}</Text>
                </Pressable>
              );
            })}
          </View>

          {/* The dial moves in steps of five; these two reach the minutes in between. */}
          <View style={[styles.fine, mode === 'hour' && styles.hidden]}>
            <Pressable style={styles.fineButton} onPress={() => bump(-1)} disabled={mode === 'hour'}>
              <Text style={styles.fineText}>− 1 min</Text>
            </Pressable>
            <Pressable style={styles.fineButton} onPress={() => bump(1)} disabled={mode === 'hour'}>
              <Text style={styles.fineText}>+ 1 min</Text>
            </Pressable>
          </View>

          <View style={styles.actions}>
            <View style={styles.action}>
              <Button title="Cancel" outline color={C.muted} onPress={onClose} />
            </View>
            <View style={styles.action}>
              <Button
                title="OK"
                onPress={() => {
                  // Keep the date, change only the time of day.
                  const d = new Date(value);
                  d.setHours(hour, minute, 0, 0);
                  onChange(d);
                  onClose();
                }}
              />
            </View>
          </View>
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
    gap: 14,
    width: '100%',
    maxWidth: 340,
    alignSelf: 'center',
    alignItems: 'center',
  },
  top: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  digits: { minWidth: 76, height: 68, borderRadius: 10, backgroundColor: C.band, alignItems: 'center', justifyContent: 'center' },
  digitsOn: { backgroundColor: C.accent },
  digitsText: { fontSize: 42, fontWeight: '600', color: C.text },
  digitsTextOn: { color: C.white },
  colon: { fontSize: 42, fontWeight: '600', color: C.text },
  ampm: { marginLeft: 8, borderWidth: 1, borderColor: C.line, borderRadius: 10, overflow: 'hidden' },
  half: { width: 52, height: 34, alignItems: 'center', justifyContent: 'center' },
  halfOn: { backgroundColor: C.accent },
  halfText: { fontSize: 15, fontWeight: '600', color: C.muted },
  halfTextOn: { color: C.white },
  dial: { width: SIZE, height: SIZE },
  number: { position: 'absolute', width: NUMBER, height: NUMBER, alignItems: 'center', justifyContent: 'center' },
  numberText: { fontSize: 17, color: C.text },
  numberTextOn: { color: C.white, fontWeight: '700' },
  fine: { flexDirection: 'row', gap: 10 },
  hidden: { opacity: 0 },
  fineButton: { borderWidth: 1, borderColor: C.line, borderRadius: 18, paddingHorizontal: 14, height: 36, justifyContent: 'center' },
  fineText: { fontSize: 14, color: C.text },
  actions: { flexDirection: 'row', gap: 10, alignSelf: 'stretch' },
  action: { flex: 1 },
});

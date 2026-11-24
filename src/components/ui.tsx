import { router } from 'expo-router';
import { type ReactNode, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, type TextInputProps, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, type IconName } from '@/components/icon';
import { C, PALETTE } from '@/lib/theme';

export function Screen({ children, color = C.bg }: { children: ReactNode; color?: string }) {
  return <View style={[styles.screen, { backgroundColor: color }]}>{children}</View>;
}

export function IconButton({
  name,
  onPress,
  color = C.text,
  label,
}: {
  name: IconName;
  onPress: () => void;
  color?: string;
  label: string;
}) {
  return (
    <Pressable onPress={onPress} hitSlop={8} accessibilityLabel={label} style={styles.iconButton}>
      <Icon name={name} color={color} />
    </Pressable>
  );
}

// Top bar. `back` shows a back arrow; `tint` paints the bar in an account's color.
export function Header({
  title,
  back = false,
  left,
  right,
  tint,
  big = false,
}: {
  title: string;
  back?: boolean;
  left?: ReactNode;
  right?: ReactNode;
  tint?: string;
  big?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const fg = tint ? C.white : C.text;
  return (
    <View style={[styles.header, { paddingTop: insets.top + 6, backgroundColor: tint ?? C.bg }]}>
      {back && <IconButton name="back" color={fg} label="Back" onPress={goBack} />}
      {left}
      <Text numberOfLines={1} style={[big ? styles.headerBig : styles.headerTitle, { color: fg }]}>
        {title}
      </Text>
      <View style={styles.headerRight}>{right}</View>
    </View>
  );
}

export function goBack() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

export function Band({ left, right }: { left: string; right?: string }) {
  return (
    <View style={styles.band}>
      <Text style={styles.bandText}>{left}</Text>
      {right != null && <Text style={styles.bandText}>{right}</Text>}
    </View>
  );
}

export function Row({
  icon,
  iconColor,
  title,
  value,
  onPress,
  chevron = true,
}: {
  icon?: IconName;
  iconColor?: string;
  title: string;
  value?: string;
  onPress?: () => void;
  chevron?: boolean;
}) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={styles.row}>
      {icon && <Icon name={icon} color={iconColor ?? C.accent} />}
      <Text style={styles.rowTitle} numberOfLines={1}>
        {title}
      </Text>
      {value != null && (
        <Text style={styles.rowValue} numberOfLines={1}>
          {value}
        </Text>
      )}
      {onPress && chevron && <Icon name="next" size={20} color={C.faint} />}
    </Pressable>
  );
}

export function Button({
  title,
  onPress,
  color = C.accent,
  outline = false,
  disabled = false,
}: {
  title: string;
  onPress: () => void;
  color?: string;
  outline?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.button,
        outline ? { borderColor: color, borderWidth: 1.5 } : { backgroundColor: color },
        disabled && styles.disabled,
      ]}>
      <Text style={[styles.buttonText, { color: outline ? color : C.white }]}>{title}</Text>
    </Pressable>
  );
}

// Destructive action without a popup: the first tap arms it, the second tap runs it.
export function ConfirmButton({ title, onConfirm }: { title: string; onConfirm: () => void }) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 4000);
    return () => clearTimeout(t);
  }, [armed]);
  return (
    <Button
      title={armed ? 'Tap again to confirm' : title}
      color={C.expense}
      outline={!armed}
      onPress={() => (armed ? onConfirm() : setArmed(true))}
    />
  );
}

export function Chip({
  label,
  selected,
  onPress,
  color = C.accent,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  color?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, selected && { backgroundColor: color, borderColor: color }]}>
      <Text style={[styles.chipText, selected && { color: C.white }]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

export function Field({ label, ...props }: { label: string } & TextInputProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput placeholderTextColor={C.faint} {...props} style={[styles.input, props.style]} />
    </View>
  );
}

export function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <View style={styles.palette}>
      {PALETTE.map((c) => (
        <Pressable
          key={c}
          onPress={() => onChange(c)}
          accessibilityLabel={`Color ${c}`}
          style={[styles.swatch, { backgroundColor: c }, value === c && styles.swatchOn]}
        />
      ))}
    </View>
  );
}

export function Empty({ text }: { text: string }) {
  return <Text style={styles.empty}>{text}</Text>;
}

// The two add buttons that sit at the bottom right of the main screens.
export function AddButtons({ accountId, date }: { accountId?: string; date?: string }) {
  const open = (type: 'income' | 'expense') =>
    router.push({ pathname: '/txn', params: { type, ...(accountId && { accountId }), ...(date && { date }) } });
  return (
    <View style={styles.fabs} pointerEvents="box-none">
      <Pressable style={[styles.fab, { backgroundColor: C.income }]} onPress={() => open('income')}>
        <Icon name="plus" size={20} color={C.white} />
        <Text style={styles.fabText}>Income</Text>
      </Pressable>
      <Pressable style={[styles.fab, { backgroundColor: C.expense }]} onPress={() => open('expense')}>
        <Icon name="minus" size={20} color={C.white} />
        <Text style={styles.fabText}>Expense</Text>
      </Pressable>
    </View>
  );
}

export const styles = StyleSheet.create({
  screen: { flex: 1 },
  iconButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingBottom: 8, gap: 4 },
  headerTitle: { flex: 1, fontSize: 20, fontWeight: '600', paddingHorizontal: 4 },
  headerBig: { flex: 1, fontSize: 30, fontWeight: '800', paddingHorizontal: 8 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  band: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: C.band,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  bandText: { color: C.muted, fontSize: 15 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 20,
    minHeight: 56,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.line,
  },
  rowTitle: { flex: 1, fontSize: 17, color: C.text },
  rowValue: { fontSize: 16, color: C.muted, maxWidth: '50%' },
  button: { minHeight: 50, borderRadius: 12, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  buttonText: { fontSize: 17, fontWeight: '700' },
  disabled: { opacity: 0.4 },
  chip: {
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 18,
    paddingHorizontal: 14,
    minHeight: 36,
    justifyContent: 'center',
    backgroundColor: C.bg,
  },
  chipText: { fontSize: 15, color: C.text },
  field: { gap: 6 },
  fieldLabel: { fontSize: 13, color: C.muted },
  input: {
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 10,
    paddingHorizontal: 12,
    minHeight: 46,
    fontSize: 17,
    color: C.text,
  },
  palette: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  swatch: { width: 34, height: 34, borderRadius: 17 },
  swatchOn: { borderWidth: 3, borderColor: C.text },
  empty: { textAlign: 'center', color: C.muted, fontSize: 15, padding: 32 },
  fabs: { position: 'absolute', right: 16, bottom: 16, flexDirection: 'row', gap: 10 },
  fab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    height: 50,
    borderRadius: 25,
    elevation: 3,
  },
  fabText: { color: C.white, fontSize: 16, fontWeight: '700' },
});

import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { C } from '@/lib/theme';

// Ring chart. Each segment is drawn as a dashed circle stroke, starting from the top.
export function Donut({
  segments,
  size = 200,
  stroke = 22,
  children,
}: {
  segments: { color: string; value: number }[];
  size?: number;
  stroke?: number;
  children?: ReactNode;
}) {
  const r = (size - stroke) / 2;
  const len = 2 * Math.PI * r;
  const total = segments.reduce((a, s) => a + s.value, 0);
  const dashes = segments.map((s) => (total > 0 ? (s.value / total) * len : 0));
  const offsets = dashes.map((_, i) => dashes.slice(0, i).reduce((a, d) => a + d, 0));
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={C.band} strokeWidth={stroke} fill="none" />
        {total > 0 &&
          segments.map((s, i) => (
              <Circle
                key={i}
                cx={size / 2}
                cy={size / 2}
                r={r}
                stroke={s.color}
                strokeWidth={stroke}
                fill="none"
                strokeDasharray={`${dashes[i]} ${len - dashes[i]}`}
                strokeDashoffset={-offsets[i]}
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
              />
          ))}
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.center]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({ center: { alignItems: 'center', justifyContent: 'center' } });

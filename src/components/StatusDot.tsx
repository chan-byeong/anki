import { StyleSheet, Text, View } from 'react-native';

import { space } from '../theme/tokens';
import { useTheme } from '../theme/ThemeProvider';

export type StatusDotState = 'synced' | 'pending' | 'failed';

interface StatusDotProps {
  state: StatusDotState;
  // 점 옆에는 항상 글자가 있다("동기화됨", "동기화 대기 3").
  label: string;
}

export function StatusDot({ state, label }: StatusDotProps) {
  const { colors, text } = useTheme();
  const color = { synced: colors.success, pending: colors.warn, failed: colors.danger }[state];

  return (
    <View accessible accessibilityLabel={label} style={styles.row}>
      {/* 실패만 네모라 색을 구분하지 못해도 모양으로 알 수 있다. */}
      <View
        aria-hidden
        style={[styles.dot, { backgroundColor: color }, state === 'failed' && styles.square]}
      />
      <Text style={[text('caption'), { color: colors.muted }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  dot: { width: 8, height: 8, borderRadius: 4 },
  square: { borderRadius: 2 },
});

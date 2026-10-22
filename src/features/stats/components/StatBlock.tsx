import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { space } from '@/theme/tokens';

interface StatBlockProps {
  value: number;
  unit: string;
  label: string;
  // 숫자를 어떻게 셌는지. 섹션마다 적는다.
  basis: string;
}

// 큰 숫자 하나와 이름, 계산 기준. 한 덩어리로 읽힌다.
export function StatBlock({ value, unit, label, basis }: StatBlockProps) {
  const { colors, text } = useTheme();
  const shown = value.toLocaleString('en-US');

  return (
    <View accessible accessibilityLabel={`${label} ${shown}${unit}. ${basis}`} style={styles.block}>
      <Text style={[text('display', { weight: 'bold' }), styles.number]}>
        {shown}
        <Text style={text('body', { weight: 'bold' })}>{unit}</Text>
      </Text>
      <Text style={[text('caption'), { color: colors.muted }]}>{label}</Text>
      <Text style={[text('caption'), { color: colors.muted }]}>{basis}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  block: { flex: 1, gap: space[1] },
  number: { fontVariant: ['tabular-nums'] },
});

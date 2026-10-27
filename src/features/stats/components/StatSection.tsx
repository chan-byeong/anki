import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { space } from '@/theme/tokens';

interface StatSectionProps {
  title: string;
  // 제목 오른쪽의 짧은 범위("최근 18주").
  period: string;
  // 숫자를 어떻게 셌는지. 섹션 끝에 적는다.
  basis: string;
  children: ReactNode;
}

// 위쪽 선으로 나뉘는 통계 섹션 하나.
export function StatSection({ title, period, basis, children }: StatSectionProps) {
  const { colors, text } = useTheme();

  return (
    <View style={[styles.section, { borderTopColor: colors.line }]}>
      <View style={styles.header}>
        <Text accessibilityRole="header" style={text('body', { weight: 'bold' })}>
          {title}
        </Text>
        <Text style={[text('caption'), { color: colors.muted }]}>{period}</Text>
      </View>
      {children}
      <Text style={[text('caption'), { color: colors.muted }]}>{basis}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { paddingVertical: space[3], borderTopWidth: 1, gap: space[2] },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: space[2],
  },
});

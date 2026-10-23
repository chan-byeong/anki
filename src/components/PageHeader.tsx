import type { Ref } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { space } from '../theme/tokens';
import { useTheme } from '../theme/ThemeProvider';

interface PageHeaderProps {
  title: string;
  caption?: string;
  // 제목에 포커스를 보낼 때 쓴다(지운 항목의 트리거가 사라졌을 때 돌아갈 곳).
  ref?: Ref<Text>;
}

export function PageHeader({ ref, title, caption }: PageHeaderProps) {
  const { colors, text } = useTheme();

  return (
    <View style={styles.header}>
      <Text ref={ref} accessibilityRole="header" style={text('display', { weight: 'bold' })}>
        {title}
      </Text>
      {caption ? <Text style={[text('caption'), { color: colors.muted }]}>{caption}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: space[4], paddingBottom: space[3], gap: space[1] },
});

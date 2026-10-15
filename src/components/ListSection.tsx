import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { space } from '../theme/tokens';
import { useTheme } from '../theme/ThemeProvider';

interface ListSectionProps {
  label: string;
  // 설정처럼 촘촘한 목록: 라벨 위 여백을 줄이고 아래 여백을 없앤다.
  dense?: boolean;
  children: ReactNode;
}

export function ListSection({ label, dense = false, children }: ListSectionProps) {
  const { colors, text } = useTheme();

  return (
    <View>
      <Text
        accessibilityRole="header"
        style={[text('caption'), dense ? styles.dense : styles.label, { color: colors.muted }]}
      >
        {label}
      </Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { paddingTop: space[4], paddingBottom: space[1] },
  dense: { paddingTop: space[2] },
});

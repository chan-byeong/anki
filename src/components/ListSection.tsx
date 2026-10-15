import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { space } from '../theme/tokens';
import { useTheme } from '../theme/ThemeProvider';

interface ListSectionProps {
  label: string;
  children: ReactNode;
}

export function ListSection({ label, children }: ListSectionProps) {
  const { colors, text } = useTheme();

  return (
    <View>
      <Text
        accessibilityRole="header"
        style={[text('caption', { weight: 'bold' }), styles.label, { color: colors.muted }]}
      >
        {label}
      </Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { paddingTop: space[3], paddingBottom: space[2] },
});

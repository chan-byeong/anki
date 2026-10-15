import { StyleSheet, Text, View } from 'react-native';

import { space } from '../theme/tokens';
import { useTheme } from '../theme/ThemeProvider';

interface PageHeaderProps {
  title: string;
  caption?: string;
}

export function PageHeader({ title, caption }: PageHeaderProps) {
  const { colors, text } = useTheme();

  return (
    <View style={styles.header}>
      <Text accessibilityRole="header" style={text('display', { weight: 'bold' })}>
        {title}
      </Text>
      {caption ? <Text style={[text('caption'), { color: colors.muted }]}>{caption}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: space[4], paddingBottom: space[3] },
});

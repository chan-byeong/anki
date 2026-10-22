import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PageHeader, TopBar } from '@/components';
import { useTheme } from '@/theme/ThemeProvider';

// 아직 만들지 않은 화면의 자리. 홈의 버튼이 갈 곳을 미리 두고, 각 티켓에서 실제 화면으로 바꾼다.
interface ComingSoonProps {
  title: string;
}

export function ComingSoon({ title }: ComingSoonProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg, paddingTop: insets.top }]}>
      <TopBar leading="back" leadingLabel="덱으로" onLeadingPress={router.back} />
      <PageHeader title={title} caption="준비 중이에요" />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
});

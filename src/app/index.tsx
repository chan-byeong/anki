import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { space } from '@/theme/tokens';

// 토큰·테마·글꼴 확인용 임시 화면. 실제 홈 화면 작업에서 대체한다.
export default function HomeScreen() {
  const { colors, text } = useTheme();
  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <Text style={text('title', { weight: 'bold' })}>단어 복습</Text>
      <Text style={[text('body'), { color: colors.muted }]}>오늘 복습할 카드가 없어요</Text>
      <Text style={text('body', { ja: true })}>直す · 辛い · 日本語の漢字</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: space[4], gap: space[2], justifyContent: 'center' },
});

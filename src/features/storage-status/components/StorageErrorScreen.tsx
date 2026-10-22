import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AlertCircleIcon, Button } from '@/components';
import { useTheme } from '@/theme/ThemeProvider';
import { space } from '@/theme/tokens';

interface StorageErrorScreenProps {
  onRetry: () => void;
  retrying: boolean;
}

// 로컬 저장소를 열지 못했을 때의 전체 화면(State-6). 동기화가 생기기 전이라 "다시 시도"만 있다.
export function StorageErrorScreen({ onRetry, retrying }: StorageErrorScreenProps) {
  const { colors, text } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.screen,
        { backgroundColor: colors.bg, paddingTop: insets.top, paddingBottom: insets.bottom },
      ]}
    >
      <View style={styles.main}>
        <AlertCircleIcon color={colors.danger} size={32} />
        <Text accessibilityRole="header" style={text('title', { weight: 'bold' })}>
          자료를 열지 못했어요
        </Text>
        <Text style={[text('body'), { color: colors.muted }]}>
          이 기기의 저장소를 읽는 중에 문제가 생겼어요. 잠시 뒤 다시 시도해 주세요. 계속 안 되면
          앱을 완전히 닫았다가 다시 열어 주세요.
        </Text>
      </View>
      <View style={styles.footer}>
        <Button label="다시 시도" onPress={onRetry} disabled={retrying} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  main: { flex: 1, justifyContent: 'center', paddingHorizontal: space[4], gap: space[2] },
  footer: {
    paddingTop: space[3],
    paddingHorizontal: space[4],
    paddingBottom: space[2],
    gap: space[2],
  },
});

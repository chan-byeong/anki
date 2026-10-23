import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { CloseIcon, IconButton } from '@/components';
import { useTheme } from '@/theme/ThemeProvider';
import { size, space } from '@/theme/tokens';

const close = () => (router.canGoBack() ? router.back() : router.replace('/'));

// 복습 화면 위쪽 줄. 닫기 버튼과, 복습 중이면 남은 카드 수를 보인다.
interface ReviewBarProps {
  remaining?: number;
}

export function ReviewBar({ remaining }: ReviewBarProps) {
  const { colors, text } = useTheme();

  return (
    <View style={styles.bar}>
      <IconButton icon={CloseIcon} label="복습 닫기" onPress={close} />
      {remaining !== undefined ? (
        // 숫자만 읽히지 않도록 이름을 붙이고, 줄어들면 라이브 영역으로 알린다(accessibilityLiveRegion은 Android 전용).
        <Text
          accessible
          accessibilityLabel={`남은 카드 ${remaining}장`}
          accessibilityLiveRegion="polite"
          aria-live="polite"
          style={[text('caption'), styles.remaining, { color: colors.muted }]}
        >
          {`${remaining}장 남음`}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    height: size.button,
    paddingHorizontal: size.edgeIcon,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  remaining: { paddingRight: space[3], fontVariant: ['tabular-nums'] },
});

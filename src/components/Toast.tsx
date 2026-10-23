import { useEffect } from 'react';
import { AccessibilityInfo, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { radius, size, space } from '../theme/tokens';
import { useTheme } from '../theme/ThemeProvider';
import type { IconComponent } from './icons';
import { LiveAnnouncer } from './LiveAnnouncer';

interface ToastProps {
  message: string;
  sub?: string;
  icon?: IconComponent;
  // 떠 있을 자리: 아래 행동 영역이 버튼이면 button, 평가 버튼이면 rating.
  above?: 'button' | 'rating';
}

// 보이고 사라지는 시점은 호출 측이 정한다(저절로 사라지는 타이머 포함).
export function Toast({ message, sub, icon: Icon, above = 'button' }: ToastProps) {
  const { colors, text } = useTheme();
  const insets = useSafeAreaInsets();
  const spoken = sub ? `${message}. ${sub}` : message;
  // accessibilityLiveRegion은 Android 전용이라 iOS는 직접 읽어 주고, 웹은 LiveAnnouncer가 읽는다.
  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(spoken);
  }, [spoken]);
  const bottom =
    space[3] +
    (above === 'rating' ? size.rating : size.button) +
    space[2] +
    insets.bottom +
    space[2];

  return (
    <View
      accessible
      accessibilityLiveRegion="polite"
      accessibilityLabel={spoken}
      style={[styles.toast, { backgroundColor: colors.text, bottom }]}
    >
      <LiveAnnouncer message={spoken} />
      {Icon ? (
        <View aria-hidden>
          <Icon color={colors.inverse} size={18} />
        </View>
      ) : null}
      <View style={styles.text}>
        <Text style={[text('body', { weight: 'bold' }), { color: colors.inverse }]}>{message}</Text>
        {sub ? (
          <Text style={[text('caption'), { color: colors.inverse, opacity: 0.8 }]}>{sub}</Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    left: space[4],
    right: space[4],
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    padding: space[3],
    borderRadius: radius.sm,
  },
  text: { flex: 1, gap: space[1] },
});

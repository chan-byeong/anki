import { useEffect, useMemo } from 'react';
import { AccessibilityInfo, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, Keyframe } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useMotion } from '../hooks/use-motion';
import { easeIn, easeOut, radius, size, space } from '../theme/tokens';
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
// 나타날 때 아래에서 떠오르며 페이드, 사라질 때 내려가며 페이드. 떠 있는 동안 내용만 바뀌면
// 다시 움직이지 않는다(머무는 시간은 호출 측이 다시 센다).
export function Toast({ message, sub, icon: Icon, above = 'button' }: ToastProps) {
  const { colors, text } = useTheme();
  const insets = useSafeAreaInsets();
  const { motion, shift } = useMotion();
  const { entering, exiting } = useMemo(
    () => ({
      entering: new Keyframe({
        0: { opacity: 0, transform: [{ translateY: shift }] },
        100: { opacity: 1, transform: [{ translateY: 0 }], easing: Easing.bezier(...easeOut) },
      }).duration(motion),
      exiting: new Keyframe({
        0: { opacity: 1, transform: [{ translateY: 0 }] },
        100: { opacity: 0, transform: [{ translateY: shift }], easing: Easing.bezier(...easeIn) },
      }).duration(motion),
    }),
    [motion, shift],
  );
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
    <Animated.View
      entering={entering}
      exiting={exiting}
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
    </Animated.View>
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

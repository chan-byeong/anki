import { useEffect, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { easeMove, motion, space } from '../theme/tokens';
import { useTheme } from '../theme/ThemeProvider';

export type StatusDotState = 'synced' | 'pending' | 'failed';

interface StatusDotProps {
  state: StatusDotState;
  // 점 옆에는 항상 글자가 있다("동기화됨", "동기화 대기 3").
  label: string;
}

export function StatusDot({ state, label }: StatusDotProps) {
  const { colors, text } = useTheme();
  const color = { synced: colors.success, pending: colors.warn, failed: colors.danger }[state];
  const shown = useSharedValue(color);
  const lastState = useRef(state);

  // 상태가 바뀌면 색이 페이드로 바뀐다(깜빡이지 않음). 테마만 바뀌면 화면 전체처럼 바로 바뀐다.
  useEffect(() => {
    const changed = lastState.current !== state;
    lastState.current = state;
    shown.value = changed ? withTiming(color, { duration: motion, easing: EASE_MOVE }) : color;
  }, [state, color, shown]);

  const dotStyle = useAnimatedStyle(() => ({ backgroundColor: shown.value }));

  return (
    <View accessible accessibilityLabel={label} style={styles.row}>
      {/* 실패만 네모라 색을 구분하지 못해도 모양으로 알 수 있다. */}
      <Animated.View
        testID="status-dot"
        aria-hidden
        style={[styles.dot, dotStyle, state === 'failed' && styles.square]}
      />
      <Text style={[text('caption'), { color: colors.muted }]}>{label}</Text>
    </View>
  );
}

const EASE_MOVE = Easing.bezier(...easeMove);

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  dot: { width: 8, height: 8, borderRadius: 4 },
  square: { borderRadius: 2 },
});

import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { RatingMark, ratingColor } from '@/components';
import { RATINGS } from '@/features/review/components/ratings';
import { useMotion } from '@/hooks/use-motion';
import { usePressProgress } from '@/hooks/use-press-progress';
import type { Rating } from '@/storage/store';
import { useTheme } from '@/theme/ThemeProvider';
import { easeIn, easeOut, radius, size, space } from '@/theme/tokens';

// 정답을 연 뒤의 평가 버튼 줄. 저장 중에는 모두 막고, 다시 시도 중이면 고른 평가만 남긴다.
interface RatingButtonsProps {
  onRate: (rating: Rating) => void;
  disabled: boolean;
  pendingRating: Rating | null;
}

export function RatingButtons({
  onRate,
  disabled: allDisabled,
  pendingRating,
}: RatingButtonsProps) {
  return (
    <View role="group" accessibilityLabel="평가" style={styles.ratings}>
      {RATINGS.map(({ kind, label, rating }) => (
        <RatingButton
          key={kind}
          kind={kind}
          label={label}
          disabled={allDisabled || (pendingRating !== null && pendingRating !== rating)}
          selected={pendingRating === rating}
          onPress={() => onRate(rating)}
        />
      ))}
    </View>
  );
}

interface RatingButtonProps {
  kind: (typeof RATINGS)[number]['kind'];
  label: string;
  disabled: boolean;
  selected: boolean;
  onPress: () => void;
}

const EASE_OUT = Easing.bezier(...easeOut);
const EASE_IN = Easing.bezier(...easeIn);

function RatingButton({ kind, label, disabled, selected, onPress }: RatingButtonProps) {
  const { colors } = useTheme();
  const { motion, pressScale, pickScale } = useMotion();
  const { progress, onPressIn, onPressOut } = usePressProgress();
  const pick = useSharedValue(1);

  // 고르면 표시가 한 번 커졌다 돌아온다. 다음 카드로 넘어가기 전 기다림(motion) 안에 끝난다.
  useEffect(() => {
    if (!selected) return;
    pick.value = withSequence(
      withTiming(pickScale, { duration: motion / 2, easing: EASE_OUT }),
      withTiming(1, { duration: motion / 2, easing: EASE_IN }),
    );
  }, [selected, pick, pickScale, motion]);

  const pressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(progress.value, [0, 1], [1, pressScale]) }],
  }));
  const pickStyle = useAnimatedStyle(() => ({ transform: [{ scale: pick.value }] }));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled, selected }}
      disabled={disabled}
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={styles.box}
    >
      {({ pressed }) => {
        // 누르는 동안과 고른 뒤에는 배경을 평가색으로, 마크를 반전색으로 뒤집는다(STA-152).
        const inverted = pressed || selected;
        return (
          <Animated.View
            style={[
              styles.rating,
              { backgroundColor: inverted ? ratingColor(colors, kind) : colors.surface },
              pressStyle,
            ]}
          >
            <Animated.View testID={`rating-mark-${label}`} aria-hidden style={pickStyle}>
              <RatingMark
                kind={kind}
                size={size.ratingMark}
                color={inverted ? colors.inverse : undefined}
              />
            </Animated.View>
          </Animated.View>
        );
      }}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  ratings: { flexDirection: 'row', gap: space[2], alignSelf: 'stretch' },
  box: { flex: 1 },
  rating: {
    flex: 1,
    minHeight: size.rating,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

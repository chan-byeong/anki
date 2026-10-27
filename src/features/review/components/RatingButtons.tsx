import { Pressable, StyleSheet, View } from 'react-native';

import { RatingMark, ratingColor } from '@/components';
import { RATINGS } from '@/features/review/components/ratings';
import type { Rating } from '@/storage/store';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, size, space } from '@/theme/tokens';

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
  const { colors } = useTheme();

  return (
    <View role="group" accessibilityLabel="평가" style={styles.ratings}>
      {RATINGS.map(({ kind, label, rating }) => {
        const disabled = allDisabled || (pendingRating !== null && pendingRating !== rating);
        // 고른 평가는 다음 카드로 넘어갈 때까지 배경을 평가색으로, 마크를 반전색으로 뒤집는다(STA-152).
        const selected = pendingRating === rating;
        return (
          <Pressable
            key={kind}
            accessibilityRole="button"
            accessibilityLabel={label}
            accessibilityState={{ disabled, selected }}
            disabled={disabled}
            onPress={() => onRate(rating)}
            style={({ pressed }) => [
              styles.rating,
              {
                backgroundColor: pressed || selected ? ratingColor(colors, kind) : colors.surface,
              },
            ]}
          >
            {({ pressed }) => (
              <View aria-hidden>
                <RatingMark
                  kind={kind}
                  size={size.ratingMark}
                  color={pressed || selected ? colors.inverse : undefined}
                />
              </View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  ratings: { flexDirection: 'row', gap: space[2], alignSelf: 'stretch' },
  rating: {
    flex: 1,
    minHeight: size.rating,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

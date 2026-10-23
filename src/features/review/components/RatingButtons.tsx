import { Pressable, StyleSheet, View } from 'react-native';

import { RatingMark } from '@/components';
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
        return (
          <Pressable
            key={kind}
            accessibilityRole="button"
            accessibilityLabel={label}
            accessibilityState={{ disabled }}
            disabled={disabled}
            onPress={() => onRate(rating)}
            style={[styles.rating, { backgroundColor: colors.surface }]}
          >
            <View aria-hidden>
              <RatingMark kind={kind} size={size.ratingMark} />
            </View>
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

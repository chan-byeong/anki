import { Pressable, StyleSheet, View } from 'react-native';

import { RatingMark } from '@/components';
import { RATINGS } from '@/features/review/components/ratings';
import type { Rating } from '@/storage/store';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, size, space } from '@/theme/tokens';

// 정답을 연 뒤의 평가 버튼 줄. 저장 중에는 모두 막고, 다시 시도 중이면 고른 평가만 남긴다.
// 메모를 열었으면(hintUsed) 헷갈림만 고를 수 있다.
interface RatingButtonsProps {
  onRate: (rating: Rating) => void;
  disabled: boolean;
  pendingRating: Rating | null;
  hintUsed: boolean;
}

export function RatingButtons({
  onRate,
  disabled: allDisabled,
  pendingRating,
  hintUsed,
}: RatingButtonsProps) {
  const { colors } = useTheme();

  return (
    <View role="group" accessibilityLabel="평가" style={styles.ratings}>
      {RATINGS.map(({ kind, label, rating }) => {
        const blockedByHint = hintUsed && rating !== 'unsure';
        const disabled =
          allDisabled || blockedByHint || (pendingRating !== null && pendingRating !== rating);
        return (
          <Pressable
            key={kind}
            accessibilityRole="button"
            accessibilityLabel={label}
            accessibilityHint={blockedByHint ? '메모를 열어서 헷갈림만 고를 수 있어요' : undefined}
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

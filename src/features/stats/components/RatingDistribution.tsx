import { StyleSheet, Text, View } from 'react-native';

import { RatingMark, type RatingKind } from '@/components';
import type { Rating } from '@/storage/store';
import { useTheme } from '@/theme/ThemeProvider';
import { space } from '@/theme/tokens';
import { formatCount } from '@/utils/format-count';

import type { RatingShare } from '../rating-share';

// 용어집의 평가 이름과 RatingMark 모양.
const NAME: Record<Rating, string> = { dont: '모름', unsure: '헷갈림', know: '앎' };
const MARK: Record<Rating, RatingKind> = { dont: 'forgot', unsure: 'unsure', know: 'knew' };

interface RatingDistributionProps {
  total: number;
  // ratingShare의 결과. 모름·헷갈림·앎 순서다.
  shares: RatingShare[];
}

// 평가 비율 막대와 평가마다 모양(✕ △ ○)·비율·횟수. 색은 보조라서 모양과 숫자만으로도 읽힌다.
export function RatingDistribution({ total, shares }: RatingDistributionProps) {
  const { colors, text } = useTheme();

  if (total === 0) {
    return (
      <Text style={[text('caption'), { color: colors.muted }]}>아직 평가한 기록이 없어요</Text>
    );
  }

  const color: Record<Rating, string> = {
    dont: colors.danger,
    unsure: colors.warn,
    know: colors.success,
  };
  const segments = shares.filter(({ count }) => count > 0);

  return (
    <>
      <View
        accessible
        accessibilityRole="image"
        accessibilityLabel={shares
          .map(({ rating, percent }) => `${NAME[rating]} ${percent}%`)
          .join(', ')}
        style={styles.bar}
      >
        {segments.map(({ rating, count }, index) => (
          <View
            key={rating}
            style={[
              styles.segment,
              { flex: count, backgroundColor: color[rating] },
              index === 0 && styles.first,
              index === segments.length - 1 && styles.last,
            ]}
          />
        ))}
      </View>
      <View style={styles.legend}>
        {shares.map(({ rating, count, percent }) => (
          <View
            key={rating}
            accessible
            accessibilityLabel={`${NAME[rating]} ${percent}%, ${formatCount(count)}장`}
            style={styles.item}
          >
            <View style={styles.name}>
              <RatingMark kind={MARK[rating]} size={14} />
              <Text style={[text('caption'), { color: colors.muted }]}>{NAME[rating]}</Text>
            </View>
            <Text style={[text('body', { weight: 'bold' }), styles.number]}>
              {`${percent}%`}
              <Text style={[text('caption'), { color: colors.muted }]}>
                {` · ${formatCount(count)}장`}
              </Text>
            </Text>
          </View>
        ))}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', gap: 2 },
  segment: { height: 12 },
  first: { borderTopLeftRadius: 4, borderBottomLeftRadius: 4 },
  last: { borderTopRightRadius: 4, borderBottomRightRadius: 4 },
  legend: { flexDirection: 'row', gap: space[3] },
  item: { flex: 1, gap: 2 },
  name: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  number: { fontVariant: ['tabular-nums'] },
});

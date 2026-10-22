import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Button, CheckIcon, RatingMark } from '@/components';
import { RATINGS } from '@/features/review/components/ratings';
import type { Rating } from '@/storage/store';
import { useTheme } from '@/theme/ThemeProvider';
import { space } from '@/theme/tokens';

// 복습 완료 화면. 본 카드 수와 평가별 결과를 보인다.
interface ReviewDoneProps {
  ratings: Rating[];
  tomorrowCount?: number;
  insetBottom: number;
}

export function ReviewDone({ ratings, tomorrowCount, insetBottom }: ReviewDoneProps) {
  const { colors, text } = useTheme();

  return (
    <>
      <View style={styles.main}>
        <CheckIcon size={space[5]} color={colors.success} />
        <View style={styles.title}>
          <Text
            accessibilityRole="header"
            style={[text('title', { weight: 'bold' }), styles.center]}
          >
            오늘 복습 끝
          </Text>
          <Text style={[text('body'), styles.center, { color: colors.muted }]}>
            {`${ratings.length}장을 봤어요`}
          </Text>
        </View>
        <View role="list" accessibilityLabel="평가 결과" style={styles.results}>
          {RATINGS.map(({ kind, label, rating }) => {
            const count = ratings.filter((value) => value === rating).length;
            return (
              <View
                key={kind}
                accessible
                role="listitem"
                accessibilityLabel={`${label} ${count}`}
                style={styles.result}
              >
                <View aria-hidden>
                  <RatingMark kind={kind} />
                </View>
                <Text style={[text('body', { weight: 'bold' }), styles.resultCount]}>{count}</Text>
              </View>
            );
          })}
        </View>
        {/* 캔버스에 0장일 때 문구가 없어 줄을 숨긴다. 아직 세지 못했을 때도 숨긴다. */}
        {tomorrowCount !== undefined && tomorrowCount > 0 ? (
          <Text style={[text('caption'), styles.center, { color: colors.muted }]}>
            {`다음 복습일 · 내일 ${tomorrowCount}장`}
          </Text>
        ) : null}
      </View>
      <View style={[styles.footer, { paddingBottom: space[2] + insetBottom }]}>
        <Button label="덱 목록으로" onPress={() => router.replace('/')} />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  main: {
    flex: 1,
    paddingHorizontal: space[4],
    alignItems: 'center',
    justifyContent: 'center',
    gap: space[4],
  },
  title: { alignItems: 'center', gap: space[2] },
  center: { textAlign: 'center' },
  results: { flexDirection: 'row', gap: space[4] },
  result: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  resultCount: { fontVariant: ['tabular-nums'] },
  footer: { paddingHorizontal: space[4], paddingTop: space[3] },
});

import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Notice, PageHeader, TopBar } from '@/components';
import { RatingDistribution } from '@/features/stats/components/RatingDistribution';
import { ReviewCalendar } from '@/features/stats/components/ReviewCalendar';
import { ReviewForecast } from '@/features/stats/components/ReviewForecast';
import { StatBlock } from '@/features/stats/components/StatBlock';
import { StatSection } from '@/features/stats/components/StatSection';
import { useReviewStats } from '@/features/stats/use-review-stats';
import { useTheme } from '@/theme/ThemeProvider';
import { space } from '@/theme/tokens';

export default function StatsScreen() {
  const { colors, text } = useTheme();
  const insets = useSafeAreaInsets();
  const stats = useReviewStats();

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg, paddingTop: insets.top }]}>
      <TopBar leading="back" leadingLabel="덱 목록으로" onLeadingPress={router.back} />
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + space[3] }}>
        <PageHeader title="통계" />
        {/* 처음 읽는 동안에는 비워 둔다. 빈 상태가 잠깐 보였다 사라지지 않게 하기 위해서다. */}
        {stats.kind === 'failed' ? (
          <View style={styles.body}>
            <Notice tone="danger" title="통계를 불러오지 못했어요" body="앱을 다시 열어 주세요." />
          </View>
        ) : null}
        {stats.kind === 'ready' && stats.total === 0 ? (
          <View style={styles.body}>
            <Text style={text('body', { weight: 'bold' })}>아직 복습한 기록이 없어요</Text>
            <Text style={[text('caption'), { color: colors.muted }]}>
              덱에서 복습을 시작하면 연속으로 복습한 날과 복습한 카드 수가 여기에 쌓여요.
            </Text>
          </View>
        ) : null}
        {stats.kind === 'ready' && stats.total > 0 ? (
          <View style={styles.stats}>
            <StatBlock
              value={stats.streak}
              unit="일"
              label="연속으로 복습한 날"
              basis="학습일(기기 날짜) 기준, 오늘 아직 안 했어도 어제까지 이어졌으면 유지"
            />
            <StatBlock
              value={stats.total}
              unit="장"
              label="지금까지 복습한 카드"
              basis="평가한 횟수 기준, 같은 카드도 복습할 때마다 더해요"
            />
          </View>
        ) : null}
        {stats.kind === 'ready' ? (
          <View style={styles.sections}>
            {/* 기록으로 세는 섹션은 기록이 있을 때만 보인다. 기록이 없으면 위의 빈 상태가 대신한다. */}
            {stats.total > 0 ? (
              <>
                <StatSection
                  title="복습한 날"
                  period="최근 18주"
                  basis="그날 평가한 카드 수 기준, 같은 날 여러 번 평가한 카드는 한 장으로 세요"
                >
                  <ReviewCalendar key={stats.today} weeks={stats.calendar} today={stats.today} />
                </StatSection>
                <StatSection
                  title="평가"
                  period="지금까지"
                  basis="평가한 횟수 기준, 힌트를 쓴 앎은 헷갈림으로 세요"
                >
                  <RatingDistribution {...stats.ratings} />
                </StatSection>
              </>
            ) : null}
            {/* 신규 카드는 기록이 없어도 오늘 복습할 카드라서 이 섹션은 늘 보인다. */}
            <StatSection
              title="앞으로 7일"
              period="복습일 기준"
              basis="오늘은 지금 남은 카드 전체, 내일부터는 그날이 복습일인 카드 수예요"
            >
              <ReviewForecast days={stats.forecast} today={stats.today} />
            </StatSection>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  body: { paddingHorizontal: space[4], paddingBottom: space[3], gap: space[1] },
  stats: {
    flexDirection: 'row',
    gap: space[3],
    paddingHorizontal: space[4],
    paddingBottom: space[3],
  },
  sections: { paddingHorizontal: space[4] },
});

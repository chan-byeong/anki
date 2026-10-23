import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Notice, PageHeader, TopBar } from '@/components';
import { StatBlock } from '@/features/stats/components/StatBlock';
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
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  body: { paddingHorizontal: space[4], gap: space[1] },
  stats: { flexDirection: 'row', gap: space[3], paddingHorizontal: space[4] },
});

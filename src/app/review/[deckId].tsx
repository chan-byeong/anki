import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Notice } from '@/components';
import { ReviewBar } from '@/features/review/components/ReviewBar';
import { ReviewFlow } from '@/features/review/components/ReviewFlow';
import { useReviewQueue } from '@/features/review/use-review-queue';
import { useTheme } from '@/theme/ThemeProvider';
import { space } from '@/theme/tokens';

// 복습(Review-1, Review-3). 대기열의 앞면을 먼저 보이고, 카드를 눌러 뒷면(정답)을 연다.
export default function ReviewScreen() {
  const { deckId } = useLocalSearchParams<{ deckId: string }>();
  const queue = useReviewQueue(deckId);
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const empty = queue.kind === 'ready' && queue.cards.length === 0;

  // 복습할 카드가 없는 덱은 덱 상세로 보낸다. 복습 화면이 스택에 남지 않게 바꿔 끼운다.
  useEffect(() => {
    if (empty) router.replace({ pathname: '/deck/[id]', params: { id: deckId } });
  }, [empty, deckId]);

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg, paddingTop: insets.top }]}>
      {queue.kind === 'ready' && !empty ? (
        <ReviewFlow
          key={deckId}
          deckId={deckId}
          cards={queue.cards}
          insetBottom={insets.bottom}
        />
      ) : (
        <ReviewBar />
      )}
      {queue.kind === 'missing' || queue.kind === 'failed' ? (
        <View style={styles.notice}>
          <Notice
            tone={queue.kind === 'failed' ? 'danger' : 'info'}
            title={
              queue.kind === 'failed' ? '복습을 불러오지 못했어요' : '덱이 없거나 휴지통에 있어요'
            }
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  notice: { padding: space[4] },
});

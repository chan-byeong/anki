import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Collapsible, Notice } from '@/components';
import { ReviewBar } from '@/features/review/components/ReviewBar';
import { ReviewFlow } from '@/features/review/components/ReviewFlow';
import { parseDeckIds } from '@/features/review/deck-ids';
import { useReviewQueue } from '@/features/review/use-review-queue';
import { useHeldValue } from '@/hooks/use-held-value';
import { useTheme } from '@/theme/ThemeProvider';
import { space } from '@/theme/tokens';

// 복습(Review-1, Review-3). 대기열의 앞면을 먼저 보이고, 카드를 눌러 뒷면(정답)을 연다.
export default function ReviewScreen() {
  const { deckId } = useLocalSearchParams<{ deckId: string }>();
  const deckIds = useMemo(() => parseDeckIds(deckId), [deckId]);
  const queue = useReviewQueue(deckIds);
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const empty = queue.kind === 'ready' && queue.cards.length === 0;
  const noticeKind = queue.kind === 'missing' || queue.kind === 'failed' ? queue.kind : null;
  // 접히는 동안에도 마지막 Notice를 그대로 보인다.
  const shownNotice = useHeldValue(noticeKind);

  // 복습할 카드가 없으면 덱 상세로(여러 덱이면 덱 목록으로) 보낸다. 복습 화면이 스택에 남지 않게 바꿔 끼운다.
  useEffect(() => {
    if (!empty) return;
    const [only, ...others] = deckIds;
    if (only !== undefined && others.length === 0) {
      router.replace({ pathname: '/deck/[id]', params: { id: only } });
    } else {
      router.replace('/');
    }
  }, [empty, deckIds]);

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg, paddingTop: insets.top }]}>
      {queue.kind === 'ready' && !empty ? (
        <ReviewFlow
          key={deckId}
          deckIds={deckIds}
          cards={queue.cards}
          insetBottom={insets.bottom}
        />
      ) : (
        <ReviewBar />
      )}
      {/* Notice는 높이를 열며 나타난다. 대기열이 다시 준비되면 접힌다. */}
      <Collapsible open={noticeKind !== null}>
        {shownNotice !== null ? (
          <View style={styles.notice}>
            <Notice
              tone={shownNotice === 'failed' ? 'danger' : 'info'}
              title={
                shownNotice === 'failed'
                  ? '복습을 불러오지 못했어요'
                  : '덱이 없거나 휴지통에 있어요'
              }
            />
          </View>
        ) : null}
      </Collapsible>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  notice: { padding: space[4] },
});

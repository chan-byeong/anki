import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { AccessibilityInfo, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CloseIcon, IconButton, Notice } from '@/components';
import { useDeckName } from '@/features/decks/use-deck-name';
import { useReviewQueue } from '@/features/review/use-review-queue';
import type { Card } from '@/storage/store';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, size, space } from '@/theme/tokens';

const close = () => (router.canGoBack() ? router.back() : router.replace('/'));

// 복습(Review-1, Review-3). 대기열의 앞면을 먼저 보이고, 카드를 눌러 뒷면(정답)을 연다.
// 평가와 다음 카드, 메모·발음 버튼, 이미지, 끝 상태는 이 화면에 더하지 않았다(STA-118 이후).
export default function ReviewScreen() {
  const { deckId } = useLocalSearchParams<{ deckId: string }>();
  const queue = useReviewQueue(deckId);
  const { colors, text } = useTheme();
  const insets = useSafeAreaInsets();
  const empty = queue.kind === 'ready' && queue.cards.length === 0;

  // 복습할 카드가 없는 덱은 덱 상세로 보낸다. 복습 화면이 스택에 남지 않게 바꿔 끼운다.
  useEffect(() => {
    if (empty) router.replace({ pathname: '/deck/[id]', params: { id: deckId } });
  }, [empty, deckId]);

  const first = queue.kind === 'ready' ? queue.cards[0] : undefined;

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg, paddingTop: insets.top }]}>
      <View style={styles.bar}>
        <IconButton icon={CloseIcon} label="복습 닫기" onPress={close} />
        {queue.kind === 'ready' && !empty ? (
          <Text style={[text('caption'), styles.remaining, { color: colors.muted }]}>
            {`${queue.cards.length}장 남음`}
          </Text>
        ) : null}
      </View>
      {first ? <ReviewCard card={first} insetBottom={insets.bottom} /> : null}
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

interface ReviewCardProps {
  card: Card;
  insetBottom: number;
}

function ReviewCard({ card, insetBottom }: ReviewCardProps) {
  const { colors, text } = useTheme();
  const deckName = useDeckName(card.deckId);
  const [revealed, setRevealed] = useState(false);
  const frontId = `review-front-${card.id}`;

  const reveal = () => {
    setRevealed(true);
    // 뒷면이 열린 것을 스크린 리더에 알린다. 눌린 버튼이 사라지므로 포커스 이동만으로는 알 수 없다.
    AccessibilityInfo.announceForAccessibility(`정답이 열렸어요. ${card.back}`);
  };

  const content = (
    <ScrollView testID="review-scroll" contentContainerStyle={styles.content}>
      <View accessible accessibilityLabel={`앞면 ${card.front}`}>
        <Text nativeID={frontId} style={[text('display', { weight: 'bold' }), styles.center]}>
          {card.front}
        </Text>
      </View>
      {/* 열리기 전부터 있는 라이브 영역이다. 내용이 들어오면 웹 스크린 리더가 읽는다(웹은 announceForAccessibility가 동작하지 않는다). */}
      <View testID="review-answer" aria-live="polite" style={revealed ? styles.answer : undefined}>
        {revealed ? (
          <>
            <View aria-hidden style={[styles.divider, { backgroundColor: colors.line }]} />
            <View accessible accessibilityLabel={`뒷면 ${card.back}`}>
              <Text style={[text('title', { weight: 'bold' }), styles.center]}>{card.back}</Text>
            </View>
          </>
        ) : null}
      </View>
    </ScrollView>
  );

  return (
    <>
      <View style={styles.main}>
        {/* 공개 전후로 같은 요소를 유지한다. 감싸는 요소가 바뀌면 스크롤 영역이 다시 만들어져 읽던 위치가 사라진다. */}
        <Pressable
          // 카드 전체가 버튼이다. 스크롤은 그대로 되고, 짧게 누르면 열린다.
          // 앞면은 버튼 이름에 덧붙이지 않고 값으로 읽혀서 이름은 "정답 확인"으로 고정된다.
          // 열린 뒤에는 버튼이 아니므로 안쪽 앞면·뒷면을 각각 읽는다.
          accessible={!revealed}
          accessibilityRole={revealed ? undefined : 'button'}
          accessibilityLabel={revealed ? undefined : '정답 확인'}
          accessibilityValue={revealed ? undefined : { text: `앞면 ${card.front}` }}
          // 웹은 accessibilityValue 객체를 DOM에 옮기지 않으므로 앞면 글자를 버튼의 설명으로 잇는다.
          aria-describedby={revealed ? undefined : frontId}
          disabled={revealed}
          onPress={reveal}
          style={[styles.card, { backgroundColor: colors.surface }]}
        >
          {content}
        </Pressable>
        <Text style={[text('caption'), styles.deck, { color: colors.muted }]} pointerEvents="none">
          {deckName}
        </Text>
      </View>
      <View style={[styles.footer, { paddingBottom: space[2] + insetBottom }]}>
        {revealed ? null : (
          <Text aria-hidden style={[text('caption'), { color: colors.muted }]}>
            카드를 눌러 정답 보기
          </Text>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  bar: {
    height: size.button,
    paddingHorizontal: size.edgeIcon,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  remaining: { paddingRight: space[3], fontVariant: ['tabular-nums'] },
  notice: { padding: space[4] },
  main: { flex: 1, minHeight: 0, paddingTop: space[2], paddingHorizontal: space[4] },
  card: { flex: 1, borderRadius: radius.lg, overflow: 'hidden' },
  // 캔버스의 덱 이름 자리(왼쪽 위). 긴 글이 스크롤돼도 가리지 않도록 본문 위쪽에 여백을 둔다.
  deck: { position: 'absolute', top: space[2] + space[3], left: space[4] + space[4] },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: space[4],
    paddingTop: space[5],
    paddingBottom: space[4],
  },
  answer: { marginTop: space[4], gap: space[4] },
  center: { textAlign: 'center' },
  divider: { alignSelf: 'center', width: 32, height: 1 },
  footer: {
    paddingTop: space[3],
    paddingHorizontal: space[4],
    minHeight: size.rating + space[3] + space[2],
    alignItems: 'center',
    justifyContent: 'center',
  },
});

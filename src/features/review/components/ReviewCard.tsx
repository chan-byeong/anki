import { useState } from 'react';
import { AccessibilityInfo, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useDeckName } from '@/features/decks/use-deck-name';
import { RatingButtons } from '@/features/review/components/RatingButtons';
import type { Card, Rating } from '@/storage/store';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, size, space } from '@/theme/tokens';

// 복습 중인 카드 한 장. 앞면을 먼저 보이고, 카드를 누르면 뒷면(정답)과 평가 버튼을 연다.
interface ReviewCardProps {
  card: Card;
  insetBottom: number;
  onRate: (rating: Rating) => void;
  ratingDisabled: boolean;
  pendingRating: Rating | null;
}

export function ReviewCard({
  card,
  insetBottom,
  onRate,
  ratingDisabled,
  pendingRating,
}: ReviewCardProps) {
  const { colors, text } = useTheme();
  const deckName = useDeckName(card.deckId);
  const [revealed, setRevealed] = useState(false);
  const frontId = `review-front-${card.id}`;

  const reveal = () => {
    setRevealed(true);
    // 뒷면이 열린 것을 스크린 리더에 알린다. 눌린 버튼이 사라지므로 포커스 이동만으로는 알 수 없다.
    AccessibilityInfo.announceForAccessibility(`정답이 열렸어요. ${card.back}`);
  };

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
          <ScrollView testID="review-scroll" contentContainerStyle={styles.content}>
            <View accessible accessibilityLabel={`앞면 ${card.front}`}>
              <Text nativeID={frontId} style={[text('display', { weight: 'bold' }), styles.center]}>
                {card.front}
              </Text>
            </View>
            {/* 열리기 전부터 있는 라이브 영역이다. 내용이 들어오면 웹 스크린 리더가 읽는다(웹은 announceForAccessibility가 동작하지 않는다). */}
            <View
              testID="review-answer"
              aria-live="polite"
              style={revealed ? styles.answer : undefined}
            >
              {revealed ? (
                <>
                  <View aria-hidden style={[styles.divider, { backgroundColor: colors.line }]} />
                  <View accessible accessibilityLabel={`뒷면 ${card.back}`}>
                    <Text style={[text('title', { weight: 'bold' }), styles.center]}>
                      {card.back}
                    </Text>
                  </View>
                </>
              ) : null}
            </View>
          </ScrollView>
        </Pressable>
        <Text style={[text('caption'), styles.deck, { color: colors.muted }]} pointerEvents="none">
          {deckName}
        </Text>
      </View>
      <View style={[styles.footer, { paddingBottom: space[2] + insetBottom }]}>
        {revealed ? (
          <RatingButtons onRate={onRate} disabled={ratingDisabled} pendingRating={pendingRating} />
        ) : (
          <Text aria-hidden style={[text('caption'), { color: colors.muted }]}>
            카드를 눌러 정답 보기
          </Text>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
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

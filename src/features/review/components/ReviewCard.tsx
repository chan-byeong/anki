import { useState } from 'react';
import { AccessibilityInfo, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { IconButton, MemoIcon } from '@/components';
import { useDeckName } from '@/features/decks/use-deck-name';
import { RatingButtons } from '@/features/review/components/RatingButtons';
import type { Card, Rating } from '@/storage/store';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, size, space } from '@/theme/tokens';

// 복습 중인 카드 한 장. 앞면을 먼저 보이고, 카드를 누르면 뒷면(정답)과 평가 버튼을 연다.
interface ReviewCardProps {
  card: Card;
  insetBottom: number;
  onRate: (rating: Rating, hintUsed: boolean) => void;
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
  // 메모를 한 번이라도 열면 힌트로 기록된다. 다시 닫아도 기록은 남는다.
  const [memoOpen, setMemoOpen] = useState(false);
  const [hintUsed, setHintUsed] = useState(false);
  const memoShown = card.memo !== null && memoOpen;
  // 캔버스(Review-1): 메모를 닫고 정답을 열기 전에는 아이콘 줄이 카드 위에 떠 있어 앞면이 카드 전체의 가운데에 온다.
  // 메모를 열거나 정답을 열면 흐름 안에 놓인다(Review-2, Review-3).
  const memoFloats = !revealed && !memoShown;
  const frontId = `review-front-${card.id}`;

  const reveal = () => {
    setRevealed(true);
    // 뒷면이 열린 것을 스크린 리더에 알린다. 눌린 버튼이 사라지므로 포커스 이동만으로는 알 수 없다.
    AccessibilityInfo.announceForAccessibility(`정답이 열렸어요. ${card.back}`);
  };

  const toggleMemo = () => {
    setMemoOpen((open) => !open);
    setHintUsed(true);
  };

  return (
    <>
      <View style={styles.main}>
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
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
            style={styles.front}
          >
            <ScrollView testID="review-scroll" contentContainerStyle={styles.content}>
              <View accessible accessibilityLabel={`앞면 ${card.front}`}>
                <Text
                  nativeID={frontId}
                  style={[text('display', { weight: 'bold' }), styles.center]}
                >
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
          {card.memo !== null ? (
            <View
              style={[styles.memoArea, memoFloats ? styles.memoFloating : null]}
              pointerEvents="box-none"
            >
              {memoShown ? (
                <View
                  role="region"
                  accessibilityLabel="메모"
                  style={[styles.memo, { backgroundColor: colors.bg }]}
                >
                  <Text style={text('body')}>{card.memo}</Text>
                  <Text style={[text('caption'), { color: colors.muted }]}>힌트로 기록됩니다</Text>
                </View>
              ) : null}
              <View style={styles.memoButton}>
                <IconButton
                  icon={MemoIcon}
                  tone="muted"
                  label={memoShown ? '메모 닫기' : '메모 열기'}
                  pressed={memoShown}
                  disabled={pendingRating !== null}
                  onPress={toggleMemo}
                />
              </View>
            </View>
          ) : null}
          <Text
            style={[text('caption'), styles.deck, { color: colors.muted }]}
            pointerEvents="none"
          >
            {deckName}
          </Text>
        </View>
      </View>
      <View style={[styles.footer, { paddingBottom: space[2] + insetBottom }]}>
        {revealed ? (
          <RatingButtons
            onRate={(rating) => onRate(rating, hintUsed)}
            disabled={ratingDisabled}
            pendingRating={pendingRating}
            hintUsed={hintUsed}
          />
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
  front: { flex: 1 },
  memoArea: { paddingHorizontal: space[2], paddingBottom: space[2], gap: space[2] },
  memo: { padding: space[3], borderRadius: radius.sm, gap: space[2] },
  // 캔버스는 손 설정(hand)에 따라 한쪽 모서리에 둔다. 설정이 생기기 전까지 오른쪽이다.
  memoFloating: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  memoButton: { alignSelf: 'flex-end', marginRight: space[4] },
  // 캔버스의 덱 이름 자리(왼쪽 위). 긴 글이 스크롤돼도 가리지 않도록 본문 위쪽에 여백을 둔다.
  deck: { position: 'absolute', top: space[3], left: space[4] },
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

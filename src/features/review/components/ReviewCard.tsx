import { useState } from 'react';
import {
  AccessibilityInfo,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { HintIcon, IconButton, MemoIcon } from '@/components';
import { useDeckName } from '@/features/decks/use-deck-name';
import { RatingButtons } from '@/features/review/components/RatingButtons';
import { useFrontAnchor } from '@/features/review/use-front-anchor';
import { useHand } from '@/features/settings/HandProvider';
import type { Card, Rating } from '@/storage/store';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, size, space } from '@/theme/tokens';

// 복습 중인 카드 한 장. 앞면을 먼저 보이고, 카드를 누르면 뒷면(정답)과 평가 버튼을 연다.

// 카드 높이 상한(세로 = 가로 × 3/2). 화면이 길어도 카드 아래쪽 메모·힌트 버튼이 엄지가 닿는 높이에 머문다(STA-152).
// 남는 높이는 카드와 평가 줄 사이 빈 곳이 된다.
const CARD_ASPECT = 3 / 2;
// 스크롤 영역의 위아래 기본 여백. 앞면은 이 여백을 뺀 높이의 가운데에 선다.
const CONTENT_TOP = space[5];
const CONTENT_BOTTOM = space[4];
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
  const { width } = useWindowDimensions();
  const cardMaxHeight = (width - space[4] * 2) * CARD_ASPECT;
  const anchor = useFrontAnchor(CONTENT_TOP + CONTENT_BOTTOM);
  // 겹쳐 뜬 메모·힌트 칸과 아이콘 줄의 높이. 그만큼 본문 아래 여백을 둬 가려진 내용도 스크롤로 볼 수 있다.
  const [extrasHeight, setExtrasHeight] = useState(0);
  const deckName = useDeckName(card.deckId);
  // 힌트·메모 버튼은 주로 쓰는 손 쪽 모서리에 모인다. 평가 버튼 순서는 손과 상관없다.
  const { hand } = useHand();
  const [revealed, setRevealed] = useState(false);
  // 정답을 열기 전에 힌트를 열면 힌트를 쓴 것으로 기록되고, 다시 닫아도 남는다.
  // 메모는 언제 열어도 기록하지 않는다(ADR 0017).
  const [hintOpen, setHintOpen] = useState(false);
  const [memoOpen, setMemoOpen] = useState(false);
  const [hintUsed, setHintUsed] = useState(false);
  const hintShown = card.hint !== null && hintOpen;
  const memoShown = card.memo !== null && memoOpen;
  const frontId = `review-front-${card.id}`;

  const reveal = () => {
    setRevealed(true);
    // 뒷면이 열린 것을 스크린 리더에 알린다. 눌린 버튼이 사라지므로 포커스 이동만으로는 알 수 없다.
    AccessibilityInfo.announceForAccessibility(`정답이 열렸어요. ${card.back}`);
  };

  const toggleHint = () => {
    setHintOpen((open) => !open);
    if (!revealed) setHintUsed(true);
  };

  return (
    <>
      <View style={styles.main}>
        <View style={[styles.card, { maxHeight: cardMaxHeight, backgroundColor: colors.surface }]}>
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
            <ScrollView
              testID="review-scroll"
              onLayout={anchor.onViewportLayout}
              contentContainerStyle={[
                styles.content,
                // 재기 전에는 가운데 정렬, 잰 뒤에는 그 자리를 위 여백으로 굳힌다. 정답이 붙거나 칸이 열려도 앞면이 움직이지 않는다.
                anchor.offset === null
                  ? styles.contentCentered
                  : { paddingBottom: CONTENT_BOTTOM + extrasHeight },
              ]}
            >
              <View
                accessible
                accessibilityLabel={`앞면 ${card.front}`}
                onLayout={anchor.onFrontLayout}
                style={anchor.offset === null ? undefined : { marginTop: anchor.offset }}
              >
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
          {card.hint !== null || card.memo !== null ? (
            <View
              testID="review-extras"
              style={styles.extras}
              pointerEvents="box-none"
              onLayout={(event) => setExtrasHeight(event.nativeEvent.layout.height)}
            >
              {/* 칸은 카드 아래쪽에 겹쳐 뜬다. 흐름 안에 두면 열 때마다 앞면이 위로 밀린다(STA-152).
                  캔버스에는 메모 칸(Review-2)만 있어 힌트 칸도 같은 모양으로 둔다. */}
              {hintShown ? (
                <View
                  role="region"
                  accessibilityLabel="힌트"
                  style={[styles.panel, { backgroundColor: colors.bg }]}
                >
                  <Text style={text('body')}>{card.hint}</Text>
                  {hintUsed ? (
                    <Text style={[text('caption'), { color: colors.muted }]}>
                      힌트로 기록됩니다
                    </Text>
                  ) : null}
                </View>
              ) : null}
              {memoShown ? (
                <View
                  role="region"
                  accessibilityLabel="메모"
                  style={[styles.panel, { backgroundColor: colors.bg }]}
                >
                  <Text style={text('body')}>{card.memo}</Text>
                </View>
              ) : null}
              <View
                testID="review-extra-buttons"
                style={[styles.extraButtons, hand === 'left' ? styles.leftHand : styles.rightHand]}
              >
                {card.hint !== null ? (
                  <IconButton
                    icon={HintIcon}
                    tone="muted"
                    label={hintShown ? '힌트 닫기' : '힌트 열기'}
                    pressed={hintShown}
                    // 다시 시도 중에는 힌트 상태가 바뀌지 않게 막는다.
                    disabled={pendingRating !== null}
                    onPress={toggleHint}
                  />
                ) : null}
                {card.memo !== null ? (
                  <IconButton
                    icon={MemoIcon}
                    tone="muted"
                    label={memoShown ? '메모 닫기' : '메모 열기'}
                    pressed={memoShown}
                    onPress={() => setMemoOpen((open) => !open)}
                  />
                ) : null}
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
  extras: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: space[2],
    paddingBottom: space[2],
    gap: space[2],
  },
  panel: { padding: space[3], borderRadius: radius.sm, gap: space[2] },
  // 캔버스의 아이콘 세로 줄(간격 space-3)에 힌트 버튼을 메모 버튼 위에 더한다.
  // 캔버스(Review-1~3의 hand)는 줄을 손 쪽 모서리에 두고 메모 버튼만 그쪽으로 space-4 띄운다.
  // 그 아래 붙는 발음 버튼이 아직 없어 줄 전체에 띄웠다. 발음 버튼을 더할 때 이 여백을 메모·힌트 버튼으로 옮긴다.
  extraButtons: { gap: space[3] },
  rightHand: { alignSelf: 'flex-end', marginRight: space[4] },
  leftHand: { alignSelf: 'flex-start', marginLeft: space[4] },
  // 캔버스의 덱 이름 자리(왼쪽 위). 긴 글이 스크롤돼도 가리지 않도록 본문 위쪽에 여백을 둔다.
  deck: { position: 'absolute', top: space[3], left: space[4] },
  content: {
    flexGrow: 1,
    paddingHorizontal: space[4],
    paddingTop: CONTENT_TOP,
    paddingBottom: CONTENT_BOTTOM,
  },
  contentCentered: { justifyContent: 'center' },
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

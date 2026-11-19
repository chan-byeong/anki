import { useEffect, useState } from 'react';
import {
  AccessibilityInfo,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';

import {
  Collapsible,
  FadeSwap,
  HintIcon,
  IconButton,
  MemoIcon,
  RatingMark,
  SpeakerIcon,
} from '@/components';
import { languageName } from '@/features/decks/languages';
import { useDeckLanguage } from '@/features/decks/use-deck-language';
import { useDeckName } from '@/features/decks/use-deck-name';
import { CardPile } from '@/features/review/components/CardPile';
import { RatingButtons } from '@/features/review/components/RatingButtons';
import { isJapanese, pronunciationTarget } from '@/features/review/pronunciation-target';
import { useCardFlip } from '@/features/review/use-card-flip';
import { useFrontAnchor } from '@/features/review/use-front-anchor';
import { useSwipeRate } from '@/features/review/use-swipe-rate';
import { useVoiceStatus } from '@/features/review/use-voice-status';
import { useHand } from '@/features/settings/HandProvider';
import type { Card, Rating } from '@/storage/store';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, size, space } from '@/theme/tokens';
import { haptic } from '@/utils/haptics';
import { speech } from '@/utils/speech';

// 복습 중인 카드 한 장. 앞면을 먼저 보이고, 카드를 누르면 뒷면(정답)과 평가 버튼을 연다.

// 카드 높이 상한(세로 = 가로 × 3/2). 화면이 길어도 카드 아래쪽 메모·힌트 버튼이 엄지가 닿는 높이에 머문다(STA-152).
// 남는 높이는 카드와 평가 줄 사이 빈 곳이 된다.
const CARD_ASPECT = 3 / 2;
// 스크롤 영역의 위아래 기본 여백. 앞면은 이 여백을 뺀 높이의 가운데에 선다.
const CONTENT_TOP = space[5];
const CONTENT_BOTTOM = space[4];
interface ReviewCardProps {
  card: Card;
  // 남은 카드 수(이 카드 포함). 카드 밑에 깔리는 더미의 겹 수를 정한다.
  remaining: number;
  // 평가를 눌러 이 카드가 나가는 중이다.
  leaving: boolean;
  // 앞 카드에서 넘어온 카드다. 더미의 첫 겹에서 올라오며 들어온다.
  rise: boolean;
  insetBottom: number;
  onRate: (rating: Rating, hintUsed: boolean) => void;
  ratingDisabled: boolean;
  pendingRating: Rating | null;
  // 이 카드 언어의 음성이 기기에 없을 때, 발음 버튼을 눌러 읽기를 시작했을 때(STA-128).
  onVoiceMissing: (language: string) => void;
  onSpoke: () => void;
}

export function ReviewCard({
  card,
  remaining,
  leaving,
  rise,
  insetBottom,
  onRate,
  ratingDisabled,
  pendingRating,
  onVoiceMissing,
  onSpoke,
}: ReviewCardProps) {
  const { colors, text } = useTheme();
  const { width } = useWindowDimensions();
  const cardMaxHeight = (width - space[4] * 2) * CARD_ASPECT;
  const anchor = useFrontAnchor(CONTENT_TOP + CONTENT_BOTTOM);
  const flipStyle = useCardFlip({ leaving, rise });
  // 겹쳐 뜬 메모·힌트 칸과 아이콘 줄의 높이. 그만큼 본문 아래 여백을 둬 가려진 내용도 스크롤로 볼 수 있다.
  const [extrasHeight, setExtrasHeight] = useState(0);
  const deckName = useDeckName(card.deckId);
  // 발음 버튼은 덱에 발음 언어가 있을 때만 나온다. 누를 때만 읽고 저절로 읽지 않는다(STA-127).
  const language = useDeckLanguage(card.deckId);
  const target = pronunciationTarget(card, language);
  // lang·accessibilityLanguage에는 없음을 null이 아니라 undefined로 넘긴다.
  const languageAttribute = language ?? undefined;
  // 기기에 그 언어 음성이 없으면 발음 버튼을 흐리게 하고 이유를 알린다. 확인 중(null)에는 켜 둔다.
  const voiceMissing = useVoiceStatus(target?.language ?? null) === 'missing';
  const missingLanguage = voiceMissing && target !== null ? target.language : null;
  useEffect(() => {
    if (missingLanguage !== null) onVoiceMissing(missingLanguage);
  }, [missingLanguage, onVoiceMissing]);
  // 카드가 넘어가거나 화면을 떠나면 읽던 소리를 멈춘다. 카드마다 새로 만들어지므로 한 번만 건다.
  useEffect(() => speech.stop, []);
  // 힌트·메모 버튼은 주로 쓰는 손 쪽 모서리에 모인다. 평가 버튼 순서는 손과 상관없다.
  const { hand } = useHand();
  const handStyle =
    hand === 'left'
      ? { corner: styles.leftHand, hintMemo: styles.hintMemoLeft }
      : { corner: styles.rightHand, hintMemo: styles.hintMemoRight };
  const [revealed, setRevealed] = useState(false);
  // 정답을 열기 전에 힌트를 열면 힌트를 쓴 것으로 기록되고, 다시 닫아도 남는다.
  // 메모는 언제 열어도 기록하지 않는다(ADR 0017).
  const [hintOpen, setHintOpen] = useState(false);
  const [memoOpen, setMemoOpen] = useState(false);
  const [hintUsed, setHintUsed] = useState(false);
  const hintShown = card.hint !== null && hintOpen;
  const memoShown = card.memo !== null && memoOpen;
  const frontId = `review-front-${card.id}`;

  // 버튼으로 누르든 밀어서 고르든 같은 평가다. 평가를 고르는 순간 햅틱이 한 번 울린다.
  const rate = (rating: Rating) => {
    haptic.rate();
    onRate(rating, hintUsed);
  };
  // 밀어서 평가(오른쪽 앎, 왼쪽 모름)는 평가 버튼이 보일 때만 된다. 버튼은 그대로 있어 같은 일을 할 수 있다.
  const swipe = useSwipeRate({ enabled: revealed && !ratingDisabled, onRate: rate, leaving });

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
        <View style={[styles.pile, { maxHeight: cardMaxHeight }]}>
          <CardPile remaining={remaining} />
          <GestureDetector gesture={swipe.gesture}>
            <Animated.View style={[styles.swipe, swipe.cardStyle]}>
              <Animated.View
                testID="review-card"
                style={[styles.card, { backgroundColor: colors.surface }, flipStyle]}
              >
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
                      // 스크린 리더(iOS VoiceOver)가 "앞면 …"의 글을 덱의 언어로 읽게 한다.
                      accessibilityLanguage={languageAttribute}
                      onLayout={anchor.onFrontLayout}
                      style={anchor.offset === null ? undefined : { marginTop: anchor.offset }}
                    >
                      <Text
                        nativeID={frontId}
                        // 앞면은 덱의 발음 언어로 적힌 글이다. 웹에서는 lang으로 언어를 밝히고(RN 네이티브 Text에는 이 속성이 없다), 일본어는 JP 글리프 글꼴을 쓴다.
                        lang={languageAttribute}
                        style={[
                          text('display', { weight: 'bold', ja: isJapanese(language) }),
                          styles.center,
                        ]}
                      >
                        {card.front}
                      </Text>
                    </View>
                    {/* 열리기 전부터 있는 라이브 영역이다. 내용이 들어오면 웹 스크린 리더가 읽는다(웹은 announceForAccessibility가 동작하지 않는다). */}
                    <View testID="review-answer" aria-live="polite">
                      {/* 정답 공개: 구분선과 뒷면이 높이를 열며 나타난다(240ms easeOut). 앞면은 위 여백으로 굳혀 두어 움직이지 않는다. */}
                      <Collapsible open={revealed} testID="review-back">
                        <View style={styles.answer}>
                          <View
                            aria-hidden
                            style={[styles.divider, { backgroundColor: colors.line }]}
                          />
                          <View accessible accessibilityLabel={`뒷면 ${card.back}`}>
                            <Text style={[text('title', { weight: 'bold' }), styles.center]}>
                              {card.back}
                            </Text>
                          </View>
                        </View>
                      </Collapsible>
                    </View>
                  </ScrollView>
                </Pressable>
                {card.hint !== null || card.memo !== null || target !== null ? (
                  <View
                    testID="review-extras"
                    style={styles.extras}
                    pointerEvents="box-none"
                    onLayout={(event) => setExtrasHeight(event.nativeEvent.layout.height)}
                  >
                    {/* 칸은 카드 아래쪽에 겹쳐 뜬다. 흐름 안에 두면 열 때마다 앞면이 위로 밀린다(STA-152).
                  캔버스에는 메모 칸(Review-2)만 있어 힌트 칸도 같은 모양으로 둔다.
                  칸은 아이콘 바로 위에서 높이를 열며 나타나고, 다시 누르면 접힌다. */}
                    <Collapsible open={hintShown} testID="review-hint">
                      <View style={styles.panelSlot}>
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
                      </View>
                    </Collapsible>
                    <Collapsible open={memoShown} testID="review-memo">
                      <View style={styles.panelSlot}>
                        <View
                          role="region"
                          accessibilityLabel="메모"
                          style={[styles.panel, { backgroundColor: colors.bg }]}
                        >
                          <Text style={text('body')}>{card.memo}</Text>
                        </View>
                      </View>
                    </Collapsible>
                    <View
                      testID="review-extra-buttons"
                      style={[styles.extraButtons, handStyle.corner]}
                    >
                      {card.hint !== null || card.memo !== null ? (
                        // 캔버스에서 손 쪽으로 space-4 띄우는 것은 힌트·메모 버튼뿐이다. 발음 버튼은 모서리에 붙는다.
                        <View
                          testID="review-hint-memo-buttons"
                          style={[styles.hintMemoButtons, handStyle.hintMemo]}
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
                      ) : null}
                      {target !== null ? (
                        <IconButton
                          icon={SpeakerIcon}
                          tone="muted"
                          label={
                            voiceMissing
                              ? `발음 재생 (이 기기에 ${languageName(target.language)} 음성 없음)`
                              : '발음 재생'
                          }
                          disabled={voiceMissing}
                          onPress={() => {
                            speech.speak(target.text, target.language);
                            onSpoke();
                          }}
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
              </Animated.View>
            </Animated.View>
          </GestureDetector>
          {/* 미는 만큼 그쪽 표시가 진해진다. 카드를 따라가지 않고 제자리에서 나타난다. */}
          <View aria-hidden pointerEvents="none" style={styles.swipeMarks}>
            <Animated.View testID="review-swipe-forgot" style={swipe.forgotStyle}>
              <RatingMark kind="forgot" size={size.ratingMark} />
            </Animated.View>
            <Animated.View testID="review-swipe-knew" style={swipe.knewStyle}>
              <RatingMark kind="knew" size={size.ratingMark} />
            </Animated.View>
          </View>
        </View>
      </View>
      <View style={[styles.footer, { paddingBottom: space[2] + insetBottom }]}>
        {/* 정답을 열면 안내 글자가 사라지고 평가 버튼이 같은 자리에 페이드로 들어온다. */}
        <FadeSwap swapKey={revealed ? 'rating' : 'guide'} style={styles.footerContent}>
          {revealed ? (
            <RatingButtons
              onRate={rate}
              disabled={ratingDisabled}
              pendingRating={pendingRating}
              armed={swipe.armed}
            />
          ) : (
            <Text aria-hidden style={[text('caption'), { color: colors.muted }]}>
              카드를 눌러 정답 보기
            </Text>
          )}
        </FadeSwap>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  main: { flex: 1, minHeight: 0, paddingTop: space[2], paddingHorizontal: space[4] },
  // 카드와 같은 크기의 틀. 더미의 겹이 이 틀 아래로 비쳐 나온다.
  pile: { flex: 1 },
  swipe: { flex: 1 },
  swipeMarks: {
    ...StyleSheet.absoluteFill,
    paddingHorizontal: space[4],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  card: { flex: 1, borderRadius: radius.lg, overflow: 'hidden' },
  front: { flex: 1 },
  extras: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: space[2],
    paddingBottom: space[2],
  },
  // 칸 아래 간격(space-2)을 열리는 높이 안에 둔다. 부모 gap으로 두면 접힘이 끝나는 순간 간격만큼 튄다.
  panelSlot: { paddingBottom: space[2] },
  panel: { padding: space[3], borderRadius: radius.sm, gap: space[2] },
  // 캔버스의 아이콘 세로 줄(간격 space-3). 줄은 손 쪽 모서리에 있고, 맨 아래가 발음 버튼이다.
  // 힌트·메모 버튼 묶음만 그쪽으로 space-4 띄운다(Review-1~3, 7).
  extraButtons: { gap: space[3] },
  rightHand: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  leftHand: { alignSelf: 'flex-start', alignItems: 'flex-start' },
  hintMemoButtons: { gap: space[3] },
  hintMemoRight: { marginRight: space[4] },
  hintMemoLeft: { marginLeft: space[4] },
  // 캔버스의 덱 이름 자리(왼쪽 위). 긴 글이 스크롤돼도 가리지 않도록 본문 위쪽에 여백을 둔다.
  deck: { position: 'absolute', top: space[3], left: space[4] },
  content: {
    flexGrow: 1,
    paddingHorizontal: space[4],
    paddingTop: CONTENT_TOP,
    paddingBottom: CONTENT_BOTTOM,
  },
  contentCentered: { justifyContent: 'center' },
  // 위 여백도 열리는 높이에 넣는다. 바깥 여백으로 두면 열기 전부터 자리가 생긴다.
  answer: { paddingTop: space[4], gap: space[4] },
  center: { textAlign: 'center' },
  divider: { alignSelf: 'center', width: 32, height: 1 },
  footer: {
    paddingTop: space[3],
    paddingHorizontal: space[4],
    minHeight: size.rating + space[3] + space[2],
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerContent: { alignSelf: 'stretch', alignItems: 'center' },
});

import { router, useLocalSearchParams } from 'expo-router';
import * as Crypto from 'expo-crypto';
import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CloseIcon, IconButton, Notice, RatingMark } from '@/components';
import { useDeckName } from '@/features/decks/use-deck-name';
import type { ReviewScreenInput } from '@/features/review/review-screen-input';
import { useReviewQueue } from '@/features/review/use-review-queue';
import type { Card, RateInput, Rating, Review } from '@/storage/store';
import { useStore } from '@/storage/StoreProvider';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, size, space } from '@/theme/tokens';

const close = () => (router.canGoBack() ? router.back() : router.replace('/'));

const RATINGS = [
  { kind: 'forgot', label: '모름', rating: 'dont' },
  { kind: 'unsure', label: '헷갈림', rating: 'unsure' },
  { kind: 'knew', label: '앎', rating: 'know' },
] as const;

// 복습(Review-1, Review-3). 대기열의 앞면을 먼저 보이고, 카드를 눌러 뒷면(정답)을 연다.
export default function ReviewScreen(input: ReviewScreenInput = {}) {
  const { deckId } = useLocalSearchParams<{ deckId: string }>();
  const queue = useReviewQueue(deckId);
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const empty = queue.kind === 'ready' && queue.cards.length === 0;

  // 복습할 카드가 없는 덱은 덱 상세로 보낸다. 복습 화면이 스택에 남지 않게 바꿔 끼운다.
  useEffect(() => {
    if (empty) router.replace({ pathname: '/deck/[id]', params: { id: deckId } });
  }, [empty, deckId]);

  const first = queue.kind === 'ready' ? queue.cards[0] : undefined;

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg, paddingTop: insets.top }]}>
      {first && queue.kind === 'ready' ? (
        <ReviewSession
          key={deckId}
          {...input}
          first={first}
          initialRemaining={queue.cards.length}
          insetBottom={insets.bottom}
        />
      ) : (
        <View style={styles.bar}>
          <IconButton icon={CloseIcon} label="복습 닫기" onPress={close} />
        </View>
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

interface ReviewSessionProps extends ReviewScreenInput {
  first: Card;
  initialRemaining: number;
  insetBottom: number;
}

function ReviewSession({
  first,
  initialRemaining,
  insetBottom,
  advanceAfterRating,
}: ReviewSessionProps) {
  const store = useStore();
  const { colors, text } = useTheme();
  const [session, setSession] = useState<{
    card: Card | null;
    remaining: number;
    ratings: Rating[];
  }>(() => ({ card: first, remaining: initialRemaining, ratings: [] }));
  const [saving, setSaving] = useState(false);
  const [pendingRating, setPendingRating] = useState<Rating | null>(null);
  const busy = useRef(false);
  const request = useRef<{ input: RateInput; review?: Review } | null>(null);

  const rate = async (rating: Rating) => {
    if (!advanceAfterRating || !session.card || busy.current) return;
    if (request.current && request.current.input.rating !== rating) return;
    busy.current = true;
    setSaving(true);
    setPendingRating(rating);
    try {
      request.current ??= { input: { id: Crypto.randomUUID(), rating, hintUsed: false } };
      const attempt = request.current;
      attempt.review ??= await store.rateCard(session.card.id, attempt.input);
      const next = await advanceAfterRating(attempt.review);
      const recordedRating = attempt.review.rating;
      setSession((current) => ({ ...next, ratings: [...current.ratings, recordedRating] }));
      request.current = null;
      setPendingRating(null);
    } catch {
      // 실패한 요청은 같은 평가 ID로 다시 시도한다. 저장 뒤 전환만 실패했다면 저장을 반복하지 않는다.
      // 실패 안내 문구는 브리프에 없어 추가하지 않는다.
    } finally {
      busy.current = false;
      setSaving(false);
    }
  };

  if (!session.card) return null;

  return (
    <>
      <View style={styles.bar}>
        <IconButton icon={CloseIcon} label="복습 닫기" onPress={close} />
        <Text style={[text('caption'), styles.remaining, { color: colors.muted }]}>
          {`${session.remaining}장 남음`}
        </Text>
      </View>
      <ReviewCard
        // 같은 카드가 재등장해도 새 앞면으로 시작한다. 순서와 남은 수는 주입된 API의 결과만 쓴다.
        key={session.ratings.length}
        card={session.card}
        insetBottom={insetBottom}
        onRate={rate}
        ratingDisabled={!advanceAfterRating || saving}
        pendingRating={pendingRating}
      />
    </>
  );
}

interface ReviewCardProps {
  card: Card;
  insetBottom: number;
  onRate: (rating: Rating) => void;
  ratingDisabled: boolean;
  pendingRating: Rating | null;
}

function ReviewCard({ card, insetBottom, onRate, ratingDisabled, pendingRating }: ReviewCardProps) {
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
        {revealed ? (
          <View role="group" accessibilityLabel="평가" style={styles.ratings}>
            {RATINGS.map(({ kind, label, rating }) => {
              const disabled =
                ratingDisabled || (pendingRating !== null && pendingRating !== rating);
              return (
                <Pressable
                  key={kind}
                  accessibilityRole="button"
                  accessibilityLabel={label}
                  accessibilityState={{ disabled }}
                  disabled={disabled}
                  onPress={() => onRate(rating)}
                  style={[styles.rating, { backgroundColor: colors.surface }]}
                >
                  <View aria-hidden>
                    <RatingMark kind={kind} size={size.ratingMark} />
                  </View>
                </Pressable>
              );
            })}
          </View>
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
  ratings: { flexDirection: 'row', gap: space[2], alignSelf: 'stretch' },
  rating: {
    flex: 1,
    minHeight: size.rating,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

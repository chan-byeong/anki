import * as Crypto from 'expo-crypto';
import { useRef, useState } from 'react';

import { createNextCardAfterRating } from '@/features/review/next-card-after-rating';
import type { Card, RateInput, Rating, Review } from '@/storage/store';
import { useStore } from '@/storage/StoreProvider';

interface ReviewProgress {
  card: Card | null;
  remaining: number;
  ratings: Rating[];
}

interface UseReviewProgress {
  progress: ReviewProgress;
  saving: boolean;
  pendingRating: Rating | null;
  rate: (rating: Rating, hintUsed: boolean) => Promise<void>;
}

// 한 번의 복습 진행 상태. 평가를 저장하고 다음 카드로 넘어가며, 지금까지의 평가를 모은다.
export function useReviewProgress(cards: Card[]): UseReviewProgress {
  const store = useStore();
  // 복습을 시작할 때 읽은 대기열로 전환을 만든다. 순서 상태는 이 복습 안에만 있다(ADR 0016).
  const [nextCardAfterRating] = useState(() => createNextCardAfterRating(store, cards));
  const [progress, setProgress] = useState<ReviewProgress>(() => ({
    card: cards[0] ?? null,
    remaining: cards.length,
    ratings: [],
  }));
  const [saving, setSaving] = useState(false);
  const [pendingRating, setPendingRating] = useState<Rating | null>(null);
  const busy = useRef(false);
  const request = useRef<{ input: RateInput; review?: Review } | null>(null);

  const rate = async (rating: Rating, hintUsed: boolean) => {
    if (!progress.card || busy.current) return;
    if (request.current && request.current.input.rating !== rating) return;
    busy.current = true;
    setSaving(true);
    setPendingRating(rating);
    try {
      request.current ??= { input: { id: Crypto.randomUUID(), rating, hintUsed } };
      const attempt = request.current;
      attempt.review ??= await store.rateCard(progress.card.id, attempt.input);
      const next = await nextCardAfterRating(attempt.review);
      const recordedRating = attempt.review.rating;
      setProgress((current) => ({ ...next, ratings: [...current.ratings, recordedRating] }));
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

  return { progress, saving, pendingRating, rate };
}

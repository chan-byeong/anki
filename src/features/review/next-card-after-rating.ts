import type { Card, Review, Store } from '@/storage/store';

import { isInQueue } from './is-in-queue';
import { nextQueue } from './next-queue';

// 평가 뒤의 전환. 화면이 평가를 저장한 직후 부르고, 다음 카드와 남은 카드를 돌려받는다.
type NextCardAfterRating = (review: Review) => Promise<{ card: Card | null; remaining: number }>;

const FIRST = 0;

export const createNextCardAfterRating: (store: Store, cards: Card[]) => NextCardAfterRating = (
  store,
  cards,
) => {
  let queue = [...cards];
  let prev: { reviewId: string; result: { card: Card | null; remaining: number } } | null = null;

  return async (review: Review) => {
    if (prev !== null && review.id === prev.reviewId) return prev.result;
    if (review.cardId !== queue[FIRST]?.id) throw new Error('맨 앞의 카드에 대한 평가가 아닙니다.');

    const history = await store.listReviewHistory(review.cardId);
    const stays = isInQueue(history, review.studyDay);
    const next = nextQueue(queue, stays);
    const result = { card: next.card, remaining: next.remaining };

    prev = { reviewId: review.id, result };
    queue = next.queue;

    return result;
  };
};

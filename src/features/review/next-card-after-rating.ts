import type { Card, Review, Store } from '@/storage/store';
import type { NextCardAfterRating } from './review-screen-input';

import { isInQueue } from './is-in-queue';
import { nextQueue } from './next-queue';

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

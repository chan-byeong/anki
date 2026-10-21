import type { Card, Store } from '@/storage/store';
import { isInQueue } from './is-in-queue';
/**
 * 덱의 오늘 대기열 카드를 만든 순서대로. Store.listCardsWithHistory로 읽고 isInQueue로 거른다.
 * 덱이 없거나 휴지통에 있으면 Store가 던진 오류를 그대로 던진다. today는 학습일이다.
 */
export const listQueue: (store: Store, deckId: string, today: number) => Promise<Card[]> = async (
  store,
  deckId,
  today,
) => {
  return (await store.listCardsWithHistory(deckId))
    .filter((row) => isInQueue(row.history, today))
    .map((row) => row.card);
};

/** 살아 있는 덱마다 오늘 대기열에 나오는 카드 수. 카드가 없는 덱은 0이고 휴지통의 덱은 빠진다. */
export const countQueue: (store: Store, today: number) => Promise<Record<string, number>> = async (
  store,
  today,
) => {
  const counts: Record<string, number> = {};
  for (const deck of await store.listDecks()) {
    counts[deck.id] = (await listQueue(store, deck.id, today)).length;
  }
  return counts;
};

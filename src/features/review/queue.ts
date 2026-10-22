import type { Card, Store } from '@/storage/store';
import { isInQueue } from './is-in-queue';
import { scheduleCard } from './schedule-card';
/** 난수로 섞은 사본. random은 [0, 1)을 돌려주는 함수다. */
const shuffled = <T>(items: T[], random: () => number): T[] => {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

/**
 * 선택한 덱들의 오늘 대기열 카드를 하나로 합친 목록. Store.listCardsWithHistory로 읽고 isInQueue로 거른다.
 * 복습일이 오래된 카드가 먼저, 이력이 없는 신규 카드가 그 뒤에 온다. 같은 복습일끼리와 신규 카드끼리는 random으로 섞는다.
 * 덱이 하나라도 없거나 휴지통에 있으면 Store가 던진 오류를 그대로 던진다. today는 학습일이다.
 */
export const listQueueOf: (
  store: Store,
  deckIds: string[],
  today: number,
  random?: () => number,
) => Promise<Card[]> = async (store, deckIds, today, random = Math.random) => {
  const rows = [];
  for (const deckId of deckIds) {
    rows.push(...(await store.listCardsWithHistory(deckId)));
  }
  // 섞은 뒤 안정 정렬해서 같은 키의 순서만 난수가 정한다. 신규 카드는 키가 가장 크다.
  return shuffled(
    rows.filter((row) => isInQueue(row.history, today)),
    random,
  )
    .map((row) => ({ card: row.card, dueDay: scheduleCard(row.history)?.dueDay ?? Infinity }))
    .sort((a, b) => (a.dueDay === b.dueDay ? 0 : a.dueDay < b.dueDay ? -1 : 1))
    .map(({ card }) => card);
};

/** 한 덱의 오늘 대기열 카드. */
export const listQueue: (
  store: Store,
  deckId: string,
  today: number,
  random?: () => number,
) => Promise<Card[]> = (store, deckId, today, random) =>
  listQueueOf(store, [deckId], today, random);

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

/**
 * 덱(여럿이면 합쳐서)에서 복습일이 정확히 studyDay인 카드 수(복습 끝 화면의 "내일 N장"). 신규 카드와 밀린 카드는 세지 않는다.
 * 덱이 없거나 휴지통에 있으면 Store가 던진 오류를 그대로 던진다.
 */
export const countDueOn: (
  store: Store,
  deckIds: string | string[],
  studyDay: number,
) => Promise<number> = async (store, deckIds, studyDay) => {
  let count = 0;
  for (const deckId of Array.isArray(deckIds) ? deckIds : [deckIds]) {
    count += (await store.listCardsWithHistory(deckId)).filter(
      (row) => scheduleCard(row.history)?.dueDay === studyDay,
    ).length;
  }
  return count;
};

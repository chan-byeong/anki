import type { Card } from '@/storage/store';

type NextQueueInfo = {
  queue: Card[];
  card: Card | null;
  remaining: number;
};

const MIN_GAP = 3;
const MAX_GAP = 10;

// 다시 나올 카드는 다른 카드 3~10장 뒤에 둔다. 남은 카드가 그보다 적으면 가능한 한 뒤인 맨 뒤다.
// random은 [0, 1)을 돌려주는 함수다.
export const nextQueue: (queue: Card[], stays: boolean, random?: () => number) => NextQueueInfo = (
  queue,
  stays,
  random = Math.random,
) => {
  const [reviewed, ...rest] = queue;

  if (reviewed === undefined) return { queue: [], card: null, remaining: 0 };

  const gap = Math.min(rest.length, MIN_GAP + Math.floor(random() * (MAX_GAP - MIN_GAP + 1)));
  const after = stays ? [...rest.slice(0, gap), reviewed, ...rest.slice(gap)] : rest;

  const nextCard = after[0] ?? null;

  return { queue: after, card: nextCard, remaining: after.length };
};

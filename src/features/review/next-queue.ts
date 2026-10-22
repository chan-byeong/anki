import type { Card } from '@/storage/store';

export type NextQueueInfo = {
  queue: Card[];
  card: Card | null;
  remaining: number;
};

export const nextQueue: (queue: Card[], stays: boolean) => NextQueueInfo = (queue, stays) => {
  const [reviewed, ...rest] = queue;

  if (reviewed === undefined) return { queue: [], card: null, remaining: 0 };

  const after = stays ? [...rest, reviewed] : rest;

  const nextCard = after[0] ?? null;

  return { queue: after, card: nextCard, remaining: after.length };
};

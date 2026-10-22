import { useEffect, useState } from 'react';

import { StoreError, type Card } from '@/storage/store';
import { useStore } from '@/storage/StoreProvider';
import { studyDayOf } from '@/utils/study-day';

import { listQueue } from './queue';

export type ReviewQueueState =
  { kind: 'loading' } | { kind: 'ready'; cards: Card[] } | { kind: 'missing' } | { kind: 'failed' };

// 복습을 시작할 때의 대기열. 한 번만 읽어서 복습 도중 카드 순서가 바뀌지 않게 한다(ADR 0003).
export function useReviewQueue(deckId: string): ReviewQueueState {
  const store = useStore();
  const [result, setResult] = useState<{ deckId: string; state: ReviewQueueState } | null>(null);

  useEffect(() => {
    let active = true;
    const finish = (state: ReviewQueueState) => {
      if (active) setResult({ deckId, state });
    };
    listQueue(store, deckId, studyDayOf(Date.now())).then(
      (cards) => finish({ kind: 'ready', cards }),
      (error: unknown) =>
        finish({
          kind: error instanceof StoreError && error.code !== 'invalid' ? 'missing' : 'failed',
        }),
    );
    return () => {
      active = false;
    };
  }, [store, deckId]);

  return result?.deckId === deckId ? result.state : { kind: 'loading' };
}

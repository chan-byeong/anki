import { useEffect, useState } from 'react';

import { StoreError, type Card } from '@/storage/store';
import { useStore } from '@/storage/StoreProvider';
import { studyDayOf } from '@/utils/study-day';

import { listReviewCardsOf } from './queue';

export type ReviewQueueState =
  { kind: 'loading' } | { kind: 'ready'; cards: Card[] } | { kind: 'missing' } | { kind: 'failed' };

// deckIds는 복습할 덱들이다(여러 덱 선택이면 둘 이상). 호출하는 쪽이 같은 덱들에는 같은 배열을 넘긴다.
// 복습을 시작할 때의 카드. 오늘 대기열이 빈 덱은 모든 카드를 쓴다(listReviewCardsOf).
// 한 번만 읽어서 복습 도중 카드 순서가 바뀌지 않게 한다(ADR 0003).
export function useReviewQueue(deckIds: string[]): ReviewQueueState {
  const store = useStore();
  const [result, setResult] = useState<{ deckIds: string[]; state: ReviewQueueState } | null>(null);

  useEffect(() => {
    let active = true;
    const finish = (state: ReviewQueueState) => {
      if (active) setResult({ deckIds, state });
    };
    listReviewCardsOf(store, deckIds, studyDayOf(Date.now())).then(
      (cards) => finish({ kind: 'ready', cards }),
      (error: unknown) =>
        finish({
          kind: error instanceof StoreError && error.code !== 'invalid' ? 'missing' : 'failed',
        }),
    );
    return () => {
      active = false;
    };
  }, [store, deckIds]);

  return result?.deckIds === deckIds ? result.state : { kind: 'loading' };
}

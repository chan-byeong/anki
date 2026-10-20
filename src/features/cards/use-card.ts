import { useEffect, useState } from 'react';

import type { Card } from '@/storage/store';
import { useStore } from '@/storage/StoreProvider';

export type CardState =
  { kind: 'loading' } | { kind: 'ready'; card: Card } | { kind: 'missing' } | { kind: 'failed' };

// 카드 한 장. 카드나 그 덱이 휴지통에 있으면 없는 것으로 본다(getCard와 같은 기준).
export function useCard(cardId: string): CardState {
  const store = useStore();
  const [result, setResult] = useState<{ cardId: string; state: CardState } | null>(null);

  useEffect(() => {
    let active = true;
    const finish = (state: CardState) => {
      if (active) setResult({ cardId, state });
    };
    store.getCard(cardId).then(
      (card) => finish(card ? { kind: 'ready', card } : { kind: 'missing' }),
      () => finish({ kind: 'failed' }),
    );
    return () => {
      active = false;
    };
  }, [store, cardId]);

  return result?.cardId === cardId ? result.state : { kind: 'loading' };
}

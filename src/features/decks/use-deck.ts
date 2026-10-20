import { useIsFocused } from 'expo-router';
import { useEffect, useState } from 'react';

import type { Deck, Store } from '@/storage/store';
import { useStore } from '@/storage/StoreProvider';

type DeckState =
  { kind: 'loading' } | { kind: 'ready'; deck: Deck } | { kind: 'missing' } | { kind: 'failed' };

// 편집에서 돌아오거나 다른 덱으로 이동할 때 다시 읽는다. 이전 요청의 늦은 응답은 무시한다.
export function useDeck(deckId: string) {
  const store = useStore();
  const focused = useIsFocused();
  const [result, setResult] = useState<{ deckId: string; store: Store; state: DeckState } | null>(
    null,
  );
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!focused) return;
    let active = true;
    const finish = (state: DeckState) => {
      if (active) setResult({ deckId, store, state });
    };
    store.getDeck(deckId).then(
      (deck) => {
        finish(deck ? { kind: 'ready', deck } : { kind: 'missing' });
      },
      () => {
        finish({ kind: 'failed' });
      },
    );
    return () => {
      active = false;
    };
  }, [store, deckId, focused, attempt]);

  const state: DeckState =
    result?.deckId === deckId && result.store === store ? result.state : { kind: 'loading' };
  return {
    state,
    retry: () => {
      setResult(null);
      setAttempt((value) => value + 1);
    },
  };
}

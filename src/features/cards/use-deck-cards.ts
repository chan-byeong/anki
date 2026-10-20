import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { todayCountOf } from '@/features/decks/use-deck-list';
import type { Card } from '@/storage/store';
import { useStore } from '@/storage/StoreProvider';

export type DeckCardsState =
  | { kind: 'loading' }
  // cards는 최근에 만든 카드가 먼저다.
  | { kind: 'ready'; cards: Card[]; todayCount: number }
  | { kind: 'failed' };

// 덱의 카드와 오늘 복습할 카드 수. 화면에 들어올 때마다 다시 읽어서 카드 추가 모달을 닫고 돌아오면 바로 반영된다.
// 덱 자체(이름, 없음, 실패)는 useDeck이 맡는다. enabled가 거짓이면 읽지 않는다(덱이 없을 때 listCards는 거부한다).
export function useDeckCards(deckId: string, enabled: boolean): DeckCardsState {
  const store = useStore();
  const [state, setState] = useState<DeckCardsState>({ kind: 'loading' });

  useFocusEffect(
    useCallback(() => {
      if (!enabled) return;
      let active = true;
      Promise.all([store.listCards(deckId), todayCountOf(store)]).then(
        ([cards, counts]) => {
          if (active) {
            setState({ kind: 'ready', cards: cards.toReversed(), todayCount: counts[deckId] ?? 0 });
          }
        },
        () => {
          if (active) setState({ kind: 'failed' });
        },
      );
      return () => {
        active = false;
      };
    }, [store, deckId, enabled]),
  );

  return state;
}

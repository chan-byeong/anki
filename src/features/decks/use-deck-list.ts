import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import type { Deck, Store } from '@/storage/store';
import { useStore } from '@/storage/StoreProvider';

export interface DeckListItem {
  deck: Deck;
  /** 오늘 복습할 카드 수. */
  todayCount: number;
}

export type DeckListState =
  { kind: 'loading' } | { kind: 'ready'; items: DeckListItem[] } | { kind: 'failed' };

// 임시 기준: 평가하지 않은 카드(신규 카드) 수. 신규 카드는 만들자마자 복습일이 되므로 오늘 복습할 카드의 일부이고,
// 평가가 생기기 전에는 전부다. STA-118에서 학습 이력으로 계산한 복습일 기준으로 바꾼다.
export const todayCountOf = async (store: Store): Promise<Record<string, number>> =>
  store.countUnreviewedCards();

// 화면에 들어올 때마다 다시 읽는다. 덱 만들기 같은 다른 화면에서 돌아오면 바로 반영된다.
export function useDeckList(): DeckListState {
  const store = useStore();
  const [state, setState] = useState<DeckListState>({ kind: 'loading' });

  useFocusEffect(
    useCallback(() => {
      let active = true;
      Promise.all([store.listDecks(), todayCountOf(store)]).then(
        ([decks, counts]) => {
          if (!active) return;
          setState({
            kind: 'ready',
            items: decks.map((deck) => ({ deck, todayCount: counts[deck.id] ?? 0 })),
          });
        },
        () => {
          if (active) setState({ kind: 'failed' });
        },
      );
      return () => {
        active = false;
      };
    }, [store]),
  );

  return state;
}

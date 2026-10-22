import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { countQueue } from '@/features/review/queue';
import type { Deck, Store } from '@/storage/store';
import { useStore } from '@/storage/StoreProvider';
import { studyDayOf } from '@/utils/study-day';

export interface DeckListItem {
  deck: Deck;
  /** 오늘 복습할 카드 수. */
  todayCount: number;
}

export type DeckListState =
  { kind: 'loading' } | { kind: 'ready'; items: DeckListItem[] } | { kind: 'failed' };

// 오늘 복습할 카드 수. 복습일이 된 카드와 오늘 다시 봐야 하는 카드의 수다(ADR 0003).
export const todayCountOf = async (store: Store): Promise<Record<string, number>> =>
  countQueue(store, studyDayOf(Date.now()));

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

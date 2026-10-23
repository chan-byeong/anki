import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import type { Card, Trash } from '@/storage/store';
import { useStore } from '@/storage/StoreProvider';

export type TrashedCard = Pick<Card, 'id' | 'front' | 'back'> & {
  /** 카드가 속했던 덱 이름. 덱을 찾지 못하면 빈 문자열이다. */
  deckName: string;
  deletedAt: number;
};

export type TrashState =
  | { kind: 'loading' }
  // now는 목록을 읽은 시각이다. "3일 전"을 이 시각 기준으로 센다.
  | { kind: 'ready'; decks: Trash['decks']; cards: TrashedCard[]; now: number }
  | { kind: 'failed' };

// 휴지통의 덱과 카드. 화면에 들어올 때마다 다시 읽는다. 휴지통은 자동으로 비워지지 않으므로 시간이 지나도 그대로다.
export function useTrash(): TrashState {
  const store = useStore();
  const [state, setState] = useState<TrashState>({ kind: 'loading' });

  useFocusEffect(
    useCallback(() => {
      let active = true;
      Promise.all([store.listTrash(), store.listDecks()]).then(
        ([trash, liveDecks]) => {
          if (!active) return;
          const deckNames = new Map(liveDecks.map((deck) => [deck.id, deck.name]));
          setState({
            kind: 'ready',
            now: Date.now(),
            decks: trash.decks,
            cards: trash.cards.map((card) => ({
              id: card.id,
              front: card.front,
              back: card.back,
              deckName: deckNames.get(card.deckId) ?? '',
              deletedAt: card.deletedAt,
            })),
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

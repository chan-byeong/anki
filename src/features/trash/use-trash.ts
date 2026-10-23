import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';

import type { Card, Trash } from '@/storage/store';
import { useStore } from '@/storage/StoreProvider';

export type TrashedCard = Pick<Card, 'id' | 'deckId' | 'front' | 'back'> & {
  /** 카드가 속한 덱 이름. 덱이 휴지통에 있어도 찾는다. 덱을 찾지 못하면 빈 문자열이다. */
  deckName: string;
  deletedAt: number;
};

export type TrashState =
  | { kind: 'loading' }
  // now는 목록을 읽은 시각이다. "3일 전"을 이 시각 기준으로 센다.
  | { kind: 'ready'; decks: Trash['decks']; cards: TrashedCard[]; now: number }
  | { kind: 'failed' };

// 휴지통의 덱과 카드. 화면에 들어올 때마다, 그리고 복구한 뒤 reload로 다시 읽는다.
// 휴지통은 자동으로 비워지지 않으므로 시간이 지나도 그대로다.
export function useTrash(): { state: TrashState; reload: () => void } {
  const store = useStore();
  const [state, setState] = useState<TrashState>({ kind: 'loading' });
  // 늦게 끝난 이전 읽기가 새 결과를 덮지 않도록 마지막 읽기만 반영한다.
  const latest = useRef(0);

  const load = useCallback(() => {
    const request = ++latest.current;
    Promise.all([store.listTrash(), store.listDecks()]).then(
      ([trash, liveDecks]) => {
        if (request !== latest.current) return;
        // 따로 지운 카드는 덱이 휴지통에 있어도 나오므로(ADR 0018) 휴지통의 덱에서도 이름을 찾는다.
        const deckNames = new Map(
          [...liveDecks, ...trash.decks].map((deck) => [deck.id, deck.name]),
        );
        setState({
          kind: 'ready',
          now: Date.now(),
          decks: trash.decks,
          cards: trash.cards.map((card) => ({
            id: card.id,
            deckId: card.deckId,
            front: card.front,
            back: card.back,
            deckName: deckNames.get(card.deckId) ?? '',
            deletedAt: card.deletedAt,
          })),
        });
      },
      () => {
        if (request === latest.current) setState({ kind: 'failed' });
      },
    );
  }, [store]);

  useFocusEffect(
    useCallback(() => {
      load();
      return () => {
        // 화면을 떠나면 진행 중인 읽기의 결과를 버린다.
        latest.current += 1;
      };
    }, [load]),
  );

  return { state, reload: load };
}

import { useEffect, useState } from 'react';

import { useStore } from '@/storage/StoreProvider';

// 덱 이름. 읽는 중이거나 덱이 없으면(휴지통 포함) 빈 문자열이다.
export function useDeckName(deckId: string): string {
  const store = useStore();
  const [name, setName] = useState('');

  useEffect(() => {
    let active = true;
    store.getDeck(deckId).then(
      (deck) => {
        if (active) setName(deck?.name ?? '');
      },
      () => undefined,
    );
    return () => {
      active = false;
    };
  }, [store, deckId]);

  return name;
}

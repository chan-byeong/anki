import { useEffect, useState } from 'react';

import { useStore } from '@/storage/StoreProvider';
import { studyDayOf } from '@/utils/study-day';

import { parseDeckIds } from './deck-ids';
import { countDueOn } from './queue';

// 복습 끝 화면의 "내일 N장". 오늘 평가가 일정에 반영된 뒤에 세도록 복습이 끝났을 때(enabled) 한 번 읽는다.
// 읽지 못하면 undefined라서 줄을 숨긴다.
export function useTomorrowCount(deckId: string, enabled: boolean): number | undefined {
  const store = useStore();
  const [count, setCount] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    countDueOn(store, parseDeckIds(deckId), studyDayOf(Date.now()) + 1).then(
      (value) => {
        if (active) setCount(value);
      },
      () => {},
    );
    return () => {
      active = false;
    };
  }, [store, deckId, enabled]);

  return count;
}

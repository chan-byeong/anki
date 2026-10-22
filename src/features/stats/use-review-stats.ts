import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { useStore } from '@/storage/StoreProvider';
import { studyDayOf } from '@/utils/study-day';

import { reviewStreak, totalReviews } from './review-streak';

export type ReviewStatsState =
  { kind: 'loading' } | { kind: 'ready'; streak: number; total: number } | { kind: 'failed' };

// 화면에 들어올 때마다 다시 읽는다. 복습을 마치고 돌아오면 바로 반영된다.
export function useReviewStats(): ReviewStatsState {
  const store = useStore();
  const [state, setState] = useState<ReviewStatsState>({ kind: 'loading' });

  useFocusEffect(
    useCallback(() => {
      let active = true;
      store.countReviewsByDay().then(
        (days) => {
          if (!active) return;
          setState({
            kind: 'ready',
            streak: reviewStreak(days, studyDayOf(Date.now())),
            total: totalReviews(days),
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

import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { useStore } from '@/storage/StoreProvider';
import { studyDayOf } from '@/utils/study-day';

import { readForecast } from './forecast';
import { ratingShare, type RatingShare } from './rating-share';
import { calendarWeeks, type CalendarDay } from './review-calendar';
import { reviewStreak, totalReviews } from './review-streak';

export type ReviewStatsState =
  | { kind: 'loading' }
  | {
      kind: 'ready';
      streak: number;
      total: number;
      today: number;
      calendar: (CalendarDay | null)[][];
      ratings: { total: number; shares: RatingShare[] };
      forecast: number[];
    }
  | { kind: 'failed' };

// 화면에 들어올 때마다 다시 읽는다. 복습을 마치고 돌아오면 바로 반영된다.
export function useReviewStats(): ReviewStatsState {
  const store = useStore();
  const [state, setState] = useState<ReviewStatsState>({ kind: 'loading' });

  useFocusEffect(
    useCallback(() => {
      let active = true;
      const today = studyDayOf(Date.now());
      Promise.all([
        store.countReviewsByDay(),
        store.countReviewedCardsByDay(),
        store.countReviewsByRating(),
        readForecast(store, today),
      ]).then(
        ([days, cardDays, ratings, forecast]) => {
          if (!active) return;
          setState({
            kind: 'ready',
            streak: reviewStreak(days, today),
            total: totalReviews(days),
            today,
            calendar: calendarWeeks(cardDays, today),
            ratings: ratingShare(ratings),
            forecast,
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

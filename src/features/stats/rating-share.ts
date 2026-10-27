import { effectiveRating } from '@/features/review/schedule-card';
import type { Rating, RatingCount } from '@/storage/store';

export type RatingShare = { rating: Rating; count: number; percent: number };

// 화면에 보이는 순서. 손 설정과 상관없이 모름·헷갈림·앎이다.
const ORDER: Rating[] = ['dont', 'unsure', 'know'];

/**
 * 지금까지의 평가를 모름·헷갈림·앎으로 나눈 횟수와 비율(정수 %).
 * 힌트를 쓴 앎은 복습일 계산과 같이 헷갈림으로 센다. 비율은 가장 큰 나머지 방식으로 맞춰 합이 100이다.
 */
export const ratingShare = (rows: RatingCount[]): { total: number; shares: RatingShare[] } => {
  const counts: Record<Rating, number> = { dont: 0, unsure: 0, know: 0 };
  for (const row of rows) counts[effectiveRating(row)] += row.count;
  const total = ORDER.reduce((sum, rating) => sum + counts[rating], 0);
  if (total === 0)
    return { total, shares: ORDER.map((rating) => ({ rating, count: 0, percent: 0 })) };

  const exact = ORDER.map((rating) => (counts[rating] * 100) / total);
  const percents = exact.map(Math.floor);
  const left = 100 - percents.reduce((sum, value) => sum + value, 0);
  [...ORDER.keys()]
    .sort((a, b) => exact[b] - percents[b] - (exact[a] - percents[a]))
    .slice(0, left)
    .forEach((index) => {
      percents[index] += 1;
    });

  return {
    total,
    shares: ORDER.map((rating, index) => ({
      rating,
      count: counts[rating],
      percent: percents[index],
    })),
  };
};

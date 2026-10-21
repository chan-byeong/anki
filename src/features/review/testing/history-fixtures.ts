import * as fc from 'fast-check';

import type { Rating, Review } from '@/storage/store';

// 학습 이력 테스트가 함께 쓰는 도우미. __tests__ 안에 두면 Jest가 테스트 파일로 읽어서 밖에 둔다.

export const DAY_MS = 24 * 60 * 60 * 1000;
export const NOON_MS = 12 * 60 * 60 * 1000;
export const FIRST_DAY = 20454; // 2026-01-01

// gap은 앞 평가와 며칠 떨어졌는지다. 0이면 같은 날이다.
export type Step = { gap: number; rating: Rating; hintUsed: boolean };

export const ratingArb = fc.constantFrom<Rating>('know', 'unsure', 'dont');
export const stepArb: fc.Arbitrary<Step> = fc.record({
  gap: fc.integer({ min: 0, max: 400 }),
  rating: ratingArb,
  hintUsed: fc.boolean(),
});
export const stepsArb = (minLength = 0): fc.Arbitrary<Step[]> =>
  fc.array(stepArb, { minLength, maxLength: 12 });

// 단계 목록을 학습일이 늘어나는 이력으로 바꾼다. 같은 날 안에서는 평가 시각이 1초씩 늘어난다.
export const toHistory = (steps: Step[]): Review[] => {
  let day = FIRST_DAY;
  return steps.map((step, index) => {
    day += step.gap;
    return {
      id: `review-${index}`,
      cardId: 'card-1',
      rating: step.rating,
      hintUsed: step.hintUsed,
      studyDay: day,
      ratedAt: day * DAY_MS + NOON_MS + index * 1000,
    };
  });
};

// 새 학습일에 힌트 없이 이어서 평가한 하루. 첫 평가만 앞 평가와 하루 이상 떨어진다.
export const dayOf = (ratings: Rating[]): Step[] =>
  ratings.map((rating, index) => ({ gap: index === 0 ? 1 : 0, rating, hintUsed: false }));

import type { ReviewDayCount } from '@/storage/store';

/**
 * 오늘(학습일)까지 하루도 빠지지 않고 복습한 날의 수.
 * 오늘 아직 복습하지 않았어도 어제까지 이어졌으면 끊기지 않은 것으로 센다.
 */
export const reviewStreak = (reviewDays: ReviewDayCount[], today: number): number => {
  const studied = new Set(reviewDays.map(({ studyDay }) => studyDay));
  let day = studied.has(today) ? today : today - 1;
  let streak = 0;
  while (studied.has(day)) {
    streak += 1;
    day -= 1;
  }
  return streak;
};

/** 지금까지 평가한 횟수. 같은 카드를 다시 복습하면 그만큼 더해진다. */
export const totalReviews = (reviewDays: ReviewDayCount[]): number =>
  reviewDays.reduce((sum, { count }) => sum + count, 0);

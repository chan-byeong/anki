import type { Review } from '@/storage/store';

import { byStudyOrder, effectiveRating, scheduleCard } from './schedule-card';

/**
 * 한 카드가 오늘 대기열에 있는지 판정한다(ADR 0003). today는 학습일(1970-01-01부터 센 일수)이다.
 * - 이력이 없으면 신규 카드라서 true.
 * - 오늘(studyDay === today)의 평가가 3건 미만이고 마지막 유효 평가가 모름·헷갈림이면 true(오늘 다시 볼 카드).
 * - 그 밖에는 scheduleCard(history).dueDay <= today.
 * 순수 함수다. 시계를 읽지 않고 입력을 바꾸지 않는다.
 */
export const isInQueue: (history: Review[], today: number) => boolean = (history, today) => {
  const schedule = scheduleCard(history);

  if (schedule === null || schedule.dueDay <= today) return true;

  const todayReviews = history.filter((review) => review.studyDay === today).sort(byStudyOrder);
  const latestReview = todayReviews[todayReviews.length - 1];
  if (
    schedule.lastStudyDay === today &&
    todayReviews.length > 0 &&
    todayReviews.length < 3 &&
    effectiveRating(latestReview) !== 'know'
  )
    return true;

  return false;
};

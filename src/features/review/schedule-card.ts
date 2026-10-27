import type { Rating, Review } from '@/storage/store';

export type CardSchedule = {
  /** 다음 복습까지의 일수. 1~365. */
  intervalDays: number;
  /** 이력에서 가장 늦은 학습일. */
  lastStudyDay: number;
  /** lastStudyDay + intervalDays. */
  dueDay: number;
};

const MAX_INTERVAL_DAYS = 365;
const NEW_CARD_INTERVAL_DAYS: Record<Rating, number> = { dont: 1, unsure: 2, know: 3 };

// 새 학습일이 시작될 때의 상태. 이력이 없던 신규 카드는 null이다.
type DayBase = { intervalDays: number; lastStudyDay: number } | null;

// (studyDay, ratedAt, id) 순. 학습일을 먼저 보므로 시계가 뒤로 가도 경과일이 음수가 되지 않는다(ADR 0015).
export const byStudyOrder = (a: Review, b: Review): number => {
  if (a.studyDay !== b.studyDay) return a.studyDay - b.studyDay;
  if (a.ratedAt !== b.ratedAt) return a.ratedAt - b.ratedAt;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
};

// 힌트를 쓴 앎은 헷갈림으로 계산한다. 이력에는 원본 평가가 그대로 남는다(ADR 0004).
export const effectiveRating = (review: Pick<Review, 'rating' | 'hintUsed'>): Rating =>
  review.rating === 'know' && review.hintUsed ? 'unsure' : review.rating;

// 새 학습일의 첫 평가가 정하는 간격. elapsed는 직전 학습일에서 지난 일수(1 이상)다.
const intervalOnNewDay = (base: DayBase, studyDay: number, rating: Rating): number => {
  if (base === null) return NEW_CARD_INTERVAL_DAYS[rating];
  const current = base.intervalDays;
  const elapsed = studyDay - base.lastStudyDay;
  if (rating === 'dont') return 1;
  if (rating === 'unsure')
    return Math.min(MAX_INTERVAL_DAYS, Math.max(2, Math.round(current * 0.5)));
  const grown =
    elapsed >= current
      ? Math.max(current + 1, Math.round((current + (elapsed - current) / 2) * 2.5))
      : Math.max(current, Math.round(elapsed * 2.5));
  return Math.min(MAX_INTERVAL_DAYS, grown);
};

// 같은 학습일의 재평가. unsureInterval은 그날 첫 평가 직전 상태에서 헷갈림을 받았을 때의 간격이다.
// 앞서 모름·헷갈림이 있었다면 앎이어도 그 수준을 넘지 않는다. 모름 뒤의 헷갈림은 1일을 유지한다.
const intervalOnSameDay = (
  current: number,
  rating: Rating,
  earlierMiss: boolean,
  unsureInterval: number,
): number => {
  if (rating === 'dont') return 1;
  if (rating === 'unsure') return Math.min(current, unsureInterval);
  return earlierMiss ? Math.min(current + 1, unsureInterval) : current;
};

/**
 * 한 카드의 학습 이력을 처음부터 순수하게 다시 계산해 일정을 얻는다(ADR 0004).
 * 입력 순서와 무관하고 입력을 바꾸지 않는다. (studyDay, ratedAt, id) 순으로 스스로 정렬한다(ADR 0015).
 * 힌트를 쓴 앎은 헷갈림으로 계산한다. 이력이 없는 신규 카드는 null이다.
 * 현재 시각과 난수를 쓰지 않는다.
 */
export const scheduleCard = (history: Review[]): CardSchedule | null => {
  if (history.length === 0) return null;
  const ordered = [...history].sort(byStudyOrder);

  let intervalDays = 0;
  let previousDay: number | null = null;
  let unsureInterval = 0;
  let earlierMiss = false;

  for (const review of ordered) {
    const rating = effectiveRating(review);
    if (review.studyDay !== previousDay) {
      const base: DayBase =
        previousDay === null ? null : { intervalDays, lastStudyDay: previousDay };
      unsureInterval = intervalOnNewDay(base, review.studyDay, 'unsure');
      intervalDays = intervalOnNewDay(base, review.studyDay, rating);
      earlierMiss = false;
      previousDay = review.studyDay;
    } else {
      intervalDays = intervalOnSameDay(intervalDays, rating, earlierMiss, unsureInterval);
    }
    if (rating !== 'know') earlierMiss = true;
  }

  const lastStudyDay = ordered[ordered.length - 1].studyDay;
  return { intervalDays, lastStudyDay, dueDay: lastStudyDay + intervalDays };
};

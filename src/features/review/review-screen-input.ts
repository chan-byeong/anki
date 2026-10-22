import type { Card, Review } from '@/storage/store';

// Core의 계약만 둔다. 대기열 전환과 재등장 구현은 사용자가 별도로 연결한다.
export type NextCardAfterRating = (
  review: Review,
) => Promise<{ card: Card | null; remaining: number }>;

export interface ReviewScreenInput {
  // 미주입 상태에서는 평가를 저장하지 않는다.
  nextCardAfterRating?: NextCardAfterRating;
  // 현재 덱에서 복습일이 정확히 내일인 카드 수. 일정 계산은 화면 밖에서 한다.
  tomorrowCount?: number;
}

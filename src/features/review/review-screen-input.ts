import type { Card, Review } from '@/storage/store';

// 평가 뒤의 전환 계약. 구현은 next-card-after-rating.ts에 있고, 테스트는 이 자리로 대체 구현을 주입한다.
export type NextCardAfterRating = (
  review: Review,
) => Promise<{ card: Card | null; remaining: number }>;

export interface ReviewScreenInput {
  // 주입이 없으면 화면이 복습을 시작할 때 읽은 대기열로 실제 전환(createNextCardAfterRating)을 만든다.
  nextCardAfterRating?: NextCardAfterRating;
  // 현재 덱에서 복습일이 정확히 내일인 카드 수. 일정 계산은 화면 밖에서 한다.
  tomorrowCount?: number;
}

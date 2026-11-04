import type { Rating } from '@/storage/store';

// 밀어서 평가(한장 인터랙션 명세 · 복습): 오른쪽으로 밀면 앎, 왼쪽으로 밀면 모름.
// 손 설정(왼손 모드)과 상관없이 방향은 그대로다. 헷갈림은 버튼으로만 고른다.
export const SWIPE_RATE_THRESHOLD = 96;

export type SwipeRating = Extract<Rating, 'know' | 'dont'>;

// 96px를 넘은 쪽의 평가. 못 넘었으면 null이고, 놓으면 카드가 제자리로 돌아간다.
export const swipeRatingAt = (offset: number): SwipeRating | null =>
  offset >= SWIPE_RATE_THRESHOLD ? 'know' : offset <= -SWIPE_RATE_THRESHOLD ? 'dont' : null;

// 미는 만큼 그쪽 표시가 진해진다. 0(제자리)에서 1(문턱)까지.
export const swipeProgress = (offset: number, side: 1 | -1): number =>
  Math.min(Math.max((offset * side) / SWIPE_RATE_THRESHOLD, 0), 1);

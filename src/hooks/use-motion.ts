import { useReducedMotion } from '@/hooks/use-reduced-motion';
import {
  motion,
  motionEnter,
  motionPress,
  pickScale,
  pressScale,
  shift,
  shiftCard,
} from '@/theme/tokens';

export interface Motion {
  reduced: boolean;
  press: number;
  motion: number;
  enter: number;
  pressScale: number;
  pickScale: number;
  shift: number;
  shiftCard: number;
}

const FULL: Motion = {
  reduced: false,
  press: motionPress,
  motion,
  enter: motionEnter,
  pressScale,
  pickScale,
  shift,
  shiftCard,
};

// 동작 줄이기: 이동·크기 변화를 없애고 기본 시간(motion)의 페이드만 남긴다. 색·불투명도 변화는 그대로 둔다.
// 높이 변화를 없애는 일은 값으로 표현되지 않아서, 쓰는 쪽이 reduced를 보고 정한다.
const REDUCED: Motion = {
  reduced: true,
  press: motionPress,
  motion,
  enter: motion,
  pressScale: 1,
  pickScale: 1,
  shift: 0,
  shiftCard: 0,
};

// 시간과 거리 토큰을 동작 줄이기 설정에 맞춰 준다. 판단은 useReducedMotion 하나로 하고,
// reanimated 자체의 동작 줄이기 처리는 루트에서 끈다(ADR 0020).
export const useMotion = (): Motion => (useReducedMotion() ? REDUCED : FULL);

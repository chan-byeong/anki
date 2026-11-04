import { useMotion } from '@/hooks/use-motion';
import { easeMove } from '@/theme/tokens';
import {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
const EASE_MOVE = Easing.bezier(...easeMove);

// 흔들기 한 번은 −d → d → −d → 0 네 구간이다. 기본값은 명세의 좌우 4px, 240ms(구간당 60ms).
const DEFAULT_DISTANCE = 4;
const DEFAULT_DURATION = 240;
const STEPS = 4;

export interface ShakeOptions {
  // 좌우로 움직이는 거리(px)
  distance?: number;
  // 흔들기 한 번의 전체 시간(ms). 네 구간이 똑같이 나눠 갖는다.
  duration?: number;
}

export const useShake = ({
  distance = DEFAULT_DISTANCE,
  duration = DEFAULT_DURATION,
}: ShakeOptions = {}) => {
  const { reduced } = useMotion();
  const x = useSharedValue(0);

  const shake = () => {
    if (reduced) return;
    const step = (to: number) => withTiming(to, { duration: duration / STEPS, easing: EASE_MOVE });
    x.value = withSequence(step(-distance), step(distance), step(-distance), step(0));
  };

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }],
  }));

  return { style, shake };
};

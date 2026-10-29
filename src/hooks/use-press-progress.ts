import { Easing, useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';

import { useMotion } from '@/hooks/use-motion';
import { easeMove } from '@/theme/tokens';

const EASE_MOVE = Easing.bezier(...easeMove);

interface PressProgress {
  // 누르는 동안 1, 뗀 뒤 0으로 간다. 크기·바탕·불투명도 반응은 이 값에서 만든다.
  progress: SharedValue<number>;
  onPressIn: () => void;
  onPressOut: () => void;
}

// 공통 컴포넌트의 누름 반응(명세 "공통 컴포넌트의 반응"): 100ms easeMove로 들어가고 나온다.
export function usePressProgress(): PressProgress {
  const { press } = useMotion();
  const progress = useSharedValue(0);
  const to = (value: number) => {
    progress.value = withTiming(value, { duration: press, easing: EASE_MOVE });
  };

  return { progress, onPressIn: () => to(1), onPressOut: () => to(0) };
}

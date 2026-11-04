import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, { Easing, FadeOut, LinearTransition } from 'react-native-reanimated';

import { useMotion } from '@/hooks/use-motion';
import { easeIn, motion } from '@/theme/tokens';

interface ExitingRowAnimationOptions {
  reduced: boolean;
}

// 목록에서 빠짐(명세 "목록 행 빠짐 · 생김"): 빠지는 행은 160ms 페이드 아웃하고, 아래 행은 같은 160ms easeIn으로 올라온다.
// 새로 생긴 행은 들어오는 움직임 없이 그냥 나타난다. 동작 줄이기에서는 아래 행이 바로 올라오고 페이드만 남는다.
export const exitingRowAnimations = ({ reduced }: ExitingRowAnimationOptions) => ({
  exiting: FadeOut.duration(motion),
  layout: reduced ? undefined : LinearTransition.duration(motion).easing(Easing.bezier(...easeIn)),
});

interface ExitingRowProps {
  // false면 움직이지 않는다. 검색으로 걸러질 때처럼 행이 빠져도 움직이면 안 되는 경우에 쓴다.
  animated?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  children: ReactNode;
}

// 목록의 한 행을 감싼다. 행이 목록에서 빠지거나 위 행이 빠져 자리가 바뀔 때 움직인다.
export function ExitingRow({ animated = true, style, testID, children }: ExitingRowProps) {
  const { reduced } = useMotion();
  const { exiting, layout } = exitingRowAnimations({ reduced });
  return (
    <Animated.View
      style={style}
      testID={testID}
      exiting={animated ? exiting : undefined}
      layout={animated ? layout : undefined}
    >
      {children}
    </Animated.View>
  );
}

import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, { FadeIn, FadeOut, LayoutAnimationConfig } from 'react-native-reanimated';

import { motion } from '@/theme/tokens';

interface FadeSwapProps {
  // 이 값이 바뀌면 내용을 바꿔 끼운다. 같은 값이면 내용만 갱신하고 움직이지 않는다.
  swapKey: string | number;
  // 감싼 뷰의 배치(flex 등). 호출하는 쪽이 자리를 정한다.
  style?: StyleProp<ViewStyle>;
  testID?: string;
  children: ReactNode;
}

// 옛 내용은 나가고 새 내용은 들어오는 160ms 크로스페이드(ADR 0021). 동작 줄이기에서도 같다.
export const fadeSwapAnimations = () => ({
  entering: FadeIn.duration(motion),
  exiting: FadeOut.duration(motion),
});

// 같은 자리에서 내용이 페이드로 바뀐다. 처음 그릴 때는 움직이지 않고, 이후 swapKey가 바뀔 때만 움직인다.
export function FadeSwap({ swapKey, style, testID, children }: FadeSwapProps) {
  const { entering, exiting } = fadeSwapAnimations();
  return (
    <LayoutAnimationConfig skipEntering>
      <Animated.View
        key={swapKey}
        style={style}
        testID={testID}
        entering={entering}
        exiting={exiting}
      >
        {children}
      </Animated.View>
    </LayoutAnimationConfig>
  );
}

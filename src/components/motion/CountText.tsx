import { useMemo } from 'react';
import { Text, type StyleProp, type TextStyle } from 'react-native';
import Animated, { Easing, Keyframe, LayoutAnimationConfig } from 'react-native-reanimated';

import { useMotion } from '@/hooks/use-motion';
import { easeIn, easeOut } from '@/theme/tokens';

interface CountTextAnimationOptions {
  shift: number;
  duration: number;
}

// 숫자 바뀜(ADR 0021): 새 숫자는 아래 shift에서 올라오며 나타나고, 옛 숫자는 위로 shift 가며 사라진다.
// 늘든 줄든 방향은 항상 위다. 동작 줄이기에서는 shift가 0이라 페이드만 남는다.
export const countTextAnimations = ({ shift, duration }: CountTextAnimationOptions) => ({
  entering: new Keyframe({
    0: { opacity: 0, transform: [{ translateY: shift }] },
    100: { opacity: 1, transform: [{ translateY: 0 }], easing: Easing.bezier(...easeOut) },
  }).duration(duration),
  exiting: new Keyframe({
    0: { opacity: 1, transform: [{ translateY: 0 }] },
    100: { opacity: 0, transform: [{ translateY: -1 * shift }], easing: Easing.bezier(...easeIn) },
  }).duration(duration),
});

interface CountTextProps {
  // 이 값이 바뀌면 숫자가 바뀐다. 같은 값이면 움직이지 않는다.
  value: number;
  // 숫자 글자의 스타일.
  style?: StyleProp<TextStyle>;
  // 숫자를 감싼 뷰에 붙는다.
  testID?: string;
}

// 숫자만 그리고, 값이 바뀔 때 새 숫자가 올라오며 바뀐다. 처음 그릴 때는 움직이지 않는다.
// "n개 선택"처럼 글자가 붙으면 호출하는 쪽이 숫자 옆에 글자를 따로 놓는다.
export function CountText({ value, style, testID }: CountTextProps) {
  const { motion, shift } = useMotion();
  const { entering, exiting } = useMemo(
    () => countTextAnimations({ shift, duration: motion }),
    [shift, motion],
  );

  return (
    <LayoutAnimationConfig skipEntering>
      <Animated.View key={value} testID={testID} entering={entering} exiting={exiting}>
        <Text style={style}>{value}</Text>
      </Animated.View>
    </LayoutAnimationConfig>
  );
}

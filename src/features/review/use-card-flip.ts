import { useEffect } from 'react';
import { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { PILE_STEP } from '@/features/review/components/CardPile';
import { useMotion } from '@/hooks/use-motion';
import { easeIn, easeOut } from '@/theme/tokens';

const EASE_OUT = Easing.bezier(...easeOut);
const EASE_IN = Easing.bezier(...easeIn);

// 첫 겹이 카드가 될 때 시작하는 크기(한장 시그니처). 캔버스 토큰이 아니라 시그니처 보드의 값이다.
const RISE_SCALE = 0.95;

interface UseCardFlipOptions {
  // 평가를 눌러 이 카드가 나가는 중이다.
  leaving: boolean;
  // 앞 카드에서 넘어온 카드다. 첫 카드는 화면이 열리며 보이므로 따로 움직이지 않는다.
  rise: boolean;
}

// 카드 한 장의 나감과 들어옴.
// 나감: 위로 shift(8px) 가며 사라진다(motion · easeIn). 저장에 실패하면 같은 길로 돌아온다.
// 들어옴: 더미의 첫 겹 자리(아래 6px, 0.95배)에서 올라와 그대로 카드가 된다(motion · easeOut).
// 동작 줄이기: 이동·확대 없이 페이드 아웃 → 페이드 인.
export function useCardFlip({ leaving, rise }: UseCardFlipOptions) {
  const { motion, shift, reduced } = useMotion();
  const opacity = useSharedValue(rise && reduced ? 0 : 1);
  const y = useSharedValue(rise && !reduced ? PILE_STEP : 0);
  const scale = useSharedValue(rise && !reduced ? RISE_SCALE : 1);

  useEffect(() => {
    const out = { duration: motion, easing: EASE_IN };
    const into = { duration: motion, easing: EASE_OUT };
    if (leaving) {
      opacity.value = withTiming(0, out);
      // 동작 줄이기에서 shift가 0이면 -0이 아니라 0으로 둔다.
      y.value = withTiming(shift === 0 ? 0 : -shift, out);
    } else {
      opacity.value = withTiming(1, into);
      y.value = withTiming(0, into);
      scale.value = withTiming(1, into);
    }
  }, [leaving, motion, shift, opacity, y, scale]);

  return useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: y.value }, { scale: scale.value }],
  }));
}

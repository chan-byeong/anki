import { useEffect, useState } from 'react';
import { usePanGesture } from 'react-native-gesture-handler';
import { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import {
  SWIPE_RATE_THRESHOLD,
  swipeProgress,
  swipeRatingAt,
  type SwipeRating,
} from '@/features/review/swipe-rate';
import { useMotion } from '@/hooks/use-motion';
import { easeOut } from '@/theme/tokens';
import { haptic } from '@/utils/haptics';

const EASE_OUT = Easing.bezier(...easeOut);

interface UseSwipeRateOptions {
  // 정답을 연 뒤, 평가를 받을 수 있을 때만 켠다. 버튼과 같은 조건이다.
  enabled: boolean;
  onRate: (rating: SwipeRating) => void;
  // 평가를 눌러 이 카드가 나가는 중이다. 저장에 실패해 카드가 돌아오면 밀린 자리에서도 제자리로 돌아온다.
  leaving: boolean;
}

// 카드를 좌우로 밀어 평가한다. 손을 따라 움직이고, 문턱(96px)을 넘으면 그쪽 평가 버튼이 눌린 색이 되며
// 햅틱이 한 번 울린다. 문턱을 넘겨 놓으면 평가하고, 못 넘기면 160ms에 제자리로 돌아온다.
export function useSwipeRate({ enabled, onRate, leaving }: UseSwipeRateOptions) {
  const { motion } = useMotion();
  const offset = useSharedValue(0);
  // 문턱을 넘은 쪽. 1 = 오른쪽(앎), -1 = 왼쪽(모름), 0 = 아직.
  const side = useSharedValue(0);
  const [armed, setArmed] = useState<SwipeRating | null>(null);

  const arm = (next: SwipeRating | null) => {
    setArmed(next);
    if (next !== null) haptic.threshold();
  };

  const gesture = usePanGesture({
    enabled,
    // 가로로 12px 움직여야 시작한다. 세로로 먼저 움직이면 긴 글 스크롤에 양보한다.
    activeOffsetX: [-12, 12],
    failOffsetY: [-12, 12],
    onUpdate: (event) => {
      'worklet';
      offset.value = event.translationX;
      const next =
        event.translationX >= SWIPE_RATE_THRESHOLD
          ? 1
          : event.translationX <= -SWIPE_RATE_THRESHOLD
            ? -1
            : 0;
      if (next !== side.value) {
        side.value = next;
        scheduleOnRN(arm, next === 1 ? 'know' : next === -1 ? 'dont' : null);
      }
    },
    onDeactivate: (event) => {
      'worklet';
      const rating = swipeRatingAt(event.translationX);
      side.value = 0;
      scheduleOnRN(setArmed, null);
      if (rating === null) {
        offset.value = withTiming(0, { duration: motion, easing: EASE_OUT });
      } else {
        scheduleOnRN(onRate, rating);
      }
    },
  });

  useEffect(() => {
    if (!leaving) offset.value = withTiming(0, { duration: motion, easing: EASE_OUT });
  }, [leaving, motion, offset]);

  const cardStyle = useAnimatedStyle(() => ({ transform: [{ translateX: offset.value }] }));
  const forgotStyle = useAnimatedStyle(() => ({ opacity: swipeProgress(offset.value, -1) }));
  const knewStyle = useAnimatedStyle(() => ({ opacity: swipeProgress(offset.value, 1) }));

  return { gesture, cardStyle, forgotStyle, knewStyle, armed };
}

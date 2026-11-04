import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { TrashIcon } from '@/components';
import { TRASH_OPEN_WIDTH, trashSwipeZone } from '@/features/cards/swipe-trash';
import { useMotion } from '@/hooks/use-motion';
import { useTheme } from '@/theme/ThemeProvider';
import { easeIn, easeOut } from '@/theme/tokens';
import { haptic } from '@/utils/haptics';

const EASE_OUT = Easing.bezier(...easeOut);
const EASE_IN = Easing.bezier(...easeIn);

interface SwipeToTrashProps {
  // 휴지통 버튼의 스크린 리더 이름에 붙는 카드 이름.
  label: string;
  // 휴지통으로 보낸다. 실패하면 던지고, 행은 제자리로 돌아온다.
  onTrash: () => Promise<void> | void;
  // 행을 그린다. press를 감싸 주면, 휴지통 버튼이 열려 있을 때 행을 누르는 것은 열기 대신 닫기가 된다.
  children: (guard: (press: () => void) => () => void) => ReactNode;
}

// 카드 행을 왼쪽으로 밀면 오른쪽에서 휴지통 버튼이 드러난다.
// 88px 넘기면 버튼이 열린 채 멈추고, 행 너비의 60%를 넘겨 놓으면 바로 휴지통으로 간다.
// 문턱을 넘는 순간 햅틱이 한 번 울린다. 같은 일을 하는 버튼(열린 휴지통 버튼, 스크린 리더 동작)이 따로 있다.
export function SwipeToTrash({ label, onTrash, children }: SwipeToTrashProps) {
  const { colors } = useTheme();
  const { motion } = useMotion();
  const offset = useSharedValue(0);
  const width = useSharedValue(0);
  const zone = useSharedValue<0 | 1 | 2>(0);
  // 열린 채 멈춘 시작점. 열린 행을 다시 밀 때 여기서부터 따라간다.
  const base = useSharedValue(0);
  // 휴지통으로 간 뒤 행이 스스로 사라지는 정도(0~1). 목록의 빠짐 움직임이 안 돌아도 빨간 칸이 남지 않게 한다.
  const gone = useSharedValue(0);
  const height = useSharedValue(0);
  const [open, setOpen] = useState(false);

  const buzz = () => haptic.threshold();
  const markOpen = (next: boolean) => setOpen(next);

  const close = () => {
    base.value = 0;
    offset.value = withTiming(0, { duration: motion, easing: EASE_OUT });
    setOpen(false);
  };

  const commit = async () => {
    setOpen(false);
    base.value = 0;
    offset.value = withTiming(-width.value, { duration: motion, easing: EASE_IN });
    try {
      await onTrash();
      gone.value = withTiming(1, { duration: motion, easing: EASE_IN });
    } catch {
      close();
    }
  };

  const pan = usePanGesture({
    testID: 'swipe-to-trash-pan',
    // 가로로 12px 움직여야 시작한다. 세로로 먼저 움직이면 목록 스크롤에 양보한다.
    activeOffsetX: [-12, 12],
    failOffsetY: [-12, 12],
    onUpdate: (event) => {
      'worklet';
      const next = Math.min(Math.max(base.value + event.translationX, -width.value), 0);
      offset.value = next;
      const now = trashSwipeZone(next, width.value);
      const code = now === 'commit' ? 2 : now === 'open' ? 1 : 0;
      if (code !== zone.value) {
        // 문턱을 위로 넘을 때만 울린다. 되돌아올 때는 울리지 않는다.
        if (code > zone.value) scheduleOnRN(buzz);
        zone.value = code;
      }
    },
    onDeactivate: () => {
      'worklet';
      const settled = trashSwipeZone(offset.value, width.value);
      zone.value = 0;
      if (settled === 'commit') {
        scheduleOnRN(commit);
      } else if (settled === 'open') {
        base.value = -TRASH_OPEN_WIDTH;
        offset.value = withTiming(-TRASH_OPEN_WIDTH, { duration: motion, easing: EASE_OUT });
        scheduleOnRN(markOpen, true);
      } else {
        base.value = 0;
        offset.value = withTiming(0, { duration: motion, easing: EASE_OUT });
        scheduleOnRN(markOpen, false);
      }
    },
  });

  const rowStyle = useAnimatedStyle(() => ({ transform: [{ translateX: offset.value }] }));
  const actionStyle = useAnimatedStyle(() => ({ width: -offset.value }));
  const rootStyle = useAnimatedStyle(() => ({
    opacity: 1 - gone.value,
    height: gone.value === 0 ? 'auto' : height.value * (1 - gone.value),
  }));

  const guard = (press: () => void) => () => {
    if (open) close();
    else press();
  };

  return (
    <Animated.View
      testID="swipe-to-trash"
      onLayout={(event) => {
        width.value = event.nativeEvent.layout.width;
        if (gone.value === 0) height.value = event.nativeEvent.layout.height;
      }}
      style={[styles.root, rootStyle]}
    >
      {/* 밀수록 드러나는 휴지통 자리. 행 뒤에 깔려 있고, 닫혀 있으면 스크린 리더에서 숨는다. */}
      <Animated.View
        aria-hidden={!open}
        style={[styles.action, { backgroundColor: colors.danger }, actionStyle]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${label} 휴지통으로 옮기기`}
          disabled={!open}
          onPress={commit}
          style={styles.button}
        >
          <TrashIcon color={colors.inverse} size={22} />
        </Pressable>
      </Animated.View>
      <GestureDetector gesture={pan}>
        <Animated.View style={[{ backgroundColor: colors.bg }, rowStyle]}>
          {children(guard)}
        </Animated.View>
      </GestureDetector>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { overflow: 'hidden' },
  action: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    alignItems: 'flex-end',
    overflow: 'hidden',
  },
  button: { width: TRASH_OPEN_WIDTH, flex: 1, alignItems: 'center', justifyContent: 'center' },
});

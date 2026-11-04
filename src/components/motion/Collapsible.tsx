import { useEffect, useEffectEvent, useState, type ReactNode } from 'react';
import {
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { useMotion } from '@/hooks/use-motion';
import { easeIn, easeOut } from '@/theme/tokens';

interface CollapsibleProps {
  // 열고 닫는 값. 바뀌면 높이와 불투명도가 함께 움직인다. 처음 그릴 때는 움직이지 않는다.
  open: boolean;
  // 감싼 뷰의 배치(margin 등). 호출하는 쪽이 자리를 정한다.
  style?: StyleProp<ViewStyle>;
  // 감싼 뷰에 붙는다. 높이를 재는 안쪽 뷰에는 `${testID}-content`가 붙는다.
  testID?: string;
  children: ReactNode;
}

const EASE_OUT = Easing.bezier(...easeOut);
const EASE_IN = Easing.bezier(...easeIn);

// 높이가 열리고 접히는 자리(ADR 0021). 열기 240ms easeOut, 접기 160ms easeIn으로 높이와 불투명도가 함께 움직인다.
// 접힘이 끝나면 내용을 언마운트하고, 다시 열 때는 높이를 새로 잰 뒤에 시작한다.
// 이 바깥 컴포넌트는 내용을 트리에 둘지만 정한다. 움직임은 안쪽 CollapsiblePanel이 맡는다.
export function Collapsible({ open, style, testID, children }: CollapsibleProps) {
  const [mounted, setMounted] = useState(open);
  // 열린 채로 처음 그렸으면 움직임 없이 바로 보인다. 한 번 접힌 뒤 다시 마운트될 때부터는 움직인다.
  const [instant, setInstant] = useState(open);
  if (open && !mounted) setMounted(true);

  if (!mounted) return null;
  return (
    <CollapsiblePanel
      open={open}
      instant={instant}
      style={style}
      testID={testID}
      onClosed={() => {
        setInstant(false);
        setMounted(false);
      }}
    >
      {children}
    </CollapsiblePanel>
  );
}

interface CollapsiblePanelProps extends CollapsibleProps {
  instant: boolean;
  // 접힘이 끝났을 때 불린다. 바깥이 내용을 언마운트한다.
  onClosed: () => void;
}

// 공유 값 progress(0 접힘, 1 열림) 하나로 높이와 불투명도를 함께 움직인다. 높이는 progress × 잰 높이라서
// 움직이는 동안 내용 높이가 바뀌어도 따라간다. 이 컴포넌트는 마운트될 때마다 새로 시작하므로,
// 접힌 뒤 다시 열 때 첫 프레임이 옛 스타일로 남지 않는다.
function CollapsiblePanel({
  open,
  instant,
  onClosed,
  style,
  testID,
  children,
}: CollapsiblePanelProps) {
  const { reduced, motion, enter } = useMotion();
  const progress = useSharedValue(instant ? 1 : 0);
  // 잰 내용 높이. 재기 전에는 null이라서 높이 0·투명으로 두고 움직이기 시작하지 않는다.
  const [measuredHeight, setMeasuredHeight] = useState<number | null>(null);
  // 다 열려서 높이를 내용에 맡기는 중. 움직이는 동안에만 높이를 숫자로 고정한다.
  const [settled, setSettled] = useState(instant);
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    setSettled(false);
  }

  // 효과 이벤트라서 애니메이션이 끝난 시점의 최신 open을 본다. 접히는 사이 다시 열렸으면 내리지 않는다.
  const opened = useEffectEvent(() => {
    if (open) setSettled(true);
  });
  const closed = useEffectEvent(() => {
    if (!open) onClosed();
  });

  useEffect(() => {
    // 동작 줄이기에서는 높이를 움직이지 않으니 재지 않아도 시작할 수 있다.
    if (open && !reduced && measuredHeight === null) return;
    if (open) {
      if (progress.value === 1) return;
      progress.value = withTiming(1, { duration: enter, easing: EASE_OUT }, (finished) => {
        if (finished) scheduleOnRN(opened);
      });
    } else {
      progress.value = withTiming(0, { duration: motion, easing: EASE_IN }, (finished) => {
        if (finished) scheduleOnRN(closed);
      });
    }
  }, [open, reduced, measuredHeight, enter, motion, progress]);

  const fixedHeight = !reduced && !settled;
  const animatedStyle = useAnimatedStyle(
    () =>
      fixedHeight
        ? { height: progress.value * (measuredHeight ?? 0), opacity: progress.value }
        : { opacity: progress.value },
    [fixedHeight, measuredHeight],
  );

  const onLayout = (event: LayoutChangeEvent) => {
    setMeasuredHeight(event.nativeEvent.layout.height);
  };

  return (
    <Animated.View testID={testID} style={[style, styles.clip, animatedStyle]}>
      <View
        testID={testID ? `${testID}-content` : undefined}
        onLayout={onLayout}
        // 접기 시작하는 순간 스크린리더에서 숨긴다.
        aria-hidden={!open}
      >
        {children}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // 높이가 줄어드는 동안 내용이 삐져나오지 않게 한다.
  clip: { overflow: 'hidden' },
});

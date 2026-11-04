import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '@/theme/ThemeProvider';
import { easeIn, easeOut, motion, radius, space } from '@/theme/tokens';

// 남은 더미(한장 시그니처): 지금 카드 밑으로 남은 카드가 최대 3겹 비친다.
// 한 겹마다 카드보다 아래로 6px, 양옆으로 8px 들어간다. 겹은 그림자가 아니라 --line 테두리다.
// 6px와 겹 수는 캔버스 토큰이 아니라 시그니처 보드의 값이다.
export const PILE_MAX_LAYERS = 3;
export const PILE_STEP = 6;
const PILE_INSET = space[2];

// 지금 카드를 빼고 남은 카드로 겹 수를 바로 계산한다. 따로 상태를 두지 않는다.
export const pileLayers = (remaining: number) =>
  Math.min(Math.max(remaining - 1, 0), PILE_MAX_LAYERS);

const EASE_OUT = Easing.bezier(...easeOut);
const EASE_IN = Easing.bezier(...easeIn);

interface CardPileProps {
  // 남은 카드 수(지금 카드 포함).
  remaining: number;
}

// 카드와 같은 크기의 틀 안에서 카드 뒤에 깔린다. 카드는 이 위에 따로 그린다.
export function CardPile({ remaining }: CardPileProps) {
  const layers = pileLayers(remaining);

  return (
    <>
      {Array.from({ length: PILE_MAX_LAYERS }, (_, i) => (
        <PileLayer key={i} depth={i + 1} on={layers > i} />
      ))}
    </>
  );
}

interface PileLayerProps {
  depth: number;
  on: boolean;
}

// 겹이 생길 때는 easeOut, 빠질 때는 easeIn으로 160ms 페이드한다. 맨 아래 겹이 페이드로 빠진다.
function PileLayer({ depth, on }: PileLayerProps) {
  const { colors } = useTheme();
  const opacity = useSharedValue(on ? 1 : 0);

  useEffect(() => {
    opacity.value = withTiming(on ? 1 : 0, {
      duration: motion,
      easing: on ? EASE_OUT : EASE_IN,
    });
  }, [on, opacity]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      testID={`review-pile-layer-${depth}`}
      aria-hidden
      pointerEvents="none"
      style={[
        styles.layer,
        {
          top: PILE_STEP * depth,
          bottom: -PILE_STEP * depth,
          left: PILE_INSET * depth,
          right: PILE_INSET * depth,
          backgroundColor: colors.surface,
          borderColor: colors.line,
        },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  layer: { position: 'absolute', borderRadius: radius.lg, borderWidth: 1 },
});

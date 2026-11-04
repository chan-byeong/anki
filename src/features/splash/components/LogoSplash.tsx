import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path, Rect } from 'react-native-svg';

import { useMotion } from '@/hooks/use-motion';
import { useTheme } from '@/theme/ThemeProvider';
import { easeOut, space } from '@/theme/tokens';

const EASE_OUT = Easing.bezier(...easeOut);

// 캔버스 로고 보드의 심볼: 격자 64 × 80, 종이(모서리 10), 접힌 귀퉁이(18), 가운데 줄 28 × 4.
const GRID = { width: 64, height: 80 };
const CARD_PATH = 'M10 0H46L64 18V70A10 10 0 0 1 54 80H10A10 10 0 0 1 0 70V10A10 10 0 0 1 10 0Z';
const FOLD_PATH = 'M46 0V12A6 6 0 0 0 52 18H64Z';
// 세로 로크업(스플래시)의 크기: 심볼 40 × 50, 글자 24.
const SYMBOL = { width: 40, height: 50 };
const WORDMARK_SIZE = 24;
const GAP = 12;

// 로고 모션 "첫 장 놓기"(한장 로고·시그니처 보드): 종이가 아래에서 놓이고(240ms) → 줄이 가운데서 양옆으로 그어지고(160–320ms)
// → 귀퉁이가 오른쪽 위 꼭짓점에서 접힌다(240–400ms, 글자도 같이 페이드). 겹쳐서 400ms 안에 끝난다.
// 동작 줄이기에서는 움직임 없이 바로 보인다.
export const LOGO_LAND_DELAY = 0;
export const LOGO_LINE_DELAY = 160;
export const LOGO_FOLD_DELAY = 240;

interface LogoSplashProps {
  // 처음 그려진 순간 한 번 부른다. 네이티브 스플래시를 거두는 시점이다.
  onShown?: () => void;
}

export function LogoSplash({ onShown }: LogoSplashProps) {
  const { colors } = useTheme();
  const { motion, enter, shiftCard, reduced } = useMotion();
  const land = useSharedValue(reduced ? 1 : 0);
  const line = useSharedValue(reduced ? 1 : 0);
  const fold = useSharedValue(reduced ? 1 : 0);

  useEffect(() => {
    if (reduced) {
      land.value = 1;
      line.value = 1;
      fold.value = 1;
      return;
    }
    land.value = withDelay(LOGO_LAND_DELAY, withTiming(1, { duration: enter, easing: EASE_OUT }));
    line.value = withDelay(LOGO_LINE_DELAY, withTiming(1, { duration: motion, easing: EASE_OUT }));
    fold.value = withDelay(LOGO_FOLD_DELAY, withTiming(1, { duration: motion, easing: EASE_OUT }));
  }, [reduced, enter, motion, land, line, fold]);

  const landStyle = useAnimatedStyle(() => ({
    opacity: land.value,
    transform: [{ translateY: (1 - land.value) * shiftCard }],
  }));
  const lineStyle = useAnimatedStyle(() => ({ transform: [{ scaleX: line.value }] }));
  const foldStyle = useAnimatedStyle(() => ({ transform: [{ scale: fold.value }] }));
  const wordStyle = useAnimatedStyle(() => ({ opacity: fold.value }));

  return (
    <View
      accessible
      accessibilityLabel="한장"
      onLayout={onShown}
      style={[styles.screen, { backgroundColor: colors.bg }]}
    >
      <View aria-hidden style={styles.lockup}>
        <Animated.View testID="logo-symbol" style={[SYMBOL, landStyle]}>
          <Svg
            width={SYMBOL.width}
            height={SYMBOL.height}
            viewBox={`0 0 ${GRID.width} ${GRID.height}`}
          >
            <Path d={CARD_PATH} fill={colors.text} />
          </Svg>
          <Animated.View testID="logo-fold" style={[styles.layer, styles.foldOrigin, foldStyle]}>
            <Svg
              width={SYMBOL.width}
              height={SYMBOL.height}
              viewBox={`0 0 ${GRID.width} ${GRID.height}`}
            >
              <Path d={FOLD_PATH} fill={colors.line} />
            </Svg>
          </Animated.View>
          <Animated.View testID="logo-line" style={[styles.layer, lineStyle]}>
            <Svg
              width={SYMBOL.width}
              height={SYMBOL.height}
              viewBox={`0 0 ${GRID.width} ${GRID.height}`}
            >
              <Rect x={18} y={38} width={28} height={4} rx={2} fill={colors.surface} />
            </Svg>
          </Animated.View>
        </Animated.View>
        <Animated.View testID="logo-wordmark" style={wordStyle}>
          {/* 글꼴은 아직 불러오는 중일 수 있어 기본 글꼴로 그린다. 굵기 700, 자간 −4%. */}
          <Text style={[styles.wordmark, { color: colors.text }]}>한장</Text>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space[4] },
  lockup: { alignItems: 'center', gap: GAP },
  layer: { position: 'absolute', top: 0, left: 0, width: SYMBOL.width, height: SYMBOL.height },
  foldOrigin: { transformOrigin: 'top right' },
  wordmark: {
    fontSize: WORDMARK_SIZE,
    lineHeight: WORDMARK_SIZE,
    fontWeight: '700',
    letterSpacing: -WORDMARK_SIZE * 0.04,
  },
});

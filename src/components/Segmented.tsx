import { useEffect, useState, type Ref } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutRectangle,
  type ViewInstance,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { useMotion } from '../hooks/use-motion';
import { easeMove, radius, size, space } from '../theme/tokens';
import { useTheme } from '../theme/ThemeProvider';
import type { A11yLabelProps, A11yRoleProps, InheritedA11yProps } from './a11y';

// 접근성 프롭은 묶음(radiogroup)에 붙는다.
interface SegmentedProps<T extends string> extends InheritedA11yProps<
  A11yRoleProps | A11yLabelProps
> {
  // 묶음은 포커스를 받지 않으므로 지금 선택된 항목을 가리킨다.
  ref?: Ref<ViewInstance>;
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  // 3개는 208, 2개는 160처럼 호출 측이 정한다. 없으면 가로를 채운다.
  width?: number;
  // 그룹의 이름("테마", "주로 쓰는 손").
  label?: string;
}

export function Segmented<T extends string>({
  ref,
  options,
  value,
  onChange,
  width,
  label,
  ...a11y
}: SegmentedProps<T>) {
  const { colors, text } = useTheme();
  const { reduced, motion } = useMotion();
  // 각 칸의 자리. 다 재기 전에는 선택한 칸이 직접 바탕을 칠한다.
  const [layouts, setLayouts] = useState<Partial<Record<T, LayoutRectangle>>>({});
  const target = layouts[value];
  const x = useSharedValue(0);
  const thumbWidth = useSharedValue(0);
  const placed = useSharedValue(false);

  // 선택 바탕이 새 칸으로 미끄러진다. 처음 놓일 때와 동작 줄이기에서는 바로 옮긴다.
  useEffect(() => {
    if (!target) return;
    const duration = placed.value && !reduced ? motion : 0;
    const timing = { duration, easing: EASE_MOVE };
    x.value = withTiming(target.x, timing);
    thumbWidth.value = withTiming(target.width, timing);
    placed.value = true;
  }, [target, reduced, motion, x, thumbWidth, placed]);

  const thumbStyle = useAnimatedStyle(() => ({
    width: thumbWidth.value,
    transform: [{ translateX: x.value }],
  }));

  return (
    <View
      {...a11y}
      accessibilityRole="radiogroup"
      accessibilityLabel={label}
      style={[styles.group, { backgroundColor: colors.surface, width }]}
    >
      {target ? (
        <Animated.View
          testID="segmented-thumb"
          pointerEvents="none"
          style={[styles.thumb, { backgroundColor: colors.bg }, thumbStyle]}
        />
      ) : null}
      {options.map((option) => {
        const checked = option.value === value;
        return (
          <Pressable
            key={option.value}
            ref={checked ? ref : undefined}
            accessibilityRole="radio"
            accessibilityState={{ checked }}
            onPress={() => !checked && onChange(option.value)}
            onLayout={(event) => {
              const layout = event.nativeEvent.layout;
              setLayouts((current) => ({ ...current, [option.value]: layout }));
            }}
            // 항목은 36이지만 눌리는 영역은 touch(44)를 채운다.
            hitSlop={{ top: space[1], bottom: space[1] }}
            style={[styles.item, checked && !target && { backgroundColor: colors.bg }]}
          >
            {/* 선택은 바탕과 굵기로 표시해서 색에만 기대지 않는다. */}
            <Text
              style={[
                text('caption', { weight: checked ? 'bold' : 'regular' }),
                { color: checked ? colors.text : colors.muted },
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const EASE_MOVE = Easing.bezier(...easeMove);

const styles = StyleSheet.create({
  group: { flexDirection: 'row', padding: space[1], gap: space[1], borderRadius: radius.sm },
  item: {
    flex: 1,
    minHeight: size.touch - space[2],
    borderRadius: radius.sm - space[1],
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumb: {
    position: 'absolute',
    left: 0,
    top: space[1],
    bottom: space[1],
    borderRadius: radius.sm - space[1],
  },
});

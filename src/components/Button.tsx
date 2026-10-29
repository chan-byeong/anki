import type { Ref } from 'react';
import { Pressable, StyleSheet, Text, View, type ViewInstance } from 'react-native';
import Animated, { interpolate, useAnimatedStyle } from 'react-native-reanimated';

import { useMotion } from '../hooks/use-motion';
import { usePressProgress } from '../hooks/use-press-progress';
import { pressOpacity, radius, size as sizeToken, space } from '../theme/tokens';
import { useTheme } from '../theme/ThemeProvider';
import type { A11yLabelProps, A11yRoleProps, A11yStateProps, InheritedA11yProps } from './a11y';
import type { IconComponent } from './icons';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
export type ButtonSize = 'lg' | 'sm';

interface ButtonProps extends InheritedA11yProps<A11yRoleProps | A11yLabelProps | A11yStateProps> {
  // 접근성 포커스를 보낼 때 쓴다(Sheet 첫 포커스, 닫힌 뒤 트리거로 복귀).
  ref?: Ref<ViewInstance>;
  // 아이콘만 있는 버튼일 때는 접근성 라벨로만 쓰인다.
  label: string;
  // 화면 글자와 다른 이름이 필요할 때("懐かしい 복구"). 없으면 label(+count)을 읽는다.
  accessibilityLabel?: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  // "복습 시작 · 50장"처럼 라벨 뒤에 붙는 개수.
  count?: string;
  icon?: IconComponent;
  // ghost 버튼의 글자만 danger 색으로 칠한다("휴지통 비우기").
  dangerText?: boolean;
  disabled?: boolean;
}

export function Button({
  ref,
  label,
  accessibilityLabel,
  onPress,
  variant = 'primary',
  size = 'lg',
  count,
  icon: Icon,
  dangerText = false,
  disabled = false,
  ...a11y
}: ButtonProps) {
  const { colors, text } = useTheme();
  const { pressScale } = useMotion();
  const { progress, onPressIn, onPressOut } = usePressProgress();
  // 누르는 동안 줄어들고, 주 버튼은 조금 옅어진다. 비활성이면 Pressable이 누름을 받지 않는다.
  const dimmed = variant === 'primary' ? pressOpacity : 1;
  const pressStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [1, dimmed]),
    transform: [{ scale: interpolate(progress.value, [0, 1], [1, pressScale]) }],
  }));

  const enabled = {
    primary: { bg: colors.text, fg: colors.inverse },
    secondary: { bg: colors.surface, fg: colors.text },
    danger: { bg: colors.danger, fg: colors.inverse },
    ghost: { bg: 'transparent', fg: dangerText ? colors.danger : colors.text },
  }[variant];
  const palette = disabled
    ? { bg: variant === 'ghost' ? 'transparent' : colors.surface, fg: colors.muted }
    : enabled;

  const small = size === 'sm';
  const height = small ? sizeToken.touch : sizeToken.button;
  const labelStyle = [text(small ? 'caption' : 'body', { weight: 'bold' }), { color: palette.fg }];

  return (
    <Pressable
      {...a11y}
      ref={ref}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? (count ? `${label} ${count}` : label)}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      // 누름 영역은 그대로 두고 안쪽 면만 줄인다.
      style={Icon ? styles.iconBox : small ? styles.compactBox : styles.fillBox}
    >
      <Animated.View
        style={[
          styles.base,
          {
            backgroundColor: palette.bg,
            minHeight: height,
            borderRadius: small ? radius.sm : radius.full,
          },
          Icon ? styles.icon : small ? styles.compact : styles.fill,
          pressStyle,
        ]}
      >
        {Icon ? (
          <Icon color={palette.fg} />
        ) : (
          <View style={styles.content}>
            <Text style={labelStyle}>{label}</Text>
            {count ? (
              <>
                <Text style={[labelStyle, styles.sep]}>·</Text>
                <Text style={labelStyle}>{count}</Text>
              </>
            ) : null}
          </View>
        )}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fillBox: { alignSelf: 'stretch' },
  compactBox: { alignSelf: 'flex-start' },
  iconBox: { width: sizeToken.button },
  base: { alignItems: 'center', justifyContent: 'center' },
  fill: { paddingHorizontal: space[4] },
  compact: { paddingHorizontal: space[3] },
  icon: { width: sizeToken.button, minHeight: sizeToken.button },
  content: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  sep: { opacity: 0.6 },
});

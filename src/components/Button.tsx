import { Pressable, StyleSheet, Text, View } from 'react-native';

import { radius, size as sizeToken, space } from '../theme/tokens';
import { useTheme } from '../theme/ThemeProvider';
import type { IconComponent } from './icons';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
export type ButtonSize = 'lg' | 'sm';

interface ButtonProps {
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
  disabled?: boolean;
}

export function Button({
  label,
  accessibilityLabel,
  onPress,
  variant = 'primary',
  size = 'lg',
  count,
  icon: Icon,
  disabled = false,
}: ButtonProps) {
  const { colors, text } = useTheme();

  const palette = {
    primary: { bg: colors.text, fg: colors.inverse },
    secondary: { bg: colors.surface, fg: colors.text },
    danger: { bg: colors.danger, fg: colors.inverse },
    ghost: { bg: 'transparent', fg: colors.text },
  }[variant];

  const height = size === 'lg' ? sizeToken.button : sizeToken.touch;
  const iconOnly = Icon !== undefined;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? (count ? `${label} ${count}` : label)}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: palette.bg,
          minHeight: height,
          opacity: disabled ? 0.4 : pressed ? 0.7 : 1,
        },
        iconOnly ? { width: height } : size === 'lg' ? styles.fill : styles.compact,
      ]}
    >
      {Icon ? (
        <Icon color={palette.fg} />
      ) : (
        <View style={styles.content}>
          <Text style={[text('body', { weight: 'bold' }), { color: palette.fg }]}>{label}</Text>
          {count ? (
            <Text style={[text('body', { weight: 'bold' }), { color: palette.fg }]}>
              {' · '}
              {count}
            </Text>
          ) : null}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
  },
  fill: { alignSelf: 'stretch', paddingHorizontal: space[4] },
  compact: { alignSelf: 'flex-start', paddingHorizontal: space[3] },
  content: { flexDirection: 'row', alignItems: 'center' },
});

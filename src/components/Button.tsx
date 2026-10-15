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
  // ghost 버튼의 글자만 danger 색으로 칠한다("휴지통 비우기").
  dangerText?: boolean;
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
  dangerText = false,
  disabled = false,
}: ButtonProps) {
  const { colors, text } = useTheme();

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
          borderRadius: small ? radius.sm : radius.full,
          opacity: pressed ? 0.7 : 1,
        },
        Icon
          ? { width: sizeToken.button, minHeight: sizeToken.button }
          : small
            ? styles.compact
            : styles.fill,
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
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center' },
  fill: { alignSelf: 'stretch', paddingHorizontal: space[4] },
  compact: { alignSelf: 'flex-start', paddingHorizontal: space[3] },
  content: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  sep: { opacity: 0.6 },
});

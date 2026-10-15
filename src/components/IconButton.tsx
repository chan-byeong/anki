import { Pressable, StyleSheet } from 'react-native';

import { radius, size } from '../theme/tokens';
import { useTheme } from '../theme/ThemeProvider';
import type { IconComponent } from './icons';

export type IconButtonTone = 'text' | 'muted';

export interface IconButtonProps {
  icon: IconComponent;
  // 아이콘만 있으므로 접근성 이름이 유일한 이름이다. 목적지까지 적는다("설정으로").
  label: string;
  onPress?: () => void;
  tone?: IconButtonTone;
  // 켜고 끄는 버튼(메모 열기/닫기)의 현재 상태. 켜지면 바탕이 채워진다.
  pressed?: boolean;
  disabled?: boolean;
  iconSize?: number;
}

export function IconButton({
  icon: Icon,
  label,
  onPress,
  tone = 'text',
  pressed,
  disabled = false,
  iconSize,
}: IconButtonProps) {
  const { colors } = useTheme();
  const on = pressed === true;
  const color = on ? colors.inverse : tone === 'muted' ? colors.muted : colors.text;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled, ...(pressed === undefined ? {} : { selected: pressed }) }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed: touching }) => [
        styles.base,
        {
          backgroundColor: on ? colors.text : 'transparent',
          opacity: disabled ? 0.4 : touching ? 0.5 : 1,
        },
      ]}
    >
      <Icon color={color} size={iconSize ?? (tone === 'muted' ? 20 : 22)} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    width: size.touch,
    height: size.touch,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

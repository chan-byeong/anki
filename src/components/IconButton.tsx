import type { Ref } from 'react';
import { Pressable, StyleSheet, type ViewInstance } from 'react-native';

import { radius, size } from '../theme/tokens';
import { useTheme } from '../theme/ThemeProvider';
import type { A11yLabelProps, A11yRoleProps, A11yStateProps, InheritedA11yProps } from './a11y';
import type { IconComponent } from './icons';

export type IconButtonTone = 'text' | 'muted';

export interface IconButtonProps extends InheritedA11yProps<
  A11yRoleProps | A11yLabelProps | A11yStateProps
> {
  // 시트를 여는 버튼이면 닫힌 뒤 이 ref로 포커스를 되돌린다.
  ref?: Ref<ViewInstance>;
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
  ref,
  icon: Icon,
  label,
  onPress,
  tone = 'text',
  pressed,
  disabled = false,
  iconSize,
  ...a11y
}: IconButtonProps) {
  const { colors } = useTheme();
  const on = pressed === true;
  const color = on ? colors.inverse : tone === 'muted' ? colors.muted : colors.text;

  return (
    <Pressable
      {...a11y}
      ref={ref}
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

import { Pressable, StyleSheet } from 'react-native';

import { size } from '../theme/tokens';
import { useTheme } from '../theme/ThemeProvider';
import type { IconComponent } from './icons';

export type IconButtonTone = 'text' | 'muted';

export interface IconButtonProps {
  icon: IconComponent;
  // 아이콘만 있으므로 접근성 이름이 유일한 이름이다. 목적지까지 적는다("설정으로").
  label: string;
  onPress?: () => void;
  tone?: IconButtonTone;
  // 켜고 끄는 버튼(메모 열기/닫기)의 현재 상태.
  pressed?: boolean;
  iconSize?: number;
}

export function IconButton({
  icon: Icon,
  label,
  onPress,
  tone = 'text',
  pressed,
  iconSize,
}: IconButtonProps) {
  const { colors } = useTheme();
  const color = tone === 'muted' ? colors.muted : colors.text;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={pressed === undefined ? undefined : { selected: pressed }}
      onPress={onPress}
      style={({ pressed: touching }) => [styles.base, { opacity: touching ? 0.5 : 1 }]}
    >
      <Icon color={color} size={iconSize ?? (tone === 'muted' ? 20 : 22)} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    width: size.touch,
    height: size.touch,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

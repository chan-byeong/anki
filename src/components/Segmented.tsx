import type { Ref } from 'react';
import { Pressable, StyleSheet, Text, View, type ViewInstance } from 'react-native';

import { radius, size, space } from '../theme/tokens';
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

  return (
    <View
      {...a11y}
      accessibilityRole="radiogroup"
      accessibilityLabel={label}
      style={[styles.group, { backgroundColor: colors.surface, width }]}
    >
      {options.map((option) => {
        const checked = option.value === value;
        return (
          <Pressable
            key={option.value}
            ref={checked ? ref : undefined}
            accessibilityRole="radio"
            accessibilityState={{ checked }}
            onPress={() => !checked && onChange(option.value)}
            // 항목은 36이지만 눌리는 영역은 touch(44)를 채운다.
            hitSlop={{ top: space[1], bottom: space[1] }}
            style={[styles.item, checked && { backgroundColor: colors.bg }]}
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

const styles = StyleSheet.create({
  group: { flexDirection: 'row', padding: space[1], gap: space[1], borderRadius: radius.sm },
  item: {
    flex: 1,
    minHeight: size.touch - space[2],
    borderRadius: radius.sm - space[1],
    alignItems: 'center',
    justifyContent: 'center',
  },
});

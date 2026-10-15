import { Pressable, StyleSheet, Text, View } from 'react-native';

import { radius, size, space } from '../theme/tokens';
import { useTheme } from '../theme/ThemeProvider';

interface SegmentedProps<T extends string> {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  // 3개는 208, 2개는 160처럼 호출 측이 정한다. 없으면 가로를 채운다.
  width?: number;
  // 그룹의 이름("테마", "주로 쓰는 손").
  label?: string;
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  width,
  label,
}: SegmentedProps<T>) {
  const { colors, text } = useTheme();

  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={label}
      style={[styles.group, { backgroundColor: colors.surface, width }]}
    >
      {options.map((option) => {
        const checked = option.value === value;
        return (
          <Pressable
            key={option.value}
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

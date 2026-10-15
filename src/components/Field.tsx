import { useRef, type RefObject } from 'react';
import { Pressable, StyleSheet, Text, TextInput, type TextInputProps } from 'react-native';

import { space } from '../theme/tokens';
import { useTheme } from '../theme/ThemeProvider';

interface FieldProps extends Pick<
  TextInputProps,
  | 'value'
  | 'onChangeText'
  | 'placeholder'
  | 'multiline'
  | 'returnKeyType'
  | 'onSubmitEditing'
  | 'autoFocus'
  | 'blurOnSubmit'
> {
  label: string;
  size?: 'title' | 'body';
  // 선택 입력이면 이름표 뒤에 "(선택)"이 붙는다.
  optional?: boolean;
  // 일본어(lang="ja") 입력은 JP 글리프 글꼴을 쓴다.
  ja?: boolean;
  // 목록의 첫 칸은 위 여백이 좁다.
  first?: boolean;
  // 완료 키로 다음 칸으로 넘어갈 때 호출 측이 잡는 자리.
  inputRef?: RefObject<TextInput | null>;
}

export function Field({
  label,
  size = 'body',
  optional = false,
  ja = false,
  first = false,
  inputRef,
  ...input
}: FieldProps) {
  const { colors, text } = useTheme();
  const fallback = useRef<TextInput>(null);
  const ref = inputRef ?? fallback;
  const name = optional ? `${label} (선택)` : label;
  const valueStyle =
    size === 'title' ? text('title', { weight: 'bold', ja }) : text('body', { ja });

  return (
    // 이름표나 여백을 눌러도 입력 칸으로 들어간다.
    <Pressable
      accessible={false}
      onPress={() => ref.current?.focus()}
      style={[styles.field, { borderBottomColor: colors.line }, first && styles.first]}
    >
      <Text style={[text('caption'), { color: colors.muted }]}>{name}</Text>
      <TextInput
        ref={ref}
        {...input}
        accessibilityLabel={name}
        placeholderTextColor={colors.muted}
        cursorColor={colors.text}
        style={[valueStyle, styles.input]}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  field: { paddingVertical: space[3], borderBottomWidth: 1, gap: space[2] },
  first: { paddingTop: space[1] },
  // 기본 안쪽 여백을 없애 글자 위치가 캔버스의 .field-value와 맞는다.
  input: { padding: 0 },
});

import { Pressable, StyleSheet, Text, View } from 'react-native';

import { MemoIcon } from '@/components';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, size, space } from '@/theme/tokens';

interface ImportFileSummaryProps {
  name: string;
  // 파일 이름 아래 한 줄. 오류면 danger 색이다.
  status: string;
  danger?: boolean;
  onPickAnother: () => void;
  // 있으면 "지우기"를 더한다(덱 만들기에서 고른 파일을 빼는 데 쓴다).
  onRemove?: () => void;
  // 화면 가장자리 여백을 주지 않는다. 이미 여백이 있는 폼 안에서 쓴다.
  flush?: boolean;
  disabled?: boolean;
}

// 고른 파일의 이름과 읽은 결과(캔버스 Import-2, Import-3의 surface 상자).
export function ImportFileSummary({
  name,
  status,
  danger = false,
  onPickAnother,
  onRemove,
  flush = false,
  disabled = false,
}: ImportFileSummaryProps) {
  const { colors, text } = useTheme();

  return (
    <View style={[styles.box, flush ? null : styles.inset, { backgroundColor: colors.surface }]}>
      <MemoIcon color={colors.muted} size={20} />
      <View accessible accessibilityLabel={`${name}. ${status}`} role="status" style={styles.texts}>
        <Text numberOfLines={1} ellipsizeMode="tail" style={text('body', { weight: 'bold' })}>
          {name}
        </Text>
        <Text style={[text('caption'), { color: danger ? colors.danger : colors.muted }]}>
          {status}
        </Text>
      </View>
      <View>
        <TextButton label="다른 파일" onPress={onPickAnother} disabled={disabled} />
        {onRemove ? <TextButton label="지우기" onPress={onRemove} disabled={disabled} /> : null}
      </View>
    </View>
  );
}

interface TextButtonProps {
  label: string;
  onPress: () => void;
  disabled: boolean;
}

function TextButton({ label, onPress, disabled }: TextButtonProps) {
  const { text } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.action, { opacity: pressed || disabled ? 0.6 : 1 }]}
    >
      <Text style={text('caption', { weight: 'bold' })}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  box: {
    marginTop: space[2],
    paddingVertical: space[3],
    paddingLeft: space[3],
    paddingRight: space[1],
    borderRadius: radius.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
  },
  inset: { marginHorizontal: space[4] },
  texts: { flex: 1, minWidth: 0 },
  action: { minHeight: size.touch, paddingHorizontal: size.edgeIcon, justifyContent: 'center' },
});

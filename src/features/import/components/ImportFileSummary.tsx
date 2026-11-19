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
}

// 고른 파일의 이름과 읽은 결과(캔버스 Import-2, Import-3의 surface 상자).
export function ImportFileSummary({
  name,
  status,
  danger = false,
  onPickAnother,
}: ImportFileSummaryProps) {
  const { colors, text } = useTheme();

  return (
    <View style={[styles.box, { backgroundColor: colors.surface }]}>
      <MemoIcon color={colors.muted} size={20} />
      <View accessible accessibilityLabel={`${name}. ${status}`} role="status" style={styles.texts}>
        <Text numberOfLines={1} ellipsizeMode="tail" style={text('body', { weight: 'bold' })}>
          {name}
        </Text>
        <Text style={[text('caption'), { color: danger ? colors.danger : colors.muted }]}>
          {status}
        </Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="다른 파일"
        onPress={onPickAnother}
        style={({ pressed }) => [styles.another, { opacity: pressed ? 0.6 : 1 }]}
      >
        <Text style={text('caption', { weight: 'bold' })}>다른 파일</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    marginHorizontal: space[4],
    marginTop: space[2],
    paddingVertical: space[3],
    paddingLeft: space[3],
    paddingRight: space[1],
    borderRadius: radius.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
  },
  texts: { flex: 1, minWidth: 0 },
  another: { minHeight: size.touch, paddingHorizontal: size.edgeIcon, justifyContent: 'center' },
});

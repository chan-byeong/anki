import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { size, space } from '@/theme/tokens';

// 덱 상세의 카드 한 줄. 캔버스에서 공통 컴포넌트로 묶지 않은 "카드 행"이라 화면 전용 조각으로 둔다.
// 긴 앞면·뒷면이 잘리지 않도록 줄 수를 제한하지 않는다(ListRow는 한 줄로 자른다).
// 줄을 누르면 카드를 열어 편집한다.
interface CardRowProps {
  front: string;
  back: string;
  // 복습 이력이 없는 카드의 표시. 복습일 표기는 STA-118에서 더한다.
  status: string;
  onPress: () => void;
  last?: boolean;
}

export function CardRow({ front, back, status, onPress, last = false }: CardRowProps) {
  const { colors, text } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${front}, ${back}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        {
          borderBottomColor: colors.line,
          borderBottomWidth: last ? 0 : 1,
          opacity: pressed ? 0.6 : 1,
        },
      ]}
    >
      <View style={styles.texts}>
        <Text style={text('body', { weight: 'bold' })}>{front}</Text>
        <Text style={[text('caption'), { color: colors.muted }]}>{back}</Text>
      </View>
      <Text style={[text('caption'), { color: colors.muted }]}>{status}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: size.row,
    paddingVertical: space[2],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space[3],
  },
  texts: { flex: 1, gap: space[1] },
});

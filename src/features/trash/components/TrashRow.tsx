import { StyleSheet, Text, View } from 'react-native';

import { DeckIcon } from '@/components';
import { useTheme } from '@/theme/ThemeProvider';
import { size, space } from '@/theme/tokens';

// 휴지통의 한 줄(Trash-1). 덱이면 제목 아래에 덱 아이콘이 붙는다.
// 복구와 영구 삭제는 STA-132, STA-133에서 줄에 더하므로 지금은 눌리지 않는다.
interface TrashRowProps {
  title: string;
  sub: string;
  deck?: boolean;
  last?: boolean;
}

export function TrashRow({ title, sub, deck = false, last = false }: TrashRowProps) {
  const { colors, text } = useTheme();

  return (
    <View
      accessible
      accessibilityLabel={deck ? `덱 ${title}, ${sub}` : `${title}, ${sub}`}
      style={[styles.row, { borderBottomColor: colors.line, borderBottomWidth: last ? 0 : 1 }]}
    >
      <Text style={text('body', { weight: 'bold' })} numberOfLines={1}>
        {title}
      </Text>
      <View style={styles.sub}>
        {deck ? <DeckIcon color={colors.muted} /> : null}
        <Text style={[text('caption'), styles.subText, { color: colors.muted }]} numberOfLines={1}>
          {sub}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { minHeight: size.row, paddingVertical: space[2], justifyContent: 'center' },
  sub: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  subText: { flexShrink: 1 },
});

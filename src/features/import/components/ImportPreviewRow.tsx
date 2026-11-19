import { StyleSheet, Text, View } from 'react-native';

import { HintIcon, MemoIcon } from '@/components';
import type { ImportCard } from '@/features/import/read-import-file';
import { useTheme } from '@/theme/ThemeProvider';
import { size, space } from '@/theme/tokens';

// 가져올 카드 한 줄(캔버스 Import-2). 메모가 있으면 뒷면 옆에 메모 아이콘을 둔다. 힌트도 같은 모양으로 알린다.
interface ImportPreviewRowProps {
  card: ImportCard;
  last: boolean;
}

export function ImportPreviewRow({ card, last }: ImportPreviewRowProps) {
  const { colors, text } = useTheme();
  const extras = [card.memo !== null ? '메모 있음' : null, card.hint !== null ? '힌트 있음' : null];
  const label = [`${card.front}, ${card.back}`, ...extras.filter(Boolean)].join(', ');

  return (
    <View
      accessible
      accessibilityLabel={label}
      style={[styles.row, { borderBottomColor: colors.line, borderBottomWidth: last ? 0 : 1 }]}
    >
      <Text style={text('body', { weight: 'bold' })}>{card.front}</Text>
      <View style={styles.sub}>
        <Text style={[text('caption'), styles.back, { color: colors.muted }]}>{card.back}</Text>
        {card.memo !== null ? <MemoIcon color={colors.muted} size={14} /> : null}
        {card.hint !== null ? <HintIcon color={colors.muted} size={14} /> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { minHeight: size.row, paddingVertical: space[2], justifyContent: 'center' },
  sub: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  back: { flexShrink: 1 },
});

import { StyleSheet, Text, View } from 'react-native';

import { AlertCircleIcon } from '@/components';
import { skipNotes } from '@/features/import/skip-notes';
import type { SkippedLine } from '@/features/import/read-import-file';
import { useTheme } from '@/theme/ThemeProvider';
import { space } from '@/theme/tokens';

// 건너뛰는 카드의 사유(캔버스 Import-2). 같은 앞면은 warn, 앞면·뒷면 없음은 danger 색 아이콘이다.
interface SkipNotesProps {
  skipped: readonly SkippedLine[];
  // 화면 가장자리 여백을 주지 않는다. 이미 여백이 있는 폼 안에서 쓴다.
  flush?: boolean;
}

export function SkipNotes({ skipped, flush = false }: SkipNotesProps) {
  const { colors, text } = useTheme();
  const notes = skipNotes(skipped);
  if (notes.length === 0) return null;

  return (
    <View
      accessibilityRole="list"
      accessibilityLabel="건너뛰는 카드"
      style={[styles.list, flush ? styles.flush : null]}
    >
      {notes.map(({ reason, text: note }) => (
        <View key={reason} accessible accessibilityLabel={note} style={styles.item}>
          <View aria-hidden style={styles.icon}>
            <AlertCircleIcon
              color={reason === 'duplicate-front' ? colors.warn : colors.danger}
              size={16}
            />
          </View>
          <Text style={[text('caption'), styles.note, { color: colors.muted }]}>{note}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { marginTop: space[3], marginHorizontal: space[4], gap: space[2] },
  flush: { marginHorizontal: 0 },
  item: { flexDirection: 'row', alignItems: 'flex-start', gap: space[2] },
  icon: { paddingTop: 1 },
  note: { flex: 1 },
});

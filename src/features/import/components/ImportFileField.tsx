import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ChevronRightIcon } from '@/components';
import { useTheme } from '@/theme/ThemeProvider';
import { size, space } from '@/theme/tokens';

import type { PickedImport } from '../use-picked-import';
import { ImportFileSummary } from './ImportFileSummary';
import { SkipNotes } from './SkipNotes';

interface ImportFileFieldProps {
  picked: PickedImport;
  // 저장하는 동안에는 파일을 바꾸지 못한다.
  disabled?: boolean;
}

// 덱 만들기 폼의 "파일로 카드 넣기"(선택). 캔버스 DeckForm-1에는 없어서, 발음 언어 아래 같은 라벨 모양과
// "다른 언어" 행 모양으로 더했다. 파일을 고르면 요약 상자로 바뀐다.
export function ImportFileField({ picked, disabled = false }: ImportFileFieldProps) {
  const { colors, text } = useTheme();
  const { file, outcome } = picked;

  return (
    <View style={styles.section}>
      <Text style={[text('caption'), { color: colors.muted }]}>파일로 카드 넣기 · 선택</Text>
      <Text style={[text('caption'), styles.description, { color: colors.muted }]}>
        탭으로 나눈 .md, .txt, .tsv 파일의 카드를 덱과 함께 한 번에 넣어요.
      </Text>
      {file === null || outcome === null || outcome.kind === 'loading' ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="파일로 카드 넣기, 파일 고르기"
          accessibilityState={{ disabled: disabled || picked.picking }}
          disabled={disabled || picked.picking}
          onPress={() => void picked.pick()}
          style={({ pressed }) => [styles.row, { opacity: pressed ? 0.6 : 1 }]}
        >
          <Text style={[text('body'), { color: colors.muted }]}>파일 고르기</Text>
          <ChevronRightIcon color={colors.muted} size={18} />
        </Pressable>
      ) : (
        <>
          <ImportFileSummary
            flush
            name={file.name}
            status={outcome.status}
            danger={outcome.kind === 'guide'}
            onPickAnother={() => void picked.pick()}
            onRemove={picked.clear}
            disabled={disabled || picked.picking}
          />
          <SkipNotes flush skipped={outcome.skipped} />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { paddingTop: space[4] },
  description: { paddingBottom: space[2] },
  row: {
    minHeight: size.button,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});

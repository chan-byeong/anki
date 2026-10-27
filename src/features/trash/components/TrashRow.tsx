import { useRef, type RefObject } from 'react';
import { Pressable, StyleSheet, Text, View, type ViewInstance } from 'react-native';

import { Button, DeckIcon } from '@/components';
import { useTheme } from '@/theme/ThemeProvider';
import { size, space } from '@/theme/tokens';

// 휴지통의 한 줄(Trash-1, Trash-2). 덱이면 제목 아래에 덱 아이콘이 붙는다.
// 오른쪽 "복구"는 줄과 따로 눌린다. onOpen이 있으면 줄을 눌러 시트를 연다.
// 시트가 닫힌 뒤 포커스를 돌려주도록 누른 요소의 ref를 함께 넘긴다(ADR 0007).
interface TrashRowProps {
  title: string;
  sub: string;
  deck?: boolean;
  last?: boolean;
  onRestore: (trigger: RefObject<ViewInstance | null>) => void;
  onOpen?: (trigger: RefObject<ViewInstance | null>) => void;
}

export function TrashRow({
  title,
  sub,
  deck = false,
  last = false,
  onRestore,
  onOpen,
}: TrashRowProps) {
  const { colors, text } = useTheme();
  const mainRef = useRef<ViewInstance>(null);
  const restoreRef = useRef<ViewInstance>(null);
  const label = deck ? `덱 ${title}, ${sub}` : `${title}, ${sub}`;

  const body = (
    <>
      <Text style={text('body', { weight: 'bold' })} numberOfLines={1}>
        {title}
      </Text>
      <View style={styles.sub}>
        {deck ? <DeckIcon color={colors.muted} /> : null}
        <Text style={[text('caption'), styles.subText, { color: colors.muted }]} numberOfLines={1}>
          {sub}
        </Text>
      </View>
    </>
  );

  return (
    <View style={[styles.row, { borderBottomColor: colors.line, borderBottomWidth: last ? 0 : 1 }]}>
      {onOpen ? (
        <Pressable
          ref={mainRef}
          accessibilityRole="button"
          accessibilityLabel={label}
          aria-haspopup="dialog"
          onPress={() => onOpen(mainRef)}
          style={({ pressed }) => [styles.main, { opacity: pressed ? 0.6 : 1 }]}
        >
          {body}
        </Pressable>
      ) : (
        <View accessible accessibilityLabel={label} style={styles.main}>
          {body}
        </View>
      )}
      <Button
        ref={restoreRef}
        variant="secondary"
        size="sm"
        label="복구"
        accessibilityLabel={`${title} 복구`}
        onPress={() => onRestore(restoreRef)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  main: {
    flex: 1,
    minWidth: 0,
    minHeight: size.row,
    paddingVertical: space[2],
    justifyContent: 'center',
  },
  sub: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  subText: { flexShrink: 1 },
});

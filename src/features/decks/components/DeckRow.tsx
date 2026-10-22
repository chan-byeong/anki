import { Pressable, StyleSheet, Text, View } from 'react-native';

import { CheckIcon, IconButton, MoreIcon } from '@/components';
import { useTheme } from '@/theme/ThemeProvider';
import { size, space } from '@/theme/tokens';

// 홈의 덱 한 줄. 캔버스에서 공통 컴포넌트로 묶지 않은 "덱 행"이라 화면 전용 조각으로 둔다.
// 복습할 카드가 있으면 줄을 눌러 복습을 시작하고 끝의 버튼으로 덱 상세에 들어간다.
// 없으면 이름을 흐리게 하고 체크를 붙이며, 줄을 누르면 덱 상세로 간다.
interface DeckRowProps {
  name: string;
  todayCount: number;
  onStartReview: () => void;
  onOpenDeck: () => void;
  // 목록의 마지막 행은 아래 선이 없다.
  last?: boolean;
}

export function DeckRow({
  name,
  todayCount,
  onStartReview,
  onOpenDeck,
  last = false,
}: DeckRowProps) {
  const { colors, text } = useTheme();
  const done = todayCount === 0;

  return (
    <View style={[styles.row, { borderBottomColor: colors.line, borderBottomWidth: last ? 0 : 1 }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          done ? `${name} 덱 상세, 오늘 복습 끝` : `${name} 복습 시작, ${todayCount}장`
        }
        onPress={done ? onOpenDeck : onStartReview}
        style={({ pressed }) => [styles.main, { opacity: pressed ? 0.6 : 1 }]}
      >
        {done ? (
          <>
            <Text style={[text('body'), styles.name, { color: colors.muted }]} numberOfLines={1}>
              {name}
            </Text>
            <CheckIcon color={colors.muted} size={20} />
          </>
        ) : (
          <>
            <Text style={[text('body', { weight: 'bold' }), styles.name]} numberOfLines={1}>
              {name}
            </Text>
            <Text style={[text('body', { weight: 'bold' }), styles.count]}>{todayCount}</Text>
          </>
        )}
      </Pressable>
      {done ? (
        <View style={styles.spacer} />
      ) : (
        <View style={styles.trailing}>
          <IconButton icon={MoreIcon} tone="muted" label={`${name} 덱 상세`} onPress={onOpenDeck} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { minHeight: size.row, flexDirection: 'row', alignItems: 'center', gap: space[1] },
  main: {
    flex: 1,
    minHeight: size.row,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space[3],
  },
  name: { flexShrink: 1 },
  count: { fontVariant: ['tabular-nums'] },
  trailing: { marginRight: -size.edgeIcon },
  spacer: { width: size.touch },
});

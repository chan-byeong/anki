import { Pressable, StyleSheet, Text, View } from 'react-native';

import { CheckIcon, IconButton, MoreIcon } from '@/components';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, size, space } from '@/theme/tokens';

// 홈의 덱 한 줄. 캔버스에서 공통 컴포넌트로 묶지 않은 "덱 행"이라 화면 전용 조각으로 둔다.
// 복습할 카드가 있으면 줄을 눌러 복습을 시작하고 끝의 버튼으로 덱 상세에 들어간다.
// 없으면 이름을 흐리게 하고 체크를 붙이며, 줄을 누르면 덱 상세로 간다.
// 줄을 길게 누르면 여러 덱 선택 모드로 들어간다. 선택 모드에서는 앞에 체크 칸이 붙고, 줄을 누르면 덱 상세가 열린다.
interface DeckRowProps {
  name: string;
  todayCount: number;
  onStartReview: () => void;
  onOpenDeck: () => void;
  // 길게 눌러 선택 모드에 들어간다. 복습할 카드가 없는 덱에서는 쓰지 않는다.
  onEnterSelect?: () => void;
  // 선택 모드면 선택 여부(true/false)를, 아니면 undefined를 준다.
  selected?: boolean;
  onToggleSelect?: () => void;
  // 목록의 마지막 행은 아래 선이 없다.
  last?: boolean;
}

export function DeckRow({
  name,
  todayCount,
  onStartReview,
  onOpenDeck,
  onEnterSelect,
  selected,
  onToggleSelect,
  last = false,
}: DeckRowProps) {
  const { colors, text } = useTheme();
  const done = todayCount === 0;

  if (selected !== undefined) {
    return (
      <View
        style={[styles.row, { borderBottomColor: colors.line, borderBottomWidth: last ? 0 : 1 }]}
      >
        {done ? (
          <View style={styles.checkSpace} />
        ) : (
          <Pressable
            accessibilityRole="checkbox"
            accessibilityLabel={`${name} 복습에 포함`}
            accessibilityState={{ checked: selected }}
            onPress={onToggleSelect}
            style={styles.check}
          >
            {selected ? (
              <View style={[styles.circle, { backgroundColor: colors.text }]}>
                <CheckIcon color={colors.inverse} size={14} strokeWidth={3} />
              </View>
            ) : (
              <View style={[styles.circle, { borderColor: colors.muted, borderWidth: 1.5 }]} />
            )}
          </Pressable>
        )}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={done ? `${name} 열기, 오늘 복습 끝` : `${name} 열기`}
          onPress={onOpenDeck}
          style={({ pressed }) => [styles.main, { opacity: pressed ? 0.6 : 1 }]}
        >
          <Text
            style={[
              // 캔버스: 오늘 끝난 덱은 굵지 않은 muted, 선택하지 않은 덱은 굵은 muted다.
              text('body', { weight: done ? 'regular' : 'bold' }),
              styles.name,
              done || !selected ? { color: colors.muted } : null,
            ]}
            numberOfLines={1}
          >
            {name}
          </Text>
          {done ? (
            <CheckIcon color={colors.muted} size={20} />
          ) : (
            <Text
              style={[
                text('body', { weight: 'bold' }),
                styles.count,
                selected ? null : { color: colors.muted },
              ]}
            >
              {todayCount}
            </Text>
          )}
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.row, { borderBottomColor: colors.line, borderBottomWidth: last ? 0 : 1 }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          done ? `${name} 덱 상세, 오늘 복습 끝` : `${name} 복습 시작, ${todayCount}장`
        }
        onPress={done ? onOpenDeck : onStartReview}
        onLongPress={done ? undefined : onEnterSelect}
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
  // 체크 칸은 줄의 왼쪽 여백(edgeIcon)만큼 바깥으로 당겨 이름 글자가 일반 줄과 맞게 한다.
  check: {
    width: size.touch,
    height: size.touch,
    marginLeft: -size.edgeIcon,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkSpace: { width: size.touch, marginLeft: -size.edgeIcon },
  circle: {
    width: 22,
    height: 22,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

import { Pressable, StyleSheet, Text, View } from 'react-native';

import { CheckIcon, IconButton, MoreIcon } from '@/components';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, size, space } from '@/theme/tokens';

// 홈의 덱 한 줄. 캔버스에서 공통 컴포넌트로 묶지 않은 "덱 행"이라 화면 전용 조각으로 둔다.
// 이름 아래에 덱의 카드 수를 두고, 줄 끝에 메뉴 버튼을 둔다.
// 줄을 누르면 복습을 시작한다. 오늘 복습할 카드가 없으면 이름을 흐리게 하고 체크를 붙이며,
// 누르면 덱의 모든 카드로 복습한다. 카드가 하나도 없는 덱만 덱 상세로 간다.
// 줄을 길게 누르면 여러 덱 선택 모드로 들어간다. 선택 모드에서는 앞에 체크 칸이 붙고, 줄을 누르면 고르거나 뺀다.
// 카드가 없는 덱은 고를 것이 없어 체크 칸이 없고 눌러도 아무 일도 없다.
interface DeckRowProps {
  name: string;
  todayCount: number;
  // 덱에 있는 카드 수. 오늘 복습이 끝나도 보인다.
  cardCount: number;
  onStartReview: () => void;
  onOpenDeck: () => void;
  // 줄 끝 버튼이 여는 메뉴(덱 상세, 여러 덱 선택). 길게 누르기가 어려운 사용자의 진입 방법이다.
  onOpenMenu: () => void;
  // 길게 눌러 선택 모드에 들어간다. 카드가 없는 덱에서는 쓰지 않는다.
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
  cardCount,
  onStartReview,
  onOpenDeck,
  onOpenMenu,
  onEnterSelect,
  selected,
  onToggleSelect,
  last = false,
}: DeckRowProps) {
  const { colors, text } = useTheme();
  const done = todayCount === 0;
  const empty = cardCount === 0;
  const total = `전체 ${cardCount}장`;
  const sub = (
    <Text style={[text('caption'), { color: colors.muted }]} numberOfLines={1}>
      {`${cardCount}장`}
    </Text>
  );
  const doneMark = (
    <View style={styles.doneMark}>
      <CheckIcon color={colors.muted} size={20} />
    </View>
  );

  if (selected !== undefined) {
    const body = (
      <>
        <View style={styles.text}>
          <Text
            style={[
              // 캔버스: 고른 덱은 굵은 text, 고르지 않은 덱은 muted다. 오늘 끝난 덱은 고르기 전까지 굵지 않다.
              text('body', { weight: done && !selected ? 'regular' : 'bold' }),
              selected ? null : { color: colors.muted },
            ]}
            numberOfLines={1}
          >
            {name}
          </Text>
          {sub}
        </View>
        {done ? (
          doneMark
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
      </>
    );

    if (empty) {
      return (
        <View
          accessible
          accessibilityLabel={`${name}, ${total}`}
          style={[styles.row, { borderBottomColor: colors.line, borderBottomWidth: last ? 0 : 1 }]}
        >
          <View style={styles.checkSpace} />
          <View style={styles.main}>{body}</View>
        </View>
      );
    }

    // 줄 전체가 체크 칸 하나다. 체크 원을 눌러도, 이름을 눌러도 고르거나 뺀다.
    return (
      <Pressable
        accessibilityRole="checkbox"
        accessibilityLabel={
          done
            ? `${name} 복습에 포함, 전체 카드 ${cardCount}장`
            : `${name} 복습에 포함, ${todayCount}장`
        }
        accessibilityState={{ checked: selected }}
        onPress={onToggleSelect}
        style={({ pressed }) => [
          styles.row,
          { borderBottomColor: colors.line, borderBottomWidth: last ? 0 : 1 },
          { opacity: pressed ? 0.6 : 1 },
        ]}
      >
        <View style={styles.check}>
          {selected ? (
            <View style={[styles.circle, { backgroundColor: colors.text }]}>
              <CheckIcon color={colors.inverse} size={14} strokeWidth={3} />
            </View>
          ) : (
            <View style={[styles.circle, { borderColor: colors.muted, borderWidth: 1.5 }]} />
          )}
        </View>
        <View style={styles.main}>{body}</View>
      </Pressable>
    );
  }

  return (
    <View style={[styles.row, { borderBottomColor: colors.line, borderBottomWidth: last ? 0 : 1 }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          empty
            ? `${name} 덱 상세, 오늘 복습 끝, ${total}`
            : done
              ? `${name} 복습 시작, 오늘 복습 끝, ${total}`
              : `${name} 복습 시작, ${todayCount}장, ${total}`
        }
        onPress={empty ? onOpenDeck : onStartReview}
        onLongPress={empty ? undefined : onEnterSelect}
        // 스크린 리더는 길게 누르기 대신 사용자 지정 동작으로 선택 모드에 들어간다.
        accessibilityActions={
          empty || !onEnterSelect ? undefined : [{ name: 'select', label: '여러 덱 선택' }]
        }
        onAccessibilityAction={(event) => {
          if (event.nativeEvent.actionName === 'select') onEnterSelect?.();
        }}
        style={({ pressed }) => [styles.main, { opacity: pressed ? 0.6 : 1 }]}
      >
        <View style={styles.text}>
          <Text
            style={[
              text('body', { weight: done ? 'regular' : 'bold' }),
              done ? { color: colors.muted } : null,
            ]}
            numberOfLines={1}
          >
            {name}
          </Text>
          {sub}
        </View>
        {done ? (
          doneMark
        ) : (
          <Text style={[text('body', { weight: 'bold' }), styles.count]}>{todayCount}</Text>
        )}
      </Pressable>
      <View style={styles.trailing}>
        <IconButton icon={MoreIcon} tone="muted" label={`${name} 메뉴`} onPress={onOpenMenu} />
      </View>
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
  text: { flexShrink: 1 },
  count: { fontVariant: ['tabular-nums'] },
  // 체크 그림은 24 격자에서 오른쪽 4만큼 비어 있다. 그만큼 당겨 체크 끝을 다른 줄의 숫자 끝과 맞춘다.
  doneMark: { marginRight: -(20 / 24) * 4 },
  trailing: { marginRight: -size.edgeIcon },
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

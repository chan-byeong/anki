import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { CheckIcon, CountText, IconButton, MoreIcon } from '@/components';
import { useMotion } from '@/hooks/use-motion';
import { useTheme } from '@/theme/ThemeProvider';
import { easeIn, easeMove, easeOut, motionHold, radius, size, space } from '@/theme/tokens';
import { haptic } from '@/utils/haptics';

const EASE_OUT = Easing.bezier(...easeOut);
const EASE_IN = Easing.bezier(...easeIn);
const EASE_MOVE = Easing.bezier(...easeMove);

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
  const { reduced, motion, press } = useMotion();
  const done = todayCount === 0;
  const empty = cardCount === 0;
  const selecting = selected !== undefined;

  // 선택 원 칸(캔버스 Motion "길게 눌러 선택"): 선택 모드에 들어가면 160ms easeOut으로 열려 행이 오른쪽으로 밀리고,
  // 끝내면 160ms easeIn으로 접힌다. 동작 줄이기에서는 바로 열리고 접힌다.
  const column = useSharedValue(selecting ? 1 : 0);
  useEffect(() => {
    const to = selecting ? 1 : 0;
    column.value = reduced
      ? to
      : withTiming(to, { duration: motion, easing: selecting ? EASE_OUT : EASE_IN });
  }, [selecting, reduced, motion, column]);
  // 닫힌 칸은 너비 0이고, 행의 gap(space-1)도 상쇄해 이름 글자가 제자리에 있게 한다.
  const columnStyle = useAnimatedStyle(() => ({
    width: column.value * size.touch,
    marginLeft: -column.value * size.edgeIcon,
    marginRight: -(1 - column.value) * space[1],
  }));
  const dotStyle = useAnimatedStyle(() => ({ transform: [{ scale: 0.8 + 0.2 * column.value }] }));

  // 누름 바탕: 길게 눌러 선택할 수 있는 행은 바탕이 400ms linear로 차오른다(판정까지 남은 시간).
  // 그 밖의 누름은 100ms easeMove. 떼면 100ms easeMove로 돌아간다.
  const holdable = !selecting && !empty && onEnterSelect !== undefined;
  const fill = useSharedValue(0);
  const pressIn = () => {
    fill.value = withTiming(
      1,
      holdable
        ? { duration: motionHold, easing: Easing.linear }
        : { duration: press, easing: EASE_MOVE },
    );
  };
  const pressOut = () => {
    fill.value = withTiming(0, { duration: press, easing: EASE_MOVE });
  };
  // 선택 모드가 바뀌면 행이 다시 만들어져, 누르고 있던 행에는 onPressOut이 오지 않는다. 바탕을 여기서 되돌린다.
  useEffect(() => {
    fill.value = withTiming(0, { duration: press, easing: EASE_MOVE });
  }, [selecting, press, fill]);
  const fillStyle = useAnimatedStyle(() => ({ opacity: fill.value }));
  const fillLayer = (
    <Animated.View
      // 카드 없는 덱은 선택 전후로 바깥 View가 그대로라, key가 없으면 선택 칸 뷰를 이 바탕이 물려받아 칸의 너비가 남는다.
      key="fill"
      testID="deck-row-pressed"
      pointerEvents="none"
      style={[styles.touch, { backgroundColor: colors.surface }, fillStyle]}
    />
  );
  const enterSelect = () => {
    haptic.select();
    onEnterSelect?.();
  };
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
          <CountText
            value={todayCount}
            style={[
              text('body', { weight: 'bold' }),
              styles.count,
              selected ? null : { color: colors.muted },
            ]}
          />
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
          <Animated.View key="column" style={[styles.check, columnStyle]} />
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
        onPressIn={pressIn}
        onPressOut={pressOut}
        style={[styles.row, { borderBottomColor: colors.line, borderBottomWidth: last ? 0 : 1 }]}
      >
        {fillLayer}
        <Animated.View key="column" style={[styles.check, columnStyle]}>
          <Animated.View style={dotStyle}>
            {selected ? (
              <View style={[styles.circle, { backgroundColor: colors.text }]}>
                <CheckIcon color={colors.inverse} size={14} strokeWidth={3} />
              </View>
            ) : (
              <View style={[styles.circle, { borderColor: colors.muted, borderWidth: 1.5 }]} />
            )}
          </Animated.View>
        </Animated.View>
        <View style={styles.main}>{body}</View>
      </Pressable>
    );
  }

  return (
    <View style={[styles.row, { borderBottomColor: colors.line, borderBottomWidth: last ? 0 : 1 }]}>
      {fillLayer}
      {/* 선택을 끝낼 때 접히는 선택 원 칸. 다 접히면 너비 0이다. */}
      <Animated.View key="column" aria-hidden style={[styles.check, columnStyle]} />
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
        onLongPress={empty || !onEnterSelect ? undefined : enterSelect}
        delayLongPress={motionHold}
        onPressIn={pressIn}
        onPressOut={pressOut}
        // 스크린 리더는 길게 누르기 대신 사용자 지정 동작으로 선택 모드에 들어간다.
        accessibilityActions={
          empty || !onEnterSelect ? undefined : [{ name: 'select', label: '여러 덱 선택' }]
        }
        onAccessibilityAction={(event) => {
          if (event.nativeEvent.actionName === 'select') onEnterSelect?.();
        }}
        style={styles.main}
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
          // 복습을 마치고 돌아오면 남은 장 수가 위로 바뀐다.
          <CountText value={todayCount} style={[text('body', { weight: 'bold' }), styles.count]} />
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
  // 너비와 왼쪽 당김(edgeIcon)은 열린 정도에 따라 columnStyle이 정한다. 접히는 동안 원이 삐져나오지 않게 자른다.
  check: {
    height: size.touch,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  // 누르는 동안의 바탕은 행이 놓인 화면 여백(space-4)까지 채운다(ListRow와 같다).
  touch: { position: 'absolute', top: 0, bottom: 0, left: -space[4], right: -space[4] },
  circle: {
    width: 22,
    height: 22,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

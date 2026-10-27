import { useState } from 'react';
import { Pressable, StyleSheet, Text, View, type AccessibilityActionEvent } from 'react-native';

import { ChevronLeftIcon, ChevronRightIcon, IconButton } from '@/components';
import { mixColor } from '@/theme/mix-color';
import { useTheme } from '@/theme/ThemeProvider';
import { space } from '@/theme/tokens';
import { formatCount } from '@/utils/format-count';

import { dayLabel, type CalendarDay, type CalendarLevel } from '../review-calendar';

const CELL = 12;
const GAP = 3;
// 캔버스의 color-mix(var(--text) N%, var(--surface)). 0단계는 surface, 4단계는 text다.
const LEVEL_RATIO: Record<CalendarLevel, number> = { 0: 0, 1: 0.22, 2: 0.45, 3: 0.7, 4: 1 };
const LEVELS: CalendarLevel[] = [0, 1, 2, 3, 4];

interface ReviewCalendarProps {
  // calendarWeeks의 결과. 열이 주, 행이 요일이다.
  weeks: (CalendarDay | null)[][];
  today: number;
}

// 최근 18주 복습 달력. 칸이 작아 칸마다 누르게 하지 않고, 고른 날 하나를 글자로 보여 주며 버튼이나 조절 동작으로 옮긴다.
export function ReviewCalendar({ weeks, today }: ReviewCalendarProps) {
  const { colors, text } = useTheme();
  const [selected, setSelected] = useState(today);

  const days = weeks.flat().filter((day): day is CalendarDay => day !== null);
  const first = days[0].studyDay;
  const day = days.find(({ studyDay }) => studyDay === selected) ?? days[days.length - 1];
  const reviewed = days.filter(({ count }) => count > 0).length;
  const name = day.studyDay === today ? '오늘' : dayLabel(day.studyDay);
  const count = `${formatCount(day.count)}장`;
  const fill = (level: CalendarLevel) => mixColor(colors.text, colors.surface, LEVEL_RATIO[level]);

  const move = (by: number) => setSelected(Math.min(today, Math.max(first, day.studyDay + by)));

  const onAction = ({ nativeEvent }: AccessibilityActionEvent) => {
    if (nativeEvent.actionName === 'increment') move(1);
    if (nativeEvent.actionName === 'decrement') move(-1);
  };

  return (
    <View style={styles.wrap}>
      <Pressable
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={`최근 18주 중 ${reviewed}일 복습. 많이 복습한 날일수록 진하게 표시`}
        accessibilityValue={{
          text: `${dayLabel(day.studyDay)}${day.studyDay === today ? ' 오늘' : ''} ${count}`,
        }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={onAction}
        // 칸이 작아 누른 칸을 고르지 않고, 어디를 누르든 오늘로 돌아온다.
        onPress={() => setSelected(today)}
        style={styles.grid}
      >
        {weeks.map((week, column) => (
          <View key={column} style={styles.week}>
            {week.map((cell, row) =>
              cell === null ? (
                <View key={row} style={styles.cell} />
              ) : (
                <View
                  key={row}
                  style={[
                    styles.cell,
                    { backgroundColor: fill(cell.level) },
                    cell.studyDay === day.studyDay && {
                      borderWidth: 2,
                      borderColor: cell.level >= 3 ? colors.bg : colors.text,
                    },
                  ]}
                />
              ),
            )}
          </View>
        ))}
      </Pressable>
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={styles.legend}
      >
        <Text style={[text('caption'), styles.legendStart, { color: colors.muted }]}>적게</Text>
        {LEVELS.map((level) => (
          <View key={level} style={[styles.cell, { backgroundColor: fill(level) }]} />
        ))}
        <Text style={[text('caption'), styles.legendEnd, { color: colors.muted }]}>많이</Text>
      </View>
      <View style={styles.picked}>
        <IconButton
          icon={ChevronLeftIcon}
          label="이전 날"
          tone="muted"
          disabled={day.studyDay <= first}
          onPress={() => move(-1)}
        />
        <Text style={[text('caption', { weight: 'bold' }), styles.pickedText]}>
          {`${name} · ${count}`}
        </Text>
        <IconButton
          icon={ChevronRightIcon}
          label="다음 날"
          tone="muted"
          disabled={day.studyDay >= today}
          onPress={() => move(1)}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space[2] },
  grid: { flexDirection: 'row', justifyContent: 'space-between' },
  week: { gap: GAP },
  cell: { width: CELL, height: CELL, borderRadius: 3 },
  legend: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: GAP },
  legendStart: { marginRight: space[1] },
  legendEnd: { marginLeft: space[1] },
  picked: { flexDirection: 'row', alignItems: 'center' },
  pickedText: { flex: 1, textAlign: 'center', fontVariant: ['tabular-nums'] },
});

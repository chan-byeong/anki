import { StyleSheet, Text, View } from 'react-native';

import { mixColor } from '@/theme/mix-color';
import { useTheme } from '@/theme/ThemeProvider';
import { space } from '@/theme/tokens';
import { formatCount } from '@/utils/format-count';

import { weekdayOf } from '../review-calendar';

const WEEKDAY = ['일', '월', '화', '수', '목', '금', '토'];
// 숫자와 요일 줄을 뺀 막대 자리. 가장 많은 날이 이 높이가 된다.
const BAR_MAX = 88;

interface ReviewForecastProps {
  // forecast의 결과. 첫 값이 오늘이다.
  days: number[];
  today: number;
}

// 앞으로 7일 날짜별 복습 카드 수 막대. 막대 위에 숫자를 함께 적는다.
export function ReviewForecast({ days, today }: ReviewForecastProps) {
  const { colors, text } = useTheme();
  const max = Math.max(...days);

  if (max === 0) {
    return (
      <Text style={[text('caption'), { color: colors.muted }]}>
        앞으로 7일 동안 복습할 카드가 없어요
      </Text>
    );
  }

  return (
    <View
      accessibilityLabel="앞으로 7일 복습할 카드 수"
      accessibilityRole="list"
      style={styles.list}
    >
      {days.map((count, offset) => {
        const isToday = offset === 0;
        const weekday = WEEKDAY[weekdayOf(today + offset)];
        const shown = formatCount(count);
        return (
          <View
            key={offset}
            accessible
            accessibilityLabel={`${isToday ? '오늘' : `${weekday}요일`} ${shown}장`}
            style={styles.day}
          >
            <Text
              style={[
                text('caption', isToday ? { weight: 'bold' } : undefined),
                styles.number,
                { color: isToday ? colors.text : colors.muted },
              ]}
            >
              {shown}
            </Text>
            <View
              style={[
                styles.bar,
                {
                  height: Math.round((count / max) * BAR_MAX),
                  backgroundColor: isToday
                    ? colors.text
                    : mixColor(colors.text, colors.surface, 0.3),
                },
              ]}
            />
            <Text
              style={[
                text('caption', isToday ? { weight: 'bold' } : undefined),
                { color: isToday ? colors.text : colors.muted },
              ]}
            >
              {isToday ? '오늘' : weekday}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { minHeight: 132, flexDirection: 'row', alignItems: 'flex-end', gap: space[2] },
  day: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: space[1] },
  number: { fontVariant: ['tabular-nums'] },
  bar: { width: '100%', maxWidth: 28, borderTopLeftRadius: 4, borderTopRightRadius: 4 },
});

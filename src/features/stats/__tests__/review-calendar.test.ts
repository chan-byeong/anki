import { studyDayOf } from '@/utils/study-day';

import { calendarLevel, calendarWeeks, dayLabel } from '../review-calendar';

// 2026-10-27(화), 2026-11-01(일), 2026-10-31(토)
const TUESDAY = studyDayOf(new Date(2026, 9, 27).getTime());
const SUNDAY = studyDayOf(new Date(2026, 10, 1).getTime());
const SATURDAY = studyDayOf(new Date(2026, 9, 31).getTime());

describe('calendarLevel', () => {
  test.each([
    [0, 0],
    [1, 1],
    [9, 1],
    [10, 2],
    [19, 2],
    [20, 3],
    [29, 3],
    [30, 4],
    [120, 4],
  ])('%i장이면 %i단계다', (count, level) => {
    expect(calendarLevel(count)).toBe(level);
  });
});

describe('calendarWeeks', () => {
  test('18주를 주마다 일요일부터 토요일까지 7칸으로 만든다', () => {
    const weeks = calendarWeeks([], TUESDAY);

    expect(weeks).toHaveLength(18);
    weeks.forEach((week) => expect(week).toHaveLength(7));
    expect(dayLabel(weeks[0][0]!.studyDay)).toBe('6월 28일');
  });

  test('오늘은 마지막 주의 요일 칸에 있고 그 뒤 칸은 비어 있다', () => {
    const last = calendarWeeks([], TUESDAY)[17];

    expect(last[2]?.studyDay).toBe(TUESDAY);
    expect(last.slice(3)).toEqual([null, null, null, null]);
  });

  test('오늘이 일요일이면 마지막 주는 첫 칸만 찬다', () => {
    const last = calendarWeeks([], SUNDAY)[17];

    expect(last[0]?.studyDay).toBe(SUNDAY);
    expect(last.slice(1).every((day) => day === null)).toBe(true);
  });

  test('오늘이 토요일이면 마지막 주가 모두 찬다', () => {
    const last = calendarWeeks([], SATURDAY)[17];

    expect(last[6]?.studyDay).toBe(SATURDAY);
    expect(last.every((day) => day !== null)).toBe(true);
  });

  test('그날 평가한 카드 수와 단계를 날짜에 붙인다', () => {
    const weeks = calendarWeeks(
      [
        { studyDay: TUESDAY - 1, count: 24 },
        { studyDay: TUESDAY, count: 3 },
      ],
      TUESDAY,
    );

    expect(weeks[17][1]).toEqual({ studyDay: TUESDAY - 1, count: 24, level: 3 });
    expect(weeks[17][2]).toEqual({ studyDay: TUESDAY, count: 3, level: 1 });
    expect(weeks[17][0]).toEqual({ studyDay: TUESDAY - 2, count: 0, level: 0 });
  });

  test('18주보다 오래된 기록과 오늘보다 나중 날짜의 기록(시간대 변경)은 넣지 않는다', () => {
    const first = calendarWeeks([], TUESDAY)[0][0]!.studyDay;
    const weeks = calendarWeeks(
      [
        { studyDay: first - 1, count: 5 },
        { studyDay: TUESDAY + 1, count: 5 },
      ],
      TUESDAY,
    );

    expect(weeks.flat().reduce((sum, day) => sum + (day?.count ?? 0), 0)).toBe(0);
  });
});

describe('dayLabel', () => {
  test('학습일을 기기 날짜의 월·일로 읽는다', () => {
    expect(dayLabel(TUESDAY)).toBe('10월 27일');
  });
});

import type { ReviewDayCount } from '@/storage/store';

const DAY_MS = 24 * 60 * 60 * 1000;

export const CALENDAR_WEEKS = 18;

/** 0은 복습하지 않은 날, 4가 가장 진하다. */
export type CalendarLevel = 0 | 1 | 2 | 3 | 4;

export type CalendarDay = { studyDay: number; count: number; level: CalendarLevel };

/** 그날 평가한 카드 수에 따른 진하기. 0 / 1+ / 10+ / 20+ / 30+. */
export const calendarLevel = (count: number): CalendarLevel => {
  if (count >= 30) return 4;
  if (count >= 20) return 3;
  if (count >= 10) return 2;
  if (count >= 1) return 1;
  return 0;
};

// 학습일은 기기 날짜를 UTC 자정으로 옮겨 센 값이라(studyDayOf), UTC로 읽으면 기기 날짜가 그대로 나온다.
const dateOf = (studyDay: number): Date => new Date(studyDay * DAY_MS);

/** 학습일의 요일. 0이 일요일이다. */
export const weekdayOf = (studyDay: number): number => dateOf(studyDay).getUTCDay();

/** "10월 3일" */
export const dayLabel = (studyDay: number): string => {
  const date = dateOf(studyDay);
  return `${date.getUTCMonth() + 1}월 ${date.getUTCDate()}일`;
};

/**
 * 오늘이 든 주까지 최근 18주를 주(일요일~토요일)마다 7칸으로 나눈다. 오늘보다 뒤의 칸은 null이다.
 * days에서 이 범위 밖의 학습일(오래된 기록, 시간대 변경으로 생긴 미래 날짜)은 무시한다.
 */
export const calendarWeeks = (days: ReviewDayCount[], today: number): (CalendarDay | null)[][] => {
  const counts = new Map(days.map(({ studyDay, count }) => [studyDay, count]));
  const first = today - weekdayOf(today) - (CALENDAR_WEEKS - 1) * 7;
  return Array.from({ length: CALENDAR_WEEKS }, (_, week) =>
    Array.from({ length: 7 }, (_, weekday) => {
      const studyDay = first + week * 7 + weekday;
      if (studyDay > today) return null;
      const count = counts.get(studyDay) ?? 0;
      return { studyDay, count, level: calendarLevel(count) };
    }),
  );
};

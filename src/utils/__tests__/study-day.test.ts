import { studyDayOf } from '../study-day';

// 기대값은 날짜별로 센 일수를 직접 적은 값이다. Jest의 TZ는 Asia/Seoul로 고정돼 있다(ADR 0013).
// 2026-01-01의 학습일은 20454다.

describe('studyDayOf', () => {
  test('2026-01-01은 20454이고 하루가 지날 때마다 1씩 늘어난다', () => {
    expect(studyDayOf(new Date(2026, 0, 1, 12).getTime())).toBe(20454);
    expect(studyDayOf(new Date(2026, 0, 2, 12).getTime())).toBe(20455);
    expect(studyDayOf(new Date(2026, 0, 31, 12).getTime())).toBe(20484);
  });

  test('하루 경계는 기기 시간대의 자정이다', () => {
    expect(studyDayOf(new Date(2026, 0, 1, 0, 0, 0, 0).getTime())).toBe(20454);
    expect(studyDayOf(new Date(2026, 0, 1, 23, 59, 59, 999).getTime())).toBe(20454);
    expect(studyDayOf(new Date(2026, 0, 2, 0, 0, 0, 0).getTime())).toBe(20455);
  });

  test('새벽 시각도 그날의 학습일이다', () => {
    expect(studyDayOf(new Date(2026, 0, 2, 3, 0).getTime())).toBe(20455);
  });
});

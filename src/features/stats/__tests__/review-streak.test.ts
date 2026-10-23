import { reviewStreak, totalReviews } from '../review-streak';

const days = (...studyDays: number[]) => studyDays.map((studyDay) => ({ studyDay, count: 1 }));

describe('reviewStreak', () => {
  test('기록이 없으면 0이다', () => {
    expect(reviewStreak([], 100)).toBe(0);
  });

  test('오늘까지 이어서 복습한 날을 센다', () => {
    expect(reviewStreak(days(97, 98, 99, 100), 100)).toBe(4);
  });

  test('오늘 아직 복습하지 않았어도 어제까지 이어졌으면 끊기지 않는다', () => {
    expect(reviewStreak(days(97, 98, 99), 100)).toBe(3);
  });

  test('어제도 오늘도 복습하지 않았으면 끊겨서 0이다', () => {
    expect(reviewStreak(days(97, 98), 100)).toBe(0);
  });

  test('빠진 날이 있으면 그 뒤부터만 센다', () => {
    expect(reviewStreak(days(90, 91, 92, 98, 99, 100), 100)).toBe(3);
  });

  test('같은 날의 여러 번 복습은 하루로 센다', () => {
    expect(reviewStreak([{ studyDay: 100, count: 40 }], 100)).toBe(1);
  });

  test('오늘보다 나중 날짜의 기록(시간대 변경)은 무시한다', () => {
    expect(reviewStreak(days(99, 100, 101), 100)).toBe(2);
  });
});

describe('totalReviews', () => {
  test('모든 학습일의 평가 횟수를 더한다', () => {
    expect(
      totalReviews([
        { studyDay: 1, count: 40 },
        { studyDay: 2, count: 2 },
      ]),
    ).toBe(42);
  });

  test('기록이 없으면 0이다', () => {
    expect(totalReviews([])).toBe(0);
  });
});

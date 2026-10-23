import { formatDeletedAgo } from '../format-deleted-ago';

// 휴지통 행의 "3일 전". 날짜는 기기의 달력 날짜로 센다(ADR 0013). 날짜는 Jest의 고정 TZ에서 정오로 만든다.
const noon = (day: number): number => new Date(2026, 0, 1 + day, 12).getTime();

describe('formatDeletedAgo', () => {
  test.each<{ days: number; label: string }>([
    { days: 0, label: '오늘' },
    { days: 1, label: '어제' },
    { days: 2, label: '2일 전' },
    { days: 6, label: '6일 전' },
    { days: 7, label: '1주 전' },
    { days: 14, label: '2주 전' },
    { days: 29, label: '4주 전' },
    { days: 30, label: '1개월 전' },
    { days: 364, label: '12개월 전' },
    { days: 365, label: '1년 전' },
    { days: 800, label: '2년 전' },
  ])('$days일 전에 지운 항목은 "$label"이다', ({ days, label }) => {
    expect(formatDeletedAgo(noon(0), noon(days))).toBe(label);
  });

  test('자정을 넘기면 시각 차이가 하루 미만이어도 어제다', () => {
    const lateNight = new Date(2026, 0, 1, 23, 59).getTime();
    const earlyMorning = new Date(2026, 0, 2, 0, 1).getTime();

    expect(formatDeletedAgo(lateNight, earlyMorning)).toBe('어제');
  });

  test('시계가 뒤로 가서 삭제 시각이 지금보다 뒤여도 오늘로 본다', () => {
    expect(formatDeletedAgo(noon(3), noon(0))).toBe('오늘');
  });
});

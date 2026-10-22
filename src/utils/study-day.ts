const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * 기기의 달력 날짜를 1970-01-01부터 센 일수로 바꾼다(ADR 0013).
 * 하루 경계는 기기 시간대의 자정이다. 시간대 설정과 새벽 롤오버는 없다.
 * 같은 시각이라도 기기 시간대에 따라 학습일이 하루 다를 수 있다.
 */
export const studyDayOf = (ms: number): number => {
  const date = new Date(ms);
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / DAY_MS;
};

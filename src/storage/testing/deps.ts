// 계약 테스트에서 Store에 주입하는 now()와 newId()(ADR 0010).
// 수정 시각이 갱신됐는지 구분하려면 호출마다 다른 값이 나와야 한다.

export type TestClock = {
  now: () => number;
  // 다음 now()가 돌려줄 시각을 정한다. 이후 호출은 그 값에서 step씩 늘어난다.
  set: (ms: number) => void;
};

export const createTestClock = (startMs = 1000, step = 1000): TestClock => {
  let next = startMs;
  return {
    now: () => {
      const value = next;
      next += step;
      return value;
    },
    set: (ms) => {
      next = ms;
    },
  };
};

// id-1, id-2, … 처럼 차례로 다른 ID를 돌려준다.
export const createTestIds = (prefix = 'id'): (() => string) => {
  let count = 0;
  return () => {
    count += 1;
    return `${prefix}-${count}`;
  };
};

import * as fc from 'fast-check';

import type { Rating, Review } from '@/storage/store';

import { scheduleCard } from '../schedule-card';
import {
  DAY_MS,
  dayOf,
  FIRST_DAY,
  NOON_MS,
  ratingArb,
  stepsArb,
  toHistory,
  type Step,
} from '../testing/history-fixtures';

// 일정 계산 함수(scheduleCard)의 성질(ADR 0004, 0015). 기대값을 규칙의 식으로 다시 계산하지 않고,
// 이력 사이의 관계로만 적는다.

const scheduleOf = (steps: Step[]) => {
  const schedule = scheduleCard(toHistory(steps));
  if (schedule === null) throw new Error('이력이 있는데 일정이 없다');
  return schedule;
};

describe('scheduleCard', () => {
  test('이력이 없는 신규 카드는 일정이 없다', () => {
    expect(scheduleCard([])).toBeNull();
  });

  test('같은 이력은 항상 같은 결과를 내고 입력을 바꾸지 않는다', () => {
    fc.assert(
      fc.property(stepsArb(1), (steps) => {
        const history = toHistory(steps);
        const before = JSON.parse(JSON.stringify(history)) as Review[];

        const first = scheduleCard(history);
        const second = scheduleCard(history);

        expect(second).toEqual(first);
        expect(history).toEqual(before);
      }),
    );
  });

  test('이력을 섞어서 넣어도 결과가 같다', () => {
    fc.assert(
      fc.property(
        stepsArb(1).chain((steps) => {
          const history = toHistory(steps);
          return fc
            .shuffledSubarray(history, { minLength: history.length, maxLength: history.length })
            .map((shuffled) => ({ history, shuffled }));
        }),
        ({ history, shuffled }) => {
          expect(scheduleCard(shuffled)).toEqual(scheduleCard(history));
        },
      ),
    );
  });

  test('복습일은 마지막 학습일에 간격을 더한 날이다', () => {
    fc.assert(
      fc.property(stepsArb(1), (steps) => {
        const history = toHistory(steps);
        const schedule = scheduleOf(steps);

        expect(schedule.lastStudyDay).toBe(Math.max(...history.map((review) => review.studyDay)));
        expect(schedule.dueDay).toBe(schedule.lastStudyDay + schedule.intervalDays);
      }),
    );
  });

  test('평가 직후 복습일은 평가한 학습일보다 하루 이상 뒤다', () => {
    fc.assert(
      fc.property(stepsArb(1), (steps) => {
        const schedule = scheduleOf(steps);

        expect(schedule.dueDay).toBeGreaterThanOrEqual(schedule.lastStudyDay + 1);
      }),
    );
  });

  test('간격은 1일 이상 365일 이하다', () => {
    fc.assert(
      fc.property(stepsArb(1), (steps) => {
        const { intervalDays } = scheduleOf(steps);

        expect(intervalDays).toBeGreaterThanOrEqual(1);
        expect(intervalDays).toBeLessThanOrEqual(365);
      }),
    );
  });

  test('힌트를 쓴 앎은 힌트 없는 헷갈림과 같은 결과를 낸다', () => {
    fc.assert(
      fc.property(stepsArb(1), (steps) => {
        const history = toHistory(steps);
        const asUnsure = history.map((review) =>
          review.rating === 'know' && review.hintUsed
            ? { ...review, rating: 'unsure' as const, hintUsed: false }
            : review,
        );

        expect(scheduleCard(asUnsure)).toEqual(scheduleCard(history));
      }),
    );
  });

  // 틀렸다 맞혀도 장기 간격이 부풀지 않는다(STA-120).
  test('같은 날 모름·헷갈림이 하나라도 있으면 간격이 그날 헷갈림 한 번의 간격을 넘지 않는다', () => {
    fc.assert(
      fc.property(
        stepsArb(),
        fc
          .array(ratingArb, { minLength: 1, maxLength: 4 })
          .filter((ratings) => ratings.some((rating) => rating !== 'know')),
        (prefix, ratings) => {
          const day = scheduleOf([...prefix, ...dayOf(ratings)]);
          const unsureOnce = scheduleOf([...prefix, ...dayOf(['unsure'])]);

          expect(day.intervalDays).toBeLessThanOrEqual(unsureOnce.intervalDays);
        },
      ),
    );
  });

  test('같은 날 앞서 모름·헷갈림이 없던 앎을 더 평가해도 결과가 변하지 않는다', () => {
    fc.assert(
      fc.property(stepsArb(), fc.integer({ min: 1, max: 3 }), (prefix, extra) => {
        const knownOnce = scheduleOf([...prefix, ...dayOf(['know'])]);
        const knownAgain = scheduleOf([
          ...prefix,
          ...dayOf(['know', ...Array<Rating>(extra).fill('know')]),
        ]);

        expect(knownAgain).toEqual(knownOnce);
      }),
    );
  });
});

// ADR 0004 규칙의 구체적인 예. 기대값은 ADR과 STA-119·120의 시나리오 표에서 가져온 값이다.
// 항목은 [학습일 번호, 평가]이고, 같은 날 항목은 적은 순서대로 평가한 것이다.
type Entry = [day: number, rating: Rating];

const intervalOf = (entries: Entry[]): number | undefined => {
  const history = entries.map(([day, rating], index): Review => {
    const studyDay = FIRST_DAY + day;
    return {
      id: `review-${index}`,
      cardId: 'card-1',
      rating,
      hintUsed: false,
      studyDay,
      ratedAt: studyDay * DAY_MS + NOON_MS + index * 1000,
    };
  });
  return scheduleCard(history)?.intervalDays;
};

describe('scheduleCard 규칙의 예', () => {
  test.each<{ label: string; entries: Entry[]; interval: number }>([
    { label: '신규 카드 모름', entries: [[0, 'dont']], interval: 1 },
    { label: '신규 카드 헷갈림', entries: [[0, 'unsure']], interval: 2 },
    { label: '신규 카드 앎', entries: [[0, 'know']], interval: 3 },
    {
      label: '앎 뒤 제때 앎',
      entries: [
        [0, 'know'],
        [3, 'know'],
      ],
      interval: 8,
    },
    {
      label: '앎·앎·앎',
      entries: [
        [0, 'know'],
        [3, 'know'],
        [10, 'know'],
      ],
      interval: 18,
    },
    {
      label: '앎·앎 뒤 헷갈림',
      entries: [
        [0, 'know'],
        [3, 'know'],
        [10, 'unsure'],
      ],
      interval: 4,
    },
    {
      label: '앎·앎·앎 뒤 모름',
      entries: [
        [0, 'know'],
        [3, 'know'],
        [10, 'know'],
        [28, 'dont'],
      ],
      interval: 1,
    },
    {
      label: '조기 앎은 간격을 유지한다',
      entries: [
        [0, 'know'],
        [1, 'know'],
      ],
      interval: 3,
    },
    {
      label: '지연 앎',
      entries: [
        [0, 'know'],
        [9, 'know'],
      ],
      interval: 15,
    },
    {
      label: '모름 다음 날 앎 (2.5를 3으로 올림)',
      entries: [
        [0, 'dont'],
        [1, 'know'],
      ],
      interval: 3,
    },
    {
      label: '모름 다음 날 헷갈림',
      entries: [
        [0, 'dont'],
        [1, 'unsure'],
      ],
      interval: 2,
    },
    {
      label: '제때 앎을 이어가면 간격이 늘어난다 (312.5를 313으로 올림)',
      entries: [
        [0, 'know'],
        [3, 'know'],
        [11, 'know'],
        [31, 'know'],
        [81, 'know'],
        [206, 'know'],
      ],
      interval: 313,
    },
    {
      label: '간격은 365일을 넘지 않는다',
      entries: [
        [0, 'know'],
        [3, 'know'],
        [11, 'know'],
        [31, 'know'],
        [81, 'know'],
        [206, 'know'],
        [519, 'know'],
      ],
      interval: 365,
    },
  ])('$label: $interval일', ({ entries, interval }) => {
    expect(intervalOf(entries)).toBe(interval);
  });

  // STA-120: 같은 날 재평가는 그날 첫 평가 직전 상태를 기준으로 하고 헷갈림 수준을 넘지 않는다.
  test.each<{ label: string; ratings: Rating[]; interval: number }>([
    { label: '모름 → 앎', ratings: ['dont', 'know'], interval: 2 },
    { label: '헷갈림 → 앎', ratings: ['unsure', 'know'], interval: 2 },
    {
      label: '모름 → 헷갈림 → 앎 (모름 뒤 헷갈림은 1일 유지)',
      ratings: ['dont', 'unsure', 'know'],
      interval: 2,
    },
    { label: '모름 → 헷갈림', ratings: ['dont', 'unsure'], interval: 1 },
    { label: '앎 → 앎', ratings: ['know', 'know'], interval: 3 },
    { label: '앎 → 모름 → 앎', ratings: ['know', 'dont', 'know'], interval: 2 },
    { label: '모름 → 모름', ratings: ['dont', 'dont'], interval: 1 },
  ])('신규 카드의 같은 날 $label: $interval일', ({ ratings, interval }) => {
    expect(intervalOf(ratings.map((rating): Entry => [0, rating]))).toBe(interval);
  });

  // 앎(0일), 앎(3일) 뒤 11일째는 기준 간격 8일이고, 그날 헷갈림을 받으면 4일이다.
  test.each<{ label: string; ratings: Rating[]; interval: number }>([
    { label: '앎', ratings: ['know'], interval: 20 },
    { label: '모름 → 앎', ratings: ['dont', 'know'], interval: 2 },
    { label: '모름 → 앎 → 앎', ratings: ['dont', 'know', 'know'], interval: 3 },
    { label: '앎 → 헷갈림', ratings: ['know', 'unsure'], interval: 4 },
  ])('기준 간격 8일 카드의 같은 날 $label: $interval일', ({ ratings, interval }) => {
    const base: Entry[] = [
      [0, 'know'],
      [3, 'know'],
    ];

    expect(intervalOf([...base, ...ratings.map((rating): Entry => [11, rating])])).toBe(interval);
  });

  test('복습일은 마지막 학습일에 간격을 더한 날이다', () => {
    const history: Review[] = [
      {
        id: 'review-0',
        cardId: 'card-1',
        rating: 'know',
        hintUsed: false,
        studyDay: FIRST_DAY,
        ratedAt: FIRST_DAY * DAY_MS + NOON_MS,
      },
    ];

    expect(scheduleCard(history)).toEqual({
      intervalDays: 3,
      lastStudyDay: FIRST_DAY,
      dueDay: FIRST_DAY + 3,
    });
  });
});

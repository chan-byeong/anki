import * as fc from 'fast-check';

import type { Rating, Review } from '@/storage/store';

import { isInQueue } from '../is-in-queue';
import { DAY_MS, FIRST_DAY, NOON_MS, stepsArb, toHistory } from '../testing/history-fixtures';

// 대기열 소속 판정(ADR 0003). 항목은 [학습일 번호, 평가, 힌트 사용 여부]다.
// 같은 날 항목은 적은 순서대로 평가한 것이고, today는 학습일 번호로 적는다.
type Entry = [day: number, rating: Rating] | [day: number, rating: Rating, hintUsed: boolean];

const reviewsOf = (entries: Entry[]): Review[] =>
  entries.map(([day, rating, hintUsed = false], index): Review => {
    const studyDay = FIRST_DAY + day;
    return {
      id: `review-${index}`,
      cardId: 'card-1',
      rating,
      hintUsed,
      studyDay,
      ratedAt: studyDay * DAY_MS + NOON_MS + index * 1000,
    };
  });

describe('isInQueue', () => {
  test.each<{ label: string; entries: Entry[]; today: number; inQueue: boolean }>([
    { label: '이력이 없는 신규 카드', entries: [], today: 0, inQueue: true },
    { label: '오늘 앎', entries: [[0, 'know']], today: 0, inQueue: false },
    { label: '오늘 모름 한 번', entries: [[0, 'dont']], today: 0, inQueue: true },
    { label: '오늘 헷갈림 한 번', entries: [[0, 'unsure']], today: 0, inQueue: true },
    {
      label: '오늘 모름 세 번 (오늘 평가 3건이면 빠진다)',
      entries: [
        [0, 'dont'],
        [0, 'dont'],
        [0, 'dont'],
      ],
      today: 0,
      inQueue: false,
    },
    {
      label: '오늘 모름 두 번',
      entries: [
        [0, 'dont'],
        [0, 'dont'],
      ],
      today: 0,
      inQueue: true,
    },
    { label: '오늘 힌트를 쓴 앎', entries: [[0, 'know', true]], today: 0, inQueue: true },
    {
      label: '오늘 앎 뒤 모름 (마지막이 모름)',
      entries: [
        [0, 'know'],
        [0, 'dont'],
      ],
      today: 0,
      inQueue: true,
    },
    {
      label: '오늘 모름 뒤 앎 (마지막이 앎)',
      entries: [
        [0, 'dont'],
        [0, 'know'],
      ],
      today: 0,
      inQueue: false,
    },
    { label: '복습일 하루 전', entries: [[0, 'know']], today: 2, inQueue: false },
    { label: '복습일 당일', entries: [[0, 'know']], today: 3, inQueue: true },
    { label: '복습일이 지남', entries: [[0, 'know']], today: 10, inQueue: true },
    {
      label: '어제 모름 두 번 뒤 오늘 모름 한 번 (오늘 평가만 센다)',
      entries: [
        [0, 'dont'],
        [0, 'dont'],
        [1, 'dont'],
      ],
      today: 1,
      inQueue: true,
    },
  ])('$label: $inQueue', ({ entries, today, inQueue }) => {
    expect(isInQueue(reviewsOf(entries), FIRST_DAY + today)).toBe(inQueue);
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
        fc.integer({ min: 0, max: 3 }),
        ({ history, shuffled }, afterLast) => {
          const today = Math.max(...history.map((review) => review.studyDay)) + afterLast;

          expect(isInQueue(shuffled, today)).toBe(isInQueue(history, today));
        },
      ),
    );
  });

  // 학습일은 기록할 때 고정한 값이 원본이고 평가 시각에서 다시 만들지 않는다(ADR 0013, 0015).
  test('오늘 평가 건수는 저장된 학습일로 센다', () => {
    const today = FIRST_DAY;
    // 세 건 모두 저장된 학습일은 오늘이다. 평가 시각만 보면 마지막 한 건은 다음 날로 읽힌다.
    // 시간대나 시계가 바뀐 기기의 이력을 흉내 낸다.
    const threeToday = [1, 2, 3].map((count): Review => ({
      id: `review-${count}`,
      cardId: 'card-1',
      rating: 'dont',
      hintUsed: false,
      studyDay: today,
      ratedAt: (count === 3 ? today + 1 : today) * DAY_MS + NOON_MS + count,
    }));

    expect(isInQueue(threeToday, today)).toBe(false);
  });

  test('입력 이력을 바꾸지 않는다', () => {
    fc.assert(
      fc.property(stepsArb(1), (steps) => {
        const history = toHistory(steps);
        const before = JSON.parse(JSON.stringify(history)) as Review[];

        isInQueue(history, FIRST_DAY + 400);

        expect(history).toEqual(before);
      }),
    );
  });
});

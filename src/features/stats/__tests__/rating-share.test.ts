import { ratingShare } from '../rating-share';

describe('ratingShare', () => {
  test('모름·헷갈림·앎 순서로 횟수와 비율을 낸다', () => {
    expect(
      ratingShare([
        { rating: 'know', hintUsed: false, count: 6 },
        { rating: 'dont', hintUsed: false, count: 1 },
        { rating: 'unsure', hintUsed: false, count: 3 },
      ]),
    ).toEqual({
      total: 10,
      shares: [
        { rating: 'dont', count: 1, percent: 10 },
        { rating: 'unsure', count: 3, percent: 30 },
        { rating: 'know', count: 6, percent: 60 },
      ],
    });
  });

  test('힌트를 쓴 앎은 헷갈림으로 센다', () => {
    const { shares } = ratingShare([
      { rating: 'know', hintUsed: true, count: 2 },
      { rating: 'know', hintUsed: false, count: 1 },
      { rating: 'unsure', hintUsed: true, count: 1 },
    ]);

    expect(shares.map(({ count }) => count)).toEqual([0, 3, 1]);
  });

  test('반올림해도 비율의 합은 100이다', () => {
    const { shares } = ratingShare([
      { rating: 'dont', hintUsed: false, count: 1 },
      { rating: 'unsure', hintUsed: false, count: 1 },
      { rating: 'know', hintUsed: false, count: 1 },
    ]);

    expect(shares.reduce((sum, { percent }) => sum + percent, 0)).toBe(100);
    expect(shares.map(({ percent }) => percent).sort()).toEqual([33, 33, 34]);
  });

  test('평가가 없으면 모두 0이다', () => {
    expect(ratingShare([])).toEqual({
      total: 0,
      shares: [
        { rating: 'dont', count: 0, percent: 0 },
        { rating: 'unsure', count: 0, percent: 0 },
        { rating: 'know', count: 0, percent: 0 },
      ],
    });
  });
});

import { swipeProgress, swipeRatingAt } from '@/features/review/swipe-rate';

describe('밀어서 평가', () => {
  test('오른쪽으로 96px 넘기면 앎, 왼쪽으로 96px 넘기면 모름이다', () => {
    expect(swipeRatingAt(96)).toBe('know');
    expect(swipeRatingAt(240)).toBe('know');
    expect(swipeRatingAt(-96)).toBe('dont');
    expect(swipeRatingAt(-240)).toBe('dont');
  });

  test('96px를 못 넘기면 평가하지 않는다', () => {
    expect(swipeRatingAt(0)).toBeNull();
    expect(swipeRatingAt(95)).toBeNull();
    expect(swipeRatingAt(-95)).toBeNull();
  });

  test('미는 만큼 그쪽 표시가 진해지고 문턱에서 가득 찬다. 반대쪽 표시는 그대로다', () => {
    expect(swipeProgress(48, 1)).toBe(0.5);
    expect(swipeProgress(-48, -1)).toBe(0.5);
    expect(swipeProgress(200, 1)).toBe(1);
    expect(swipeProgress(48, -1)).toBe(0);
    expect(swipeProgress(-48, 1)).toBe(0);
  });
});

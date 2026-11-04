import { isWorkletFunction } from 'react-native-worklets';

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

  // 제스처와 애니메이션 스타일은 UI 스레드에서 이 함수들을 바로 부른다. worklet이 아니면 부르는 순간 던져 앱이 종료된다.
  test('UI 스레드에서 부르는 함수는 worklet이다', () => {
    expect(isWorkletFunction(swipeRatingAt)).toBe(true);
    expect(isWorkletFunction(swipeProgress)).toBe(true);
  });
});

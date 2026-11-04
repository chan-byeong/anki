import { isWorkletFunction } from 'react-native-worklets';

import { trashSwipeZone } from '@/features/cards/swipe-trash';

// 행 너비 342px 기준: 열림 88px, 바로 휴지통은 60% = 205.2px.
describe('밀어서 휴지통', () => {
  test('88px를 못 넘기면 닫힌다', () => {
    expect(trashSwipeZone(0, 342)).toBe('close');
    expect(trashSwipeZone(-87, 342)).toBe('close');
  });

  test('88px를 넘기고 60%를 못 넘기면 휴지통 버튼이 열린 채 멈춘다', () => {
    expect(trashSwipeZone(-88, 342)).toBe('open');
    expect(trashSwipeZone(-205, 342)).toBe('open');
  });

  test('행 너비의 60%를 넘기면 바로 휴지통으로 간다', () => {
    expect(trashSwipeZone(-206, 342)).toBe('commit');
    expect(trashSwipeZone(-342, 342)).toBe('commit');
  });

  test('너비를 아직 모르면 바로 휴지통으로 가지 않는다', () => {
    expect(trashSwipeZone(-120, 0)).toBe('open');
  });

  // 제스처는 UI 스레드에서 이 함수를 바로 부른다. worklet이 아니면 부르는 순간 던져 앱이 종료된다.
  test('UI 스레드에서 부르는 함수는 worklet이다', () => {
    expect(isWorkletFunction(trashSwipeZone)).toBe(true);
  });
});

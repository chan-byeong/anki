import { renderHook } from '@testing-library/react-native';

import { useMotion } from '@/hooks/use-motion';
import { motion, motionEnter, motionPress, pressScale, shift, shiftCard } from '@/theme/tokens';

// 시스템 설정 구독은 useReducedMotion의 일이라 그 테스트에서 다룬다. 여기서는 그 값만 따른다.
const mockReducedMotion = { current: false };
jest.mock('@/hooks/use-reduced-motion', () => ({
  useReducedMotion: () => mockReducedMotion.current,
}));

describe('useMotion', () => {
  afterEach(() => {
    mockReducedMotion.current = false;
  });

  it('동작 줄이기가 꺼져 있으면 토큰 값을 그대로 준다', async () => {
    const { result } = await renderHook(() => useMotion());

    expect(result.current).toEqual({
      reduced: false,
      press: motionPress,
      motion,
      enter: motionEnter,
      pressScale,
      shift,
      shiftCard,
    });
  });

  it('동작 줄이기가 켜지면 이동과 크기 변화를 없애고 들어옴도 기본 페이드 시간으로 줄인다', async () => {
    mockReducedMotion.current = true;

    const { result } = await renderHook(() => useMotion());

    expect(result.current).toEqual({
      reduced: true,
      press: motionPress,
      motion,
      enter: motion,
      pressScale: 1,
      shift: 0,
      shiftCard: 0,
    });
  });

  it('설정이 바뀌면 다시 그릴 때 새 값을 준다', async () => {
    const { result, rerender } = await renderHook(() => useMotion());
    expect(result.current.reduced).toBe(false);

    mockReducedMotion.current = true;
    await rerender({});

    expect(result.current.reduced).toBe(true);
    expect(result.current.shift).toBe(0);
  });
});

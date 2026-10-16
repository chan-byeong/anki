import { act, renderHook } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';

import { useReducedMotion } from '@/hooks/use-reduced-motion';

// 시스템 설정은 AccessibilityInfo의 조회(isReduceMotionEnabled)와 변경 이벤트(reduceMotionChanged)로만 들어온다.
type Listener = (enabled: boolean) => void;

describe('useReducedMotion', () => {
  let listener: Listener | undefined;
  let remove: jest.Mock;
  let resolveQuery: (enabled: boolean) => void;

  beforeEach(() => {
    listener = undefined;
    remove = jest.fn();
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockImplementation(
      () =>
        new Promise<boolean>((resolve) => {
          resolveQuery = resolve;
        }),
    );
    jest.spyOn(AccessibilityInfo, 'addEventListener').mockImplementation(((
      _event: string,
      handler: Listener,
    ) => {
      listener = handler;
      return { remove };
    }) as unknown as typeof AccessibilityInfo.addEventListener);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('조회가 끝나기 전에는 false다', async () => {
    const { result } = await renderHook(() => useReducedMotion());

    expect(result.current).toBe(false);
  });

  it('마운트 시 조회한 설정값으로 보정한다', async () => {
    const { result } = await renderHook(() => useReducedMotion());

    await act(async () => resolveQuery(true));

    expect(result.current).toBe(true);
  });

  it('설정이 바뀌면 새 값을 돌려준다', async () => {
    const { result } = await renderHook(() => useReducedMotion());
    await act(async () => resolveQuery(false));

    await act(() => listener?.(true));

    expect(result.current).toBe(true);
  });

  it('조회가 변경 이벤트보다 늦게 끝나도 이벤트 값을 유지한다', async () => {
    const { result } = await renderHook(() => useReducedMotion());

    await act(() => listener?.(true));
    await act(async () => resolveQuery(false));

    expect(result.current).toBe(true);
  });

  it('언마운트하면 구독을 해제한다', async () => {
    const { unmount } = await renderHook(() => useReducedMotion());

    await act(() => unmount());

    expect(remove).toHaveBeenCalledTimes(1);
  });
});

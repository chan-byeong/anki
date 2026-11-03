import { renderHook } from '@testing-library/react-native';

import { useHeldValue } from '@/hooks/use-held-value';

const setup = (initial: string | null) =>
  renderHook(({ value }: { value: string | null }) => useHeldValue(value), {
    initialProps: { value: initial },
  });

describe('useHeldValue', () => {
  it('처음 값이 null이면 null이다', async () => {
    const { result } = await setup(null);
    expect(result.current).toBeNull();
  });

  it('값이 null이 되어도 마지막 값을 돌려준다', async () => {
    const { result, rerender } = await setup('저장하지 못했어요');
    await rerender({ value: null });
    expect(result.current).toBe('저장하지 못했어요');
  });

  it('새 값이 오면 그 값으로 바뀐다', async () => {
    const { result, rerender } = await setup('처음 오류');
    await rerender({ value: null });
    await rerender({ value: '다음 오류' });
    expect(result.current).toBe('다음 오류');
  });
});

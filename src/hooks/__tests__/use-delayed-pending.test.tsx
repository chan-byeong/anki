import { act, renderHook } from '@testing-library/react-native';

import { useDelayedPending } from '@/hooks/use-delayed-pending';
import { slow } from '@/theme/tokens';

// 늦을 때만 기다림(ADR 0021): slow.after(300ms)가 지나야 기다림 표시를 띄우고,
// 띄우면 일이 먼저 끝나도 slow.min(400ms) 동안 둔다.
const advance = (ms: number) =>
  act(async () => {
    jest.advanceTimersByTime(ms);
  });

const setup = (initial: boolean) =>
  renderHook(({ pending }: { pending: boolean }) => useDelayedPending(pending), {
    initialProps: { pending: initial },
  });

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('useDelayedPending', () => {
  it('일이 없으면 띄우지 않는다', async () => {
    const { result } = await setup(false);
    await advance(1000);

    expect(result.current).toBe(false);
  });

  it('일이 시작되어도 300ms 전에는 띄우지 않는다', async () => {
    const { result, rerender } = await setup(false);
    await rerender({ pending: true });
    await advance(slow.after - 1);

    expect(result.current).toBe(false);
  });

  it('일이 300ms를 넘기면 그때 띄운다', async () => {
    const { result, rerender } = await setup(false);
    await rerender({ pending: true });
    await advance(slow.after);

    expect(result.current).toBe(true);
  });

  it('처음부터 일이 진행 중이어도 300ms 뒤에 띄운다', async () => {
    const { result } = await setup(true);
    expect(result.current).toBe(false);

    await advance(slow.after);
    expect(result.current).toBe(true);
  });

  it('일이 300ms 안에 끝나면 끝까지 띄우지 않는다', async () => {
    const { result, rerender } = await setup(false);
    await rerender({ pending: true });
    await advance(slow.after - 1);
    await rerender({ pending: false });
    await advance(1000);

    expect(result.current).toBe(false);
  });

  it('띄운 직후 일이 끝나도 띄운 때부터 400ms 동안 둔다', async () => {
    const { result, rerender } = await setup(false);
    await rerender({ pending: true });
    await advance(slow.after);
    await advance(50);
    await rerender({ pending: false });

    await advance(slow.min - 50 - 1);
    expect(result.current).toBe(true);

    await advance(1);
    expect(result.current).toBe(false);
  });

  it('띄운 뒤 400ms가 지나서 일이 끝나면 바로 내린다', async () => {
    const { result, rerender } = await setup(false);
    await rerender({ pending: true });
    await advance(slow.after + slow.min + 100);
    expect(result.current).toBe(true);

    // 남은 시간이 없어도 타이머 콜백에서 내리므로 한 틱(0ms) 안에 내려간다.
    await rerender({ pending: false });
    await advance(0);
    expect(result.current).toBe(false);
  });

  it('300ms 전에 끝났다가 다시 시작하면 다시 시작한 때부터 300ms를 센다', async () => {
    const { result, rerender } = await setup(false);
    await rerender({ pending: true });
    await advance(200);
    await rerender({ pending: false });
    await rerender({ pending: true });

    await advance(slow.after - 1);
    expect(result.current).toBe(false);

    await advance(1);
    expect(result.current).toBe(true);
  });

  it('최소 유지 중에 일이 다시 시작되면 깜빡이지 않고 계속 띄운다', async () => {
    const { result, rerender } = await setup(false);
    await rerender({ pending: true });
    await advance(slow.after);
    await rerender({ pending: false });
    await advance(100);
    await rerender({ pending: true });

    await advance(slow.min);
    expect(result.current).toBe(true);

    await rerender({ pending: false });
    await advance(0);
    expect(result.current).toBe(false);
  });
});

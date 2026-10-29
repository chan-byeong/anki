import { RatingButtons } from '@/features/review/components/RatingButtons';
import type { Rating } from '@/storage/store';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { act, fireEvent, render, screen } from '@testing-library/react-native';

// 시스템 설정 구독은 useReducedMotion의 일이라 여기서는 그 값만 바꾼다.
const mockReducedMotion = { current: false };
jest.mock('@/hooks/use-reduced-motion', () => ({
  useReducedMotion: () => mockReducedMotion.current,
}));

const advance = (ms: number) =>
  act(async () => {
    jest.advanceTimersByTime(ms);
  });

const ui = (pendingRating: Rating | null) => (
  <ThemeProvider override="light">
    <RatingButtons onRate={() => {}} disabled={false} pendingRating={pendingRating} />
  </ThemeProvider>
);

// 버튼 안의 눈에 보이는 면, 그 안의 평가 표시.
const face = (name: string) => screen.getByRole('button', { name }).children[0];
const mark = (name: string) =>
  screen.getByTestId(`rating-mark-${name}`, { includeHiddenElements: true });

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  mockReducedMotion.current = false;
  jest.useRealTimers();
});

describe('평가 버튼 누름', () => {
  test('누르는 동안 0.97배로 줄고, 떼면 돌아온다', async () => {
    await render(ui(null));

    await fireEvent(screen.getByRole('button', { name: '앎' }), 'pressIn');
    await advance(100);
    expect(face('앎')).toHaveAnimatedStyle({ transform: [{ scale: 0.97 }] });

    await fireEvent(screen.getByRole('button', { name: '앎' }), 'pressOut');
    await advance(100);
    expect(face('앎')).toHaveAnimatedStyle({ transform: [{ scale: 1 }] });
  });

  test('고르면 그 평가 표시가 1.2배로 한 번 커졌다가 160ms 안에 돌아온다', async () => {
    const { rerender } = await render(ui(null));

    await rerender(ui('know'));
    await advance(80);
    expect(mark('앎')).toHaveAnimatedStyle({ transform: [{ scale: 1.2 }] });
    expect(mark('모름')).toHaveAnimatedStyle({ transform: [{ scale: 1 }] });

    await advance(80);
    expect(mark('앎')).toHaveAnimatedStyle({ transform: [{ scale: 1 }] });
  });

  test('동작 줄이기가 켜지면 크기는 변하지 않고, 고른 버튼은 반전 색으로만 알린다', async () => {
    mockReducedMotion.current = true;
    const { rerender } = await render(ui(null));

    await fireEvent(screen.getByRole('button', { name: '앎' }), 'pressIn');
    await rerender(ui('know'));
    await advance(80);

    expect(face('앎')).toHaveAnimatedStyle({ transform: [{ scale: 1 }] });
    expect(mark('앎')).toHaveAnimatedStyle({ transform: [{ scale: 1 }] });
    expect(screen.getByRole('button', { name: '앎', selected: true })).toBeOnTheScreen();
  });
});

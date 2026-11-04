import { getAnimatedStyle } from 'react-native-reanimated';

import { DeckRow } from '@/features/decks/components/DeckRow';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { motion } from '@/theme/tokens';
import { act, render, screen } from '@testing-library/react-native';

jest.mock('@/hooks/use-reduced-motion', () => ({ useReducedMotion: () => false }));

// getAnimatedStyle의 웹용 타입 선언은 인자를 받지 않아서(실행은 받는다) 쓰는 모양으로 다시 선언한다.
const readAnimatedStyle = getAnimatedStyle as unknown as (component: unknown) => {
  width?: number;
  opacity?: number;
};

const emptyRow = (selected?: boolean) => (
  <ThemeProvider override="light">
    <DeckRow
      name="빈 덱"
      todayCount={0}
      cardCount={0}
      onStartReview={() => {}}
      onOpenDeck={() => {}}
      onOpenMenu={() => {}}
      selected={selected}
    />
  </ThemeProvider>
);

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('카드가 없는 덱 행', () => {
  test('선택 모드를 끝낸 뒤 누름 바탕이 선택 칸의 너비를 물려받지 않는다', async () => {
    const { rerender } = await render(emptyRow(false));
    await rerender(emptyRow());
    await act(async () => {
      jest.advanceTimersByTime(motion);
    });

    expect(readAnimatedStyle(screen.getByTestId('deck-row-pressed')).width).toBeUndefined();
  });
});

import { userEvent, within } from '@testing-library/react-native';
import { Stack } from 'expo-router';
import { act, renderRouter, screen } from 'expo-router/testing-library';

import ReviewScreen from '@/app/review/[deckId]';
import SettingsScreen from '@/app/settings';
import { HandProvider } from '@/features/settings/HandProvider';
import { createMemoryBacking, createMemoryPort } from '@/storage/memory-port';
import { createStore, type Store } from '@/storage/store';
import { StoreProvider } from '@/storage/StoreProvider';
import { createTestClock, createTestIds } from '@/storage/testing/deps';
import type { PreferenceStorage } from '@/theme/theme-preference';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { space } from '@/theme/tokens';

// 설정에서 주로 쓰는 손을 고르고, 복습 화면의 카드 버튼(힌트·메모) 자리가 그 쪽으로 가는지 실제 라우터 위에서 확인한다.
jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual('react-native-safe-area-context/jest/mock').default,
);
jest.mock('expo-crypto', () => ({
  randomUUID: () => jest.requireActual('node:crypto').randomUUID(),
}));

const memoryStorage = (initial: Record<string, string> = {}) => {
  const items = { ...initial };
  const storage: PreferenceStorage = {
    getItemSync: (key) => items[key] ?? null,
    setItem: async (key, value) => {
      items[key] = value;
    },
  };
  return { storage, items };
};

const newStore = (): Store =>
  createStore(createMemoryPort(createMemoryBacking()), {
    now: createTestClock(Date.now()).now,
    newId: createTestIds(),
  });

const renderApp = async (store: Store, storage: PreferenceStorage, initialUrl: string) => {
  const Layout = () => (
    <ThemeProvider>
      <HandProvider storage={storage}>
        <StoreProvider store={store}>
          <Stack screenOptions={{ headerShown: false }} />
        </StoreProvider>
      </HandProvider>
    </ThemeProvider>
  );
  await renderRouter(
    { _layout: Layout, settings: SettingsScreen, 'review/[deckId]': ReviewScreen },
    { initialUrl },
  );
  await act(async () => {});
};

const option = (name: string) => screen.getByRole('radio', { name });

// 메모가 있는 카드 한 장을 연다.
const openReview = async (storage: PreferenceStorage) => {
  const store = newStore();
  const deck = await store.createDeck({ name: '일본어' });
  await store.createCard(deck.id, { front: '食べる', back: '먹다', memo: 'る동사' });
  await renderApp(store, storage, `/review/${deck.id}`);
};

describe('주로 쓰는 손: 설정', () => {
  test('처음에는 오른손이 선택돼 있다', async () => {
    await renderApp(newStore(), memoryStorage().storage, '/settings');

    expect(screen.getByLabelText('주로 쓰는 손').props.accessibilityRole).toBe('radiogroup');
    expect(screen.getByText('복습 버튼 위치')).toBeTruthy();
    expect(option('오른손')).toBeChecked();
    expect(option('왼손')).not.toBeChecked();
  });

  test('왼손을 고르면 선택이 바뀌고 저장된다', async () => {
    const { storage, items } = memoryStorage();
    await renderApp(newStore(), storage, '/settings');
    const user = userEvent.setup();

    await user.press(option('왼손'));

    expect(option('왼손')).toBeChecked();
    expect(option('오른손')).not.toBeChecked();
    expect(items.hand).toBe('left');
  });

  test('저장한 선택으로 다시 시작한다', async () => {
    await renderApp(newStore(), memoryStorage({ hand: 'left' }).storage, '/settings');

    expect(option('왼손')).toBeChecked();
  });
});

describe('주로 쓰는 손: 복습 화면', () => {
  test.each([
    { hand: 'right', side: 'flex-end', margin: { marginRight: space[4] } },
    { hand: 'left', side: 'flex-start', margin: { marginLeft: space[4] } },
  ] as const)(
    '$hand: 메모 버튼이 카드 아래 그쪽 모서리에 모인다',
    async ({ hand, side, margin }) => {
      await openReview(memoryStorage({ hand }).storage);

      const buttons = screen.getByTestId('review-extra-buttons');
      expect(within(buttons).getByRole('button', { name: '메모 열기' })).toBeTruthy();
      expect(buttons).toHaveStyle({ alignSelf: side, ...margin });
    },
  );

  test.each(['right', 'left'])('%s: 평가 버튼 순서는 모름·헷갈림·앎이다', async (hand) => {
    await openReview(memoryStorage({ hand }).storage);
    const user = userEvent.setup();

    await user.press(screen.getByRole('button', { name: '정답 확인' }));

    expect(
      within(screen.getByLabelText('평가'))
        .getAllByRole('button')
        .map((button) => button.props.accessibilityLabel),
    ).toEqual(['모름', '헷갈림', '앎']);
  });
});

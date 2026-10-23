import { Stack } from 'expo-router';
import { userEvent } from '@testing-library/react-native';
import { act, renderRouter, screen } from 'expo-router/testing-library';

import TrashScreen from '@/app/trash';
import { createMemoryBacking, createMemoryPort } from '@/storage/memory-port';
import { createStore, type Store } from '@/storage/store';
import { StoreProvider } from '@/storage/StoreProvider';
import { createTestClock, createTestIds } from '@/storage/testing/deps';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { toastHold } from '@/theme/tokens';

// 휴지통에서 복구하는 흐름을 실제 라우터 위에서 메모리 Store로 돌린다(card-edit.test.tsx와 같은 방식).
jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual('react-native-safe-area-context/jest/mock').default,
);

const newStore = (): Store =>
  createStore(createMemoryPort(createMemoryBacking()), {
    now: createTestClock().now,
    newId: createTestIds(),
  });

const renderTrash = async (store: Store) => {
  const Layout = () => (
    <ThemeProvider>
      <StoreProvider store={store}>
        <Stack screenOptions={{ headerShown: false }} />
      </StoreProvider>
    </ThemeProvider>
  );
  await renderRouter({ _layout: Layout, trash: TrashScreen }, { initialUrl: '/trash' });
  await act(async () => {});
};

const setupUser = () => userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

// 영어 단어 덱: apple은 먼저 따로 지우고, pear는 덱과 함께 지운다.
const seed = async () => {
  const store = newStore();
  const deck = await store.createDeck({ name: '영어 단어' });
  const apple = await store.createCard(deck.id, { front: 'apple', back: '사과' });
  const pear = await store.createCard(deck.id, { front: 'pear', back: '배' });
  await store.trashCard(apple.id);
  await store.trashDeck(deck.id);
  return { store, deck, apple, pear };
};

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

describe('휴지통 복구', () => {
  test('덱이 휴지통에 있어도 따로 지운 카드가 덱 이름과 함께 보인다', async () => {
    const { store } = await seed();
    await renderTrash(store);

    expect(screen.getByText('카드 1')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'apple 복구' })).toBeOnTheScreen();
    expect(screen.getByText(/사과 · 영어 단어/)).toBeOnTheScreen();
  });

  test('덱의 복구는 안내 시트를 거치고, 함께 지운 카드만 돌아온다', async () => {
    const { store, deck, pear } = await seed();
    await renderTrash(store);
    const user = setupUser();

    await user.press(screen.getByRole('button', { name: '영어 단어 복구' }));

    expect(
      screen.getByText(
        '덱과 함께 지운 카드 1장이 같이 돌아와요. 덱을 지우기 전에 따로 지운 카드는 휴지통에 그대로 남아요.',
      ),
    ).toBeOnTheScreen();
    expect(await store.getDeck(deck.id)).toBeNull();

    await user.press(screen.getByRole('button', { name: '복구' }));
    await act(async () => {});

    expect(screen.getByText('덱을 복구했어요')).toBeOnTheScreen();
    expect(await store.listCards(deck.id)).toEqual([pear]);
    expect(screen.queryByText('덱 1')).toBeNull();
    expect(screen.getByRole('button', { name: 'apple 복구' })).toBeOnTheScreen();
  });

  test('덱 줄을 눌러도 같은 안내 시트가 열리고, 취소하면 복구하지 않는다', async () => {
    const { store, deck } = await seed();
    await renderTrash(store);
    const user = setupUser();

    await user.press(screen.getByRole('button', { name: /^덱 영어 단어,/ }));
    await user.press(screen.getByRole('button', { name: '취소' }));
    await act(async () => {});

    expect(await store.getDeck(deck.id)).toBeNull();
    expect(screen.getByText('덱 1')).toBeOnTheScreen();
  });

  test('덱이 휴지통에 있는 카드를 복구하려 하면 덱을 먼저 복구하라고 안내한다', async () => {
    const { store, apple } = await seed();
    await renderTrash(store);
    const user = setupUser();

    await user.press(screen.getByRole('button', { name: 'apple 복구' }));
    await act(async () => {});

    expect(screen.getByRole('header', { name: '덱이 휴지통에 있어요' })).toBeOnTheScreen();
    expect(screen.getByText(/먼저 영어 단어 덱을 복구해 주세요/)).toBeOnTheScreen();
    expect(await store.getCard(apple.id)).toBeNull();
  });

  test('카드는 바로 복구되고, 토스트는 잠시 뒤 사라진다', async () => {
    const { store, deck, apple, pear } = await seed();
    await store.restoreDeck(deck.id);
    await renderTrash(store);
    const user = setupUser();

    await user.press(screen.getByRole('button', { name: 'apple 복구' }));
    await act(async () => {});

    expect(screen.getByText('카드를 복구했어요')).toBeOnTheScreen();
    expect(await store.listCards(deck.id)).toEqual([apple, pear]);
    expect(screen.getByText('휴지통이 비어 있어요')).toBeOnTheScreen();

    await act(async () => {
      jest.advanceTimersByTime(toastHold.plain);
    });

    expect(screen.queryByText('카드를 복구했어요')).toBeNull();
  });
});

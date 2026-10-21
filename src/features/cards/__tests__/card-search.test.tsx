import { Stack } from 'expo-router';
import { userEvent } from '@testing-library/react-native';
import { act, renderRouter, screen } from 'expo-router/testing-library';

import DeckScreen from '@/app/deck/[id]';
import { createMemoryBacking, createMemoryPort } from '@/storage/memory-port';
import { createStore, type Store } from '@/storage/store';
import { StoreProvider } from '@/storage/StoreProvider';
import { createTestClock, createTestIds } from '@/storage/testing/deps';
import { ThemeProvider } from '@/theme/ThemeProvider';

// 덱 상세의 카드 검색(Deck-3)을 실제 라우터 위에서 메모리 Store로 돌린다.
jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual('react-native-safe-area-context/jest/mock').default,
);

const newStore = (): Store =>
  createStore(createMemoryPort(createMemoryBacking()), {
    now: createTestClock().now,
    newId: createTestIds(),
  });

const renderDeck = async (store: Store, deckId: string) => {
  const Layout = () => (
    <ThemeProvider>
      <StoreProvider store={store}>
        <Stack screenOptions={{ headerShown: false }} />
      </StoreProvider>
    </ThemeProvider>
  );
  await renderRouter(
    { _layout: Layout, 'deck/[id]': DeckScreen },
    { initialUrl: `/deck/${deckId}` },
  );
  await act(async () => {});
};

const setupUser = () => userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

const seed = async () => {
  const store = newStore();
  const deck = await store.createDeck({ name: '일본어' });
  await store.createCard(deck.id, { front: '食べる', back: '먹다', memo: '朝ごはん' });
  await store.createCard(deck.id, { front: '食事', back: '식사' });
  await store.createCard(deck.id, { front: '寒い', back: '춥다', memo: '食べ物が冷たい' });
  await store.createCard(deck.id, { front: '景色', back: '경치' });
  return { store, deck };
};

describe('카드 검색', () => {
  test('앞면·뒷면·메모에서 일치하는 카드만 목록에 남는다', async () => {
    const { store, deck } = await seed();
    await renderDeck(store, deck.id);
    const user = setupUser();
    const input = screen.getByLabelText('카드 검색');

    await user.type(input, '食');
    expect(screen.getByLabelText('食べる, 먹다')).toBeOnTheScreen();
    expect(screen.getByLabelText('食事, 식사')).toBeOnTheScreen();
    expect(screen.getByLabelText('寒い, 춥다')).toBeOnTheScreen(); // 메모에 일치
    expect(screen.queryByLabelText('景色, 경치')).toBeNull();
    expect(screen.getByRole('status')).toHaveTextContent('3장');

    await user.clear(input);
    await user.type(input, '경치');
    expect(screen.getByLabelText('景色, 경치')).toBeOnTheScreen();
    expect(screen.queryByLabelText('食べる, 먹다')).toBeNull();
    expect(screen.getByRole('status')).toHaveTextContent('1장');
  });

  test('일치하는 카드가 없으면 검색 결과 없음 상태가 나온다', async () => {
    const { store, deck } = await seed();
    await renderDeck(store, deck.id);
    const user = setupUser();

    await user.type(screen.getByLabelText('카드 검색'), 'zzz');

    expect(screen.getByText('검색 결과가 없어요')).toBeOnTheScreen();
    expect(screen.queryByLabelText('食べる, 먹다')).toBeNull();
    expect(screen.queryByText('아직 카드가 없어요')).toBeNull();
  });

  test('검색어 지우기를 누르면 전체 목록으로 돌아온다', async () => {
    const { store, deck } = await seed();
    await renderDeck(store, deck.id);
    const user = setupUser();
    const input = screen.getByLabelText('카드 검색');

    expect(screen.queryByRole('button', { name: '검색어 지우기' })).toBeNull();
    await user.type(input, 'zzz');
    await user.press(screen.getByRole('button', { name: '검색어 지우기' }));

    expect(input.props.value).toBe('');
    expect(screen.queryByText('검색 결과가 없어요')).toBeNull();
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.getAllByLabelText(/, /)).toHaveLength(4);
  });

  test('입력을 직접 비워도 전체 목록으로 돌아온다', async () => {
    const { store, deck } = await seed();
    await renderDeck(store, deck.id);
    const user = setupUser();
    const input = screen.getByLabelText('카드 검색');

    await user.type(input, 'zzz');
    await user.clear(input);

    expect(screen.getAllByLabelText(/, /)).toHaveLength(4);
  });

  test('카드가 없는 덱에는 검색칸이 없다', async () => {
    const store = newStore();
    const deck = await store.createDeck({ name: '빈 덱' });
    await renderDeck(store, deck.id);

    expect(screen.queryByLabelText('카드 검색')).toBeNull();
  });
});

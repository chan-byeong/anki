import { Stack, useLocalSearchParams } from 'expo-router';
import { Text } from 'react-native';
import { userEvent } from '@testing-library/react-native';
import { act, renderRouter, screen } from 'expo-router/testing-library';

import HomeScreen from '@/app/index';
import NewDeckScreen from '@/app/deck/new';
import { createMemoryBacking, createMemoryPort } from '@/storage/memory-port';
import { createStore, type Store } from '@/storage/store';
import { StoreProvider } from '@/storage/StoreProvider';
import { createTestClock, createTestIds } from '@/storage/testing/deps';
import { ThemeProvider } from '@/theme/ThemeProvider';

// 홈과 덱 만들기를 실제 라우터 위에서 메모리 Store로 돌린다. 앱의 _layout은 SQLite를 열므로 쓰지 않는다.
// 덱 상세와 복습은 도착한 경로를 글자로 보여 주는 자리로 바꾼다. expo-router의 getPathname·toHavePathname은
// RNTL v14의 비동기 render와 맞지 않아 쓰지 않는다.
jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual('react-native-safe-area-context/jest/mock').default,
);

const newStore = (): Store =>
  createStore(createMemoryPort(createMemoryBacking()), {
    now: createTestClock().now,
    newId: createTestIds(),
  });

function DeckRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <Text>{`/deck/${id}`}</Text>;
}

function ReviewRoute() {
  const { deckId } = useLocalSearchParams<{ deckId: string }>();
  return <Text>{`/review/${deckId}`}</Text>;
}

const renderApp = async (store: Store) => {
  const Layout = () => (
    <ThemeProvider>
      <StoreProvider store={store}>
        <Stack screenOptions={{ headerShown: false }} />
      </StoreProvider>
    </ThemeProvider>
  );
  // renderRouter는 가짜 타이머를 켜고, RNTL v14의 비동기 render를 돌려준다.
  await renderRouter(
    {
      _layout: Layout,
      index: HomeScreen,
      'deck/new': NewDeckScreen,
      'deck/[id]': DeckRoute,
      'review/[deckId]': ReviewRoute,
    },
    { initialUrl: '/' },
  );
  // 첫 목록 읽기가 끝나기를 기다린다.
  await act(async () => {});
};

const setupUser = () => userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

describe('덱 목록', () => {
  test('덱이 없으면 빈 상태가 보이고, 덱을 만들면 목록에 나타난다', async () => {
    const store = newStore();
    await renderApp(store);
    const user = setupUser();

    expect(screen.getByText('아직 덱이 없어요')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: '덱 만들기' }));
    expect(screen.getByRole('header', { name: '덱 만들기' })).toBeOnTheScreen();

    await user.type(screen.getByLabelText('이름'), '영어 단어');
    await user.press(screen.getByRole('button', { name: '만들기' }));

    expect(
      await screen.findByRole('button', { name: '영어 단어 덱 상세, 오늘 복습 끝' }),
    ).toBeOnTheScreen();
    expect(screen.queryByText('아직 덱이 없어요')).toBeNull();
    expect(await store.listDecks()).toMatchObject([{ name: '영어 단어' }]);
  });

  test('덱마다 오늘 복습할 카드 수가 보이고, 없는 덱은 구분된다', async () => {
    const store = newStore();
    const words = await store.createDeck({ name: '영어 단어' });
    await store.createDeck({ name: '개발 지식' });
    await store.createCard(words.id, { front: 'apple', back: '사과' });
    await store.createCard(words.id, { front: 'pear', back: '배' });
    await renderApp(store);
    const user = setupUser();

    expect(screen.getByRole('button', { name: '영어 단어 복습 시작, 2장' })).toBeOnTheScreen();
    expect(screen.getByText('2')).toBeOnTheScreen();
    expect(
      screen.getByRole('button', { name: '개발 지식 덱 상세, 오늘 복습 끝' }),
    ).toBeOnTheScreen();
    expect(screen.queryByText('오늘 복습할 카드 없음')).toBeNull();

    await user.press(screen.getByRole('button', { name: '영어 단어 복습 시작, 2장' }));
    expect(screen.getByText(`/review/${words.id}`)).toBeOnTheScreen();
  });

  test('줄 끝 메뉴에서 덱 상세에 들어간다', async () => {
    const store = newStore();
    const words = await store.createDeck({ name: '영어 단어' });
    await store.createCard(words.id, { front: 'apple', back: '사과' });
    await renderApp(store);
    const user = setupUser();

    await user.press(screen.getByRole('button', { name: '영어 단어 메뉴' }));
    await user.press(await screen.findByRole('button', { name: '덱 상세' }));

    expect(screen.getByText(`/deck/${words.id}`)).toBeOnTheScreen();
  });

  test('모든 덱의 오늘 복습이 끝나면 아래에 알린다', async () => {
    const store = newStore();
    await store.createDeck({ name: '개발 지식' });
    await renderApp(store);

    expect(screen.getByText('오늘 복습할 카드 없음')).toBeOnTheScreen();
  });
});

describe('덱 만들기', () => {
  test('이름이 비었거나 공백뿐이면 만들 수 없다', async () => {
    const store = newStore();
    await renderApp(store);
    const user = setupUser();
    await user.press(screen.getByRole('button', { name: '덱 추가' }));

    const create = screen.getByRole('button', { name: '만들기' });
    expect(create).toBeDisabled();
    await user.type(screen.getByLabelText('이름'), '   ');
    expect(create).toBeDisabled();
    expect(await store.listDecks()).toEqual([]);
  });
});

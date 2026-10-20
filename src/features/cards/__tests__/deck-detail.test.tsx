import { Stack, useLocalSearchParams } from 'expo-router';
import { Text } from 'react-native';
import { userEvent } from '@testing-library/react-native';
import { act, renderRouter, screen } from 'expo-router/testing-library';

import NewCardScreen from '@/app/card/new';
import DeckScreen from '@/app/deck/[id]';
import HomeScreen from '@/app/index';
import { createMemoryBacking, createMemoryPort } from '@/storage/memory-port';
import { createStore, type Store } from '@/storage/store';
import { StoreProvider } from '@/storage/StoreProvider';
import { createTestClock, createTestIds } from '@/storage/testing/deps';
import { ThemeProvider } from '@/theme/ThemeProvider';

// 홈, 덱 상세, 카드 추가를 실제 라우터 위에서 메모리 Store로 돌린다(deck-list.test.tsx와 같은 방식).
// 복습은 도착한 경로를 글자로 보여 주는 자리로 바꾼다.
jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual('react-native-safe-area-context/jest/mock').default,
);

const newStore = (): Store =>
  createStore(createMemoryPort(createMemoryBacking()), {
    now: createTestClock().now,
    newId: createTestIds(),
  });

function ReviewRoute() {
  const { deckId } = useLocalSearchParams<{ deckId: string }>();
  return <Text>{`/review/${deckId}`}</Text>;
}

const renderApp = async (store: Store, initialUrl: string) => {
  const Layout = () => (
    <ThemeProvider>
      <StoreProvider store={store}>
        <Stack screenOptions={{ headerShown: false }} />
      </StoreProvider>
    </ThemeProvider>
  );
  await renderRouter(
    {
      _layout: Layout,
      index: HomeScreen,
      'deck/[id]': DeckScreen,
      'card/new': NewCardScreen,
      'review/[deckId]': ReviewRoute,
    },
    { initialUrl },
  );
  await act(async () => {});
};

const setupUser = () => userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

const LONG_FRONT = '긴 앞면 '.repeat(120).trim();
const LONG_BACK = '긴 뒷면 '.repeat(120).trim();

describe('덱 상세', () => {
  test('카드가 없으면 빈 상태와 카드 추가 버튼이 보인다', async () => {
    const store = newStore();
    const deck = await store.createDeck({ name: '영어 단어' });
    await renderApp(store, `/deck/${deck.id}`);

    expect(screen.getByRole('header', { name: '영어 단어' })).toBeOnTheScreen();
    expect(screen.getByText('카드 0장')).toBeOnTheScreen();
    expect(screen.getByText('아직 카드가 없어요')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: '카드 추가' })).toBeOnTheScreen();
  });

  test('카드가 있으면 목록에 앞면과 뒷면이 보이고 최근 카드가 위에 온다', async () => {
    const store = newStore();
    const deck = await store.createDeck({ name: '영어 단어' });
    await store.createCard(deck.id, { front: 'apple', back: '사과' });
    await store.createCard(deck.id, { front: 'pear', back: '배' });
    await renderApp(store, `/deck/${deck.id}`);

    expect(screen.getByText('카드 2장 · 오늘 2장')).toBeOnTheScreen();
    expect(screen.queryByText('아직 카드가 없어요')).toBeNull();
    const rows = screen.getAllByLabelText(/^(apple|pear),/);
    expect(rows.map((row) => row.props.accessibilityLabel)).toEqual(['pear, 배', 'apple, 사과']);
  });

  test('카드가 있고 오늘 복습할 카드가 있으면 복습을 시작할 수 있다', async () => {
    const store = newStore();
    const deck = await store.createDeck({ name: '영어 단어' });
    await store.createCard(deck.id, { front: 'apple', back: '사과' });
    await renderApp(store, `/deck/${deck.id}`);
    const user = setupUser();

    await user.press(screen.getByRole('button', { name: '복습 시작 1장' }));

    expect(screen.getByText(`/review/${deck.id}`)).toBeOnTheScreen();
  });

  test('긴 앞면과 뒷면도 목록에서 줄임표 없이 전부 보인다', async () => {
    const store = newStore();
    const deck = await store.createDeck({ name: '영어 단어' });
    await store.createCard(deck.id, { front: LONG_FRONT, back: LONG_BACK });
    await renderApp(store, `/deck/${deck.id}`);

    const front = screen.getByText(LONG_FRONT);
    const back = screen.getByText(LONG_BACK);
    expect(front.props.numberOfLines).toBeUndefined();
    expect(back.props.numberOfLines).toBeUndefined();
  });
});

describe('카드 추가', () => {
  const openForm = async (store: Store, deckId: string) => {
    await renderApp(store, `/deck/${deckId}`);
    const user = setupUser();
    await user.press(screen.getByRole('button', { name: '카드 추가' }));
    return user;
  };

  test('앞면과 뒷면을 입력해 저장하면 덱 상세 목록에 나타난다', async () => {
    const store = newStore();
    const deck = await store.createDeck({ name: '영어 단어' });
    const user = await openForm(store, deck.id);

    await user.type(screen.getByLabelText('앞면'), 'apple');
    await user.type(screen.getByLabelText('뒷면'), '사과');
    await user.press(screen.getByRole('button', { name: '저장' }));
    await user.press(screen.getByRole('button', { name: '닫기' }));

    expect(await screen.findByLabelText('apple, 사과')).toBeOnTheScreen();
    expect(screen.queryByText('아직 카드가 없어요')).toBeNull();
  });

  test('메모를 비워도 저장되고, 저장 뒤에는 방금 추가한 카드를 알린다', async () => {
    const store = newStore();
    const deck = await store.createDeck({ name: '영어 단어' });
    const user = await openForm(store, deck.id);

    await user.type(screen.getByLabelText('앞면'), 'apple');
    await user.type(screen.getByLabelText('뒷면'), '사과');
    await user.press(screen.getByRole('button', { name: '저장' }));

    expect(await screen.findByText('방금 추가 · apple')).toBeOnTheScreen();
    expect(screen.getByLabelText('앞면').props.value).toBe('');
    expect(await store.listCards(deck.id)).toMatchObject([
      { front: 'apple', back: '사과', memo: null },
    ]);
  });

  test('메모가 공백뿐이면 비운 것으로 본다', async () => {
    const store = newStore();
    const deck = await store.createDeck({ name: '영어 단어' });
    const user = await openForm(store, deck.id);

    await user.type(screen.getByLabelText('앞면'), 'apple');
    await user.type(screen.getByLabelText('뒷면'), '사과');
    await user.type(screen.getByLabelText('메모 (선택)'), '   ');
    await user.press(screen.getByRole('button', { name: '저장' }));

    await screen.findByText('방금 추가 · apple');
    expect(await store.listCards(deck.id)).toMatchObject([{ memo: null }]);
  });

  test('앞면이나 뒷면이 비었거나 공백뿐이면 저장할 수 없다', async () => {
    const store = newStore();
    const deck = await store.createDeck({ name: '영어 단어' });
    const user = await openForm(store, deck.id);

    const save = screen.getByRole('button', { name: '저장' });
    expect(save).toBeDisabled();
    expect(screen.getByText('앞면과 뒷면을 적으면 저장할 수 있어요')).toBeOnTheScreen();

    await user.type(screen.getByLabelText('앞면'), 'apple');
    expect(save).toBeDisabled();
    await user.type(screen.getByLabelText('뒷면'), '   ');
    expect(save).toBeDisabled();
    expect(await store.listCards(deck.id)).toEqual([]);
  });

  test('카드는 만든 덱에 속하고 다른 덱에는 나타나지 않는다', async () => {
    const store = newStore();
    const words = await store.createDeck({ name: '영어 단어' });
    const dev = await store.createDeck({ name: '개발 지식' });
    const user = await openForm(store, words.id);

    await user.type(screen.getByLabelText('앞면'), 'apple');
    await user.type(screen.getByLabelText('뒷면'), '사과');
    await user.press(screen.getByRole('button', { name: '저장' }));
    await screen.findByText('방금 추가 · apple');

    expect(await store.listCards(words.id)).toHaveLength(1);
    expect(await store.listCards(dev.id)).toHaveLength(0);
  });

  test('새 카드는 홈의 오늘 복습할 카드 수에 들어간다', async () => {
    const store = newStore();
    const deck = await store.createDeck({ name: '영어 단어' });
    const user = await openForm(store, deck.id);

    await user.type(screen.getByLabelText('앞면'), 'apple');
    await user.type(screen.getByLabelText('뒷면'), '사과');
    await user.press(screen.getByRole('button', { name: '저장' }));
    await screen.findByText('방금 추가 · apple');

    expect((await store.countUnreviewedCards())[deck.id]).toBe(1);
  });

  test('긴 앞면과 뒷면도 그대로 저장된다', async () => {
    const store = newStore();
    const deck = await store.createDeck({ name: '영어 단어' });
    const user = await openForm(store, deck.id);

    await user.paste(screen.getByLabelText('앞면'), LONG_FRONT);
    await user.paste(screen.getByLabelText('뒷면'), LONG_BACK);
    await user.press(screen.getByRole('button', { name: '저장' }));

    await screen.findByText(/^방금 추가/);
    expect(await store.listCards(deck.id)).toMatchObject([{ front: LONG_FRONT, back: LONG_BACK }]);
  });
});

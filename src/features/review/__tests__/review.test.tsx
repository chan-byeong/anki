import { Stack, useLocalSearchParams } from 'expo-router';
import { AccessibilityInfo, Text } from 'react-native';
import { userEvent } from '@testing-library/react-native';
import { act, renderRouter, screen } from 'expo-router/testing-library';

import HomeScreen from '@/app/index';
import ReviewScreen from '@/app/review/[deckId]';
import { createMemoryBacking, createMemoryPort } from '@/storage/memory-port';
import { createStore, type Store } from '@/storage/store';
import { StoreProvider } from '@/storage/StoreProvider';
import { createTestClock, createTestIds } from '@/storage/testing/deps';
import { ThemeProvider } from '@/theme/ThemeProvider';

// 홈에서 덱을 눌러 복습을 여는 흐름을 실제 라우터 위에서 메모리 Store로 돌린다(deck-list.test.tsx와 같은 방식).
// 덱 상세는 도착한 경로를 글자로 보여 주는 자리로 바꾼다.
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
      'deck/[id]': DeckRoute,
      'review/[deckId]': ReviewScreen,
    },
    { initialUrl },
  );
  await act(async () => {});
};

const setupUser = () => userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

const LONG_FRONT = '긴 앞면 '.repeat(120).trim();
const LONG_BACK = '긴 뒷면 '.repeat(120).trim();

const seed = async () => {
  const store = newStore();
  const deck = await store.createDeck({ name: '영어 단어' });
  await store.createCard(deck.id, { front: 'apple', back: '사과' });
  await store.createCard(deck.id, { front: 'pear', back: '배' });
  return { store, deck };
};

describe('복습 화면: 앞면과 정답 확인', () => {
  test('홈에서 덱을 누르면 복습이 시작되고 가장 먼저 만든 카드의 앞면이 보인다', async () => {
    const { store } = await seed();
    await renderApp(store, '/');
    const user = setupUser();

    await user.press(screen.getByRole('button', { name: '영어 단어 복습 시작, 2장' }));

    expect(await screen.findByText('apple')).toBeOnTheScreen();
    expect(screen.queryByText('사과')).toBeNull();
    expect(screen.queryByText('pear')).toBeNull();
    expect(screen.getByText('2장 남음')).toBeOnTheScreen();
    expect(screen.getByText('영어 단어')).toBeOnTheScreen();
    expect(
      screen.getByText('카드를 눌러 정답 보기', { includeHiddenElements: true }),
    ).toBeOnTheScreen();
  });

  test('카드는 스크린 리더에 정답 확인 버튼으로 읽히고, 앞면도 함께 읽힌다', async () => {
    const { store, deck } = await seed();
    await renderApp(store, `/review/${deck.id}`);

    const card = screen.getByRole('button', { name: '정답 확인' });
    expect(card.props.accessibilityValue).toEqual({ text: '앞면 apple' });
  });

  test('카드를 누르면 뒷면이 열리고 열렸다고 알려 준다', async () => {
    const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility');
    const { store, deck } = await seed();
    await renderApp(store, `/review/${deck.id}`);
    const user = setupUser();

    await user.press(screen.getByRole('button', { name: '정답 확인' }));

    expect(screen.getByText('사과')).toBeOnTheScreen();
    expect(screen.getByText('apple')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: '정답 확인' })).toBeNull();
    expect(screen.queryByText('카드를 눌러 정답 보기', { includeHiddenElements: true })).toBeNull();
    expect(announce).toHaveBeenCalledWith('정답이 열렸어요. 사과');
    announce.mockRestore();
  });

  test('뒷면이 들어올 자리는 열리기 전부터 라이브 영역이라 웹에서도 열림을 읽어 준다', async () => {
    const { store, deck } = await seed();
    await renderApp(store, `/review/${deck.id}`);
    const user = setupUser();
    const answer = screen.getByTestId('review-answer');

    expect(answer.props['aria-live']).toBe('polite');
    expect(screen.queryByText('사과')).toBeNull();

    await user.press(screen.getByRole('button', { name: '정답 확인' }));

    expect(screen.getByTestId('review-answer')).toBe(answer);
    expect(screen.getByTestId('review-answer')).toHaveTextContent('사과');
  });

  test('복습할 카드가 없는 덱의 복습 화면은 덱 상세로 보낸다', async () => {
    const store = newStore();
    const deck = await store.createDeck({ name: '빈 덱' });
    await renderApp(store, `/review/${deck.id}`);

    expect(await screen.findByText(`/deck/${deck.id}`)).toBeOnTheScreen();
    expect(screen.queryByText('카드를 눌러 정답 보기', { includeHiddenElements: true })).toBeNull();
  });

  test('이미 평가한 카드는 대기열에 들어가지 않는다', async () => {
    const { store, deck } = await seed();
    const [apple] = await store.listCards(deck.id);
    await store.rateCard(apple.id, { id: 'review-1', rating: 'know', hintUsed: false });
    await renderApp(store, `/review/${deck.id}`);

    expect(screen.getByText('pear')).toBeOnTheScreen();
    expect(screen.getByText('1장 남음')).toBeOnTheScreen();
  });

  test('덱이 없거나 휴지통에 있으면 안내한다', async () => {
    const { store, deck } = await seed();
    await store.trashDeck(deck.id);
    await renderApp(store, `/review/${deck.id}`);

    expect(screen.getByText('덱이 없거나 휴지통에 있어요')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: '정답 확인' })).toBeNull();
  });

  test('긴 앞면과 뒷면은 줄임표 없이 스크롤 영역 안에 있다', async () => {
    const store = newStore();
    const deck = await store.createDeck({ name: '긴 카드' });
    await store.createCard(deck.id, { front: LONG_FRONT, back: LONG_BACK });
    await renderApp(store, `/review/${deck.id}`);
    const user = setupUser();

    expect(screen.getByText(LONG_FRONT).props.numberOfLines).toBeUndefined();
    expect(screen.getByTestId('review-scroll')).toBeOnTheScreen();

    await user.press(screen.getByRole('button', { name: '정답 확인' }));

    expect(screen.getByText(LONG_BACK).props.numberOfLines).toBeUndefined();
    expect(screen.getByTestId('review-scroll')).toBeOnTheScreen();
  });

  test('정답을 열어도 스크롤 영역이 다시 만들어지지 않아 읽던 위치가 유지된다', async () => {
    const store = newStore();
    const deck = await store.createDeck({ name: '긴 카드' });
    await store.createCard(deck.id, { front: LONG_FRONT, back: LONG_BACK });
    await renderApp(store, `/review/${deck.id}`);
    const user = setupUser();
    const before = screen.getByTestId('review-scroll');

    await user.press(screen.getByRole('button', { name: '정답 확인' }));

    expect(screen.getByTestId('review-scroll')).toBe(before);
  });

  test('닫기를 누르면 이전 화면으로 돌아간다', async () => {
    const { store } = await seed();
    await renderApp(store, '/');
    const user = setupUser();

    await user.press(screen.getByRole('button', { name: '영어 단어 복습 시작, 2장' }));
    await user.press(await screen.findByRole('button', { name: '복습 닫기' }));

    expect(await screen.findByRole('header', { name: '덱' })).toBeOnTheScreen();
    expect(screen.queryByText('2장 남음')).toBeNull();
  });
});

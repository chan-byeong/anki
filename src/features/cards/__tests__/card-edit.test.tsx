import { Stack } from 'expo-router';
import { userEvent } from '@testing-library/react-native';
import { act, renderRouter, screen } from 'expo-router/testing-library';

import EditCardScreen from '@/app/card/[id]';
import DeckScreen from '@/app/deck/[id]';
import { createMemoryBacking, createMemoryPort } from '@/storage/memory-port';
import type { Port } from '@/storage/port';
import { createStore, type Store } from '@/storage/store';
import { StoreProvider } from '@/storage/StoreProvider';
import { createTestClock, createTestIds } from '@/storage/testing/deps';
import { ThemeProvider } from '@/theme/ThemeProvider';

// 덱 상세에서 카드를 열어 편집하는 흐름을 실제 라우터 위에서 메모리 Store로 돌린다(deck-detail.test.tsx와 같은 방식).
jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual('react-native-safe-area-context/jest/mock').default,
);

// 수정 시각은 Store 밖으로 나오지 않으므로 포트를 함께 돌려줘서 행을 직접 읽는다.
const newStore = (): { store: Store; port: Port } => {
  const port = createMemoryPort(createMemoryBacking());
  const store = createStore(port, { now: createTestClock().now, newId: createTestIds() });
  return { store, port };
};

const renderApp = async (store: Store, initialUrl: string) => {
  const Layout = () => (
    <ThemeProvider>
      <StoreProvider store={store}>
        <Stack screenOptions={{ headerShown: false }} />
      </StoreProvider>
    </ThemeProvider>
  );
  await renderRouter(
    { _layout: Layout, 'deck/[id]': DeckScreen, 'card/[id]': EditCardScreen },
    { initialUrl },
  );
  await act(async () => {});
};

const setupUser = () => userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

const seed = async () => {
  const { store, port } = newStore();
  const deck = await store.createDeck({ name: '영어 단어' });
  const card = await store.createCard(deck.id, { front: 'apple', back: '사과', memo: '과일' });
  return { store, port, deck, card };
};

describe('카드 편집', () => {
  test('덱 상세에서 카드를 누르면 앞면·뒷면·메모가 채워진 편집 화면이 열린다', async () => {
    const { store, deck } = await seed();
    await renderApp(store, `/deck/${deck.id}`);
    const user = setupUser();

    await user.press(screen.getByRole('button', { name: 'apple, 사과' }));

    expect(screen.getByRole('header', { name: '카드 편집' })).toBeOnTheScreen();
    expect(screen.getByLabelText('앞면').props.value).toBe('apple');
    expect(screen.getByLabelText('뒷면').props.value).toBe('사과');
    expect(screen.getByLabelText('메모 (선택)').props.value).toBe('과일');
    expect(screen.getByLabelText('덱: 영어 단어')).toBeOnTheScreen();
  });

  test('고쳐서 저장하면 덱 상세 목록에 반영된다', async () => {
    const { store, deck, card } = await seed();
    await renderApp(store, `/deck/${deck.id}`);
    const user = setupUser();

    await user.press(screen.getByRole('button', { name: 'apple, 사과' }));
    await user.clear(screen.getByLabelText('뒷면'));
    await user.type(screen.getByLabelText('뒷면'), '애플');
    await user.press(screen.getByRole('button', { name: '저장' }));

    expect(await screen.findByRole('button', { name: 'apple, 애플' })).toBeOnTheScreen();
    expect(screen.queryByRole('header', { name: '카드 편집' })).toBeNull();
    expect(await store.getCard(card.id)).toMatchObject({ front: 'apple', back: '애플' });
  });

  test('고친 필드의 수정 시각만 바뀌고 다른 필드는 그대로다', async () => {
    const { store, port, deck, card } = await seed();
    const before = await port.cards.get(card.id);
    await renderApp(store, `/deck/${deck.id}`);
    const user = setupUser();

    await user.press(screen.getByRole('button', { name: 'apple, 사과' }));
    await user.clear(screen.getByLabelText('뒷면'));
    await user.type(screen.getByLabelText('뒷면'), '애플');
    await user.press(screen.getByRole('button', { name: '저장' }));
    await screen.findByRole('button', { name: 'apple, 애플' });

    const after = await port.cards.get(card.id);
    expect(after!.back_ts).toBeGreaterThan(before!.back_ts);
    expect(after!.front_ts).toBe(before!.front_ts);
    expect(after!.memo_ts).toBe(before!.memo_ts);
    expect(after!.image_ts).toBe(before!.image_ts);
  });

  test('아무것도 고치지 않고 저장하면 수정 시각이 그대로다', async () => {
    const { store, port, deck, card } = await seed();
    const before = await port.cards.get(card.id);
    await renderApp(store, `/deck/${deck.id}`);
    const user = setupUser();

    await user.press(screen.getByRole('button', { name: 'apple, 사과' }));
    await user.press(screen.getByRole('button', { name: '저장' }));
    await screen.findByRole('button', { name: 'apple, 사과' });

    expect(await port.cards.get(card.id)).toEqual(before);
  });

  test('메모를 비우고 저장하면 메모가 없는 카드가 된다', async () => {
    const { store, deck, card } = await seed();
    await renderApp(store, `/deck/${deck.id}`);
    const user = setupUser();

    await user.press(screen.getByRole('button', { name: 'apple, 사과' }));
    await user.clear(screen.getByLabelText('메모 (선택)'));
    await user.press(screen.getByRole('button', { name: '저장' }));
    await screen.findByRole('button', { name: 'apple, 사과' });

    expect(await store.getCard(card.id)).toMatchObject({ memo: null });
  });

  test.each(['앞면', '뒷면'])(
    '%s을 비우거나 공백만 두면 저장되지 않고 이유가 안내된다',
    async (label) => {
      const { store, deck, card } = await seed();
      await renderApp(store, `/deck/${deck.id}`);
      const user = setupUser();

      await user.press(screen.getByRole('button', { name: 'apple, 사과' }));
      expect(screen.queryByText('앞면과 뒷면을 적으면 저장할 수 있어요')).toBeNull();
      await user.clear(screen.getByLabelText(label));
      await user.type(screen.getByLabelText(label), '   ');

      expect(screen.getByRole('button', { name: '저장' })).toBeDisabled();
      expect(screen.getByText('앞면과 뒷면을 적으면 저장할 수 있어요')).toBeOnTheScreen();
      expect(await store.getCard(card.id)).toMatchObject({ front: 'apple', back: '사과' });
    },
  );

  test('닫기를 누르면 고친 내용을 버리고 덱 상세로 돌아간다', async () => {
    const { store, deck, card } = await seed();
    await renderApp(store, `/deck/${deck.id}`);
    const user = setupUser();

    await user.press(screen.getByRole('button', { name: 'apple, 사과' }));
    await user.clear(screen.getByLabelText('앞면'));
    await user.type(screen.getByLabelText('앞면'), 'pear');
    await user.press(screen.getByRole('button', { name: '닫기' }));

    expect(await screen.findByRole('button', { name: 'apple, 사과' })).toBeOnTheScreen();
    expect(await store.getCard(card.id)).toMatchObject({ front: 'apple' });
  });

  test('카드가 없거나 휴지통에 있으면 불러오지 못했다고 안내한다', async () => {
    const { store, card } = await seed();
    await store.trashCard(card.id);
    await renderApp(store, `/card/${card.id}`);

    expect(screen.getByText('카드가 없거나 휴지통에 있어요')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: '저장' })).toBeNull();
  });
});

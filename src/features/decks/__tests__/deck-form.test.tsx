import { Stack } from 'expo-router';
import { fireEvent, userEvent } from '@testing-library/react-native';
import { act, renderRouter, screen } from 'expo-router/testing-library';

import HomeScreen from '@/app/index';
import DeckScreen from '@/app/deck/[id]';
import EditDeckScreen from '@/app/deck/[id]/edit';
import NewDeckScreen from '@/app/deck/new';
import { createMemoryBacking, createMemoryPort } from '@/storage/memory-port';
import { createStore, type Store } from '@/storage/store';
import { StoreProvider } from '@/storage/StoreProvider';
import { createTestClock, createTestIds } from '@/storage/testing/deps';
import { ThemeProvider } from '@/theme/ThemeProvider';
import type { ThemeName } from '@/theme/tokens';

jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual('react-native-safe-area-context/jest/mock').default,
);

const newStore = () =>
  createStore(createMemoryPort(createMemoryBacking()), {
    now: createTestClock().now,
    newId: createTestIds(),
  });

const renderApp = async (store: Store, initialUrl = '/', theme: ThemeName = 'light') => {
  const Layout = () => (
    <ThemeProvider override={theme}>
      <StoreProvider store={store}>
        <Stack screenOptions={{ headerShown: false }} />
      </StoreProvider>
    </ThemeProvider>
  );
  await renderRouter(
    {
      _layout: Layout,
      index: HomeScreen,
      'deck/new': NewDeckScreen,
      'deck/[id]': DeckScreen,
      'deck/[id]/edit': EditDeckScreen,
    },
    { initialUrl },
  );
  await act(async () => {});
};

const setupUser = () => userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

const openEdit = async (name: string) => {
  const user = setupUser();
  await user.press(screen.getByRole('button', { name: `${name} 덱 상세, 오늘 복습 끝` }));
  await user.press(await screen.findByRole('button', { name: '덱 메뉴' }));
  await user.press(screen.getByRole('button', { name: '덱 편집' }));
  await screen.findByLabelText('이름');
  return user;
};

afterEach(() => jest.restoreAllMocks());

describe('덱 폼', () => {
  test.each([
    ['없음', null],
    ['일본어', 'ja'],
    ['영어', 'en'],
    ['한국어', 'ko'],
  ])('생성 시 %s 언어와 앞뒤 공백을 뺀 이름을 저장한다', async (label, language) => {
    const store = newStore();
    await renderApp(store);
    const user = setupUser();
    await user.press(screen.getByRole('button', { name: '덱 추가' }));
    expect(screen.getByRole('radio', { name: '없음' })).toBeChecked();
    expect(screen.getByText('이름을 적으면 만들 수 있어요')).toBeOnTheScreen();

    await user.type(screen.getByLabelText('이름'), '  새 덱  ');
    await user.press(screen.getByRole('radio', { name: label }));
    await user.press(screen.getByRole('button', { name: '만들기' }));

    expect(
      await screen.findByRole('button', { name: '새 덱 덱 상세, 오늘 복습 끝' }),
    ).toBeOnTheScreen();
    expect(await store.listDecks()).toMatchObject([{ name: '새 덱', language }]);
  });

  test.each<ThemeName>(['light', 'dark'])(
    '편집 값과 이름 변경·언어 해제가 상세와 홈에 반영된다 (%s)',
    async (theme) => {
      const store = newStore();
      const deck = await store.createDeck({ name: '일본어 단어', language: 'ja' });
      await renderApp(store, '/', theme);
      const user = await openEdit(deck.name);
      expect(screen.getByLabelText('이름')).toHaveDisplayValue(deck.name);
      expect(screen.getByRole('radio', { name: '일본어' })).toBeChecked();

      await user.clear(screen.getByLabelText('이름'));
      expect(screen.getByRole('button', { name: '저장' })).toBeDisabled();
      expect(screen.getByText('이름을 적으면 저장할 수 있어요')).toBeOnTheScreen();
      await user.type(screen.getByLabelText('이름'), '   ');
      await fireEvent(screen.getByLabelText('이름'), 'submitEditing');
      expect(await store.getDeck(deck.id)).toMatchObject({ name: deck.name });
      await user.clear(screen.getByLabelText('이름'));
      await user.type(screen.getByLabelText('이름'), '  고친 덱  ');
      await user.press(screen.getByRole('radio', { name: '없음' }));
      await user.press(screen.getByRole('button', { name: '저장' }));

      expect(await screen.findByRole('header', { name: '고친 덱' })).toBeOnTheScreen();
      await user.press(screen.getByRole('button', { name: '덱 메뉴' }));
      await user.press(screen.getByRole('button', { name: '덱 편집' }));
      expect(await screen.findByLabelText('이름')).toHaveDisplayValue('고친 덱');
      expect(screen.getByRole('radio', { name: '없음' })).toBeChecked();
      await user.press(screen.getByRole('button', { name: '닫기' }));
      await user.press(await screen.findByRole('button', { name: '덱 목록으로' }));
      expect(
        await screen.findByRole('button', { name: '고친 덱 덱 상세, 오늘 복습 끝' }),
      ).toBeOnTheScreen();
      expect(await store.getDeck(deck.id)).toMatchObject({ name: '고친 덱', language: null });
    },
  );

  test.each(['create', 'edit'])('%s: 취소하면 입력을 저장하지 않는다', async (mode) => {
    const store = newStore();
    const deck = await store.createDeck({ name: '원래 덱', language: 'en' });
    await renderApp(store);
    const user = setupUser();
    if (mode === 'edit') await openEdit(deck.name);
    else await user.press(screen.getByRole('button', { name: '덱 추가' }));
    await user.type(screen.getByLabelText('이름'), '바꾼 이름');
    await user.press(screen.getByRole('radio', { name: '한국어' }));
    await user.press(screen.getByRole('button', { name: '닫기' }));
    expect(await store.listDecks()).toEqual([deck]);
  });
});

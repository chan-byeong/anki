import { Stack, router } from 'expo-router';
import { fireEvent, userEvent } from '@testing-library/react-native';
import { act, renderRouter, screen } from 'expo-router/testing-library';

import HomeScreen from '@/app/index';
import DeckScreen from '@/app/deck/[id]';
import EditDeckScreen from '@/app/deck/[id]/edit';
import NewDeckScreen from '@/app/deck/new';
import { createMemoryBacking, createMemoryPort } from '@/storage/memory-port';
import { createStore, type Deck, type Store } from '@/storage/store';
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
  await user.press(screen.getByRole('button', { name: `${name} 덱 상세, 오늘 복습 끝, 전체 0장` }));
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
      await screen.findByRole('button', { name: '새 덱 덱 상세, 오늘 복습 끝, 전체 0장' }),
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
        await screen.findByRole('button', { name: '고친 덱 덱 상세, 오늘 복습 끝, 전체 0장' }),
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

  test.each(['create', 'edit'])(
    '%s: 저장 실패 후 입력을 유지하고 다시 저장할 수 있다',
    async (mode) => {
      const store = newStore();
      const deck = await store.createDeck({ name: '원래 덱', language: 'en' });
      const save = jest
        .spyOn(store, mode === 'create' ? 'createDeck' : 'updateDeck')
        .mockRejectedValueOnce(new Error('disk full'));
      await renderApp(store);
      const user = setupUser();
      if (mode === 'edit') await openEdit(deck.name);
      else await user.press(screen.getByRole('button', { name: '덱 추가' }));
      await user.clear(screen.getByLabelText('이름'));
      await user.type(screen.getByLabelText('이름'), '재시도 덱');
      await user.press(screen.getByRole('radio', { name: '한국어' }));
      const label = mode === 'edit' ? '저장' : '만들기';
      await user.press(screen.getByRole('button', { name: label }));

      expect(screen.getByRole('alert')).toBeOnTheScreen();
      expect(screen.getByLabelText('이름')).toHaveDisplayValue('재시도 덱');
      expect(screen.getByRole('radio', { name: '한국어' })).toBeChecked();
      expect(screen.getByRole('button', { name: label })).toBeEnabled();
      await user.press(screen.getByRole('button', { name: label }));
      expect(save).toHaveBeenCalledTimes(2);
      expect((await store.listDecks()).find((item) => item.name === '재시도 덱')).toMatchObject({
        language: 'ko',
      });
    },
  );

  test('같은 렌더의 연속 제출과 저장 중 재제출은 한 번만 저장한다', async () => {
    const store = newStore();
    const create = store.createDeck;
    let complete!: (deck: Deck) => void;
    const pending = new Promise<Deck>((resolve) => {
      complete = resolve;
    });
    const save = jest.spyOn(store, 'createDeck').mockReturnValueOnce(pending);
    await renderApp(store, '/deck/new');
    const user = setupUser();
    await user.type(screen.getByLabelText('이름'), '한 번만');
    const input = screen.getByLabelText('이름');
    await act(async () => {
      input.props.onSubmitEditing();
      input.props.onSubmitEditing();
    });
    expect(screen.getByRole('button', { name: '저장 중…' })).toBeDisabled();
    expect(screen.getByRole('radio', { name: '영어' })).toBeDisabled();
    await fireEvent(input, 'submitEditing');
    expect(save).toHaveBeenCalledTimes(1);
    await act(async () => complete(await create({ name: '한 번만', language: null })));
    expect(await store.listDecks()).toHaveLength(1);
  });

  test.each(['missing', 'trashed'])('%s 덱은 폼을 열지 않고 돌아갈 수 있다', async (kind) => {
    const store = newStore();
    const deck = await store.createDeck({ name: '원래 덱' });
    if (kind === 'trashed') await store.trashDeck(deck.id);
    await renderApp(store, `/deck/${kind === 'missing' ? 'missing' : deck.id}/edit`);
    expect(await screen.findByText('편집할 덱이 없어요')).toBeOnTheScreen();
    expect(screen.queryByLabelText('이름')).toBeNull();
    await setupUser().press(screen.getByRole('button', { name: '돌아가기' }));
    expect(await screen.findByRole('header', { name: '덱' })).toBeOnTheScreen();
  });

  test('조회 실패는 없는 덱과 구분하고 다시 불러올 수 있다', async () => {
    const store = newStore();
    const deck = await store.createDeck({ name: '원래 덱', language: 'ko' });
    jest.spyOn(store, 'getDeck').mockRejectedValueOnce(new Error('read failed'));
    await renderApp(store, `/deck/${deck.id}/edit`);
    expect(await screen.findByText('덱을 불러오지 못했어요')).toBeOnTheScreen();
    expect(screen.queryByLabelText('이름')).toBeNull();
    await setupUser().press(screen.getByRole('button', { name: '다시 시도' }));
    expect(await screen.findByLabelText('이름')).toHaveDisplayValue(deck.name);
    expect(screen.getByRole('radio', { name: '한국어' })).toBeChecked();
  });

  test('편집하는 사이 휴지통으로 간 덱은 저장할 수 없다', async () => {
    const store = newStore();
    const deck = await store.createDeck({ name: '원래 덱' });
    await renderApp(store, `/deck/${deck.id}/edit`);
    await screen.findByLabelText('이름');
    await store.trashDeck(deck.id);
    await setupUser().press(screen.getByRole('button', { name: '저장' }));
    expect(await screen.findByText('편집할 덱이 없어요')).toBeOnTheScreen();
    expect(screen.queryByLabelText('이름')).toBeNull();
  });

  test('다른 덱으로 이동한 뒤 도착한 이전 조회 응답은 폼을 덮지 않는다', async () => {
    const store = newStore();
    const first = await store.createDeck({ name: '첫 덱', language: 'en' });
    const second = await store.createDeck({ name: '두 번째 덱', language: 'ko' });
    let complete!: (deck: Deck) => void;
    jest.spyOn(store, 'getDeck').mockReturnValueOnce(
      new Promise((resolve) => {
        complete = resolve;
      }),
    );
    await renderApp(store, `/deck/${first.id}/edit`);
    expect(screen.queryByLabelText('이름')).toBeNull();
    await act(async () =>
      router.replace({ pathname: '/deck/[id]/edit', params: { id: second.id } }),
    );
    expect(await screen.findByLabelText('이름')).toHaveDisplayValue(second.name);
    await act(async () => complete(first));
    expect(screen.getByLabelText('이름')).toHaveDisplayValue(second.name);
    expect(screen.getByRole('radio', { name: '한국어' })).toBeChecked();
  });

  test('저장 도중 닫아도 완료 응답이 뒤 화면을 또 닫지 않는다', async () => {
    const store = newStore();
    const create = store.createDeck;
    let complete!: (deck: Deck) => void;
    jest.spyOn(store, 'createDeck').mockReturnValueOnce(
      new Promise((resolve) => {
        complete = resolve;
      }),
    );
    await renderApp(store);
    const user = setupUser();
    await user.press(screen.getByRole('button', { name: '덱 추가' }));
    await user.type(screen.getByLabelText('이름'), '저장 요청');
    await user.press(screen.getByRole('button', { name: '만들기' }));
    await user.press(screen.getByRole('button', { name: '닫기' }));
    const back = jest.spyOn(router, 'back');
    await act(async () => complete(await create({ name: '저장 요청' })));
    expect(back).not.toHaveBeenCalled();
    expect(screen.getByRole('header', { name: '덱' })).toBeOnTheScreen();
  });
});

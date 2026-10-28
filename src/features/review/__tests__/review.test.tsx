import { fireEvent, userEvent, within } from '@testing-library/react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { act, renderRouter, screen } from 'expo-router/testing-library';
import { AccessibilityInfo, Text } from 'react-native';

import HomeScreen from '@/app/index';
import ReviewScreen from '@/app/review/[deckId]';
import { HandProvider } from '@/features/settings/HandProvider';
import { createMemoryBacking, createMemoryPort } from '@/storage/memory-port';
import { createStore, type Rating, type Store } from '@/storage/store';
import { StoreProvider } from '@/storage/StoreProvider';
import { createTestClock, createTestIds } from '@/storage/testing/deps';
import { ThemeProvider } from '@/theme/ThemeProvider';
import type { ThemeName } from '@/theme/tokens';

// 홈에서 덱을 눌러 복습을 여는 흐름을 실제 라우터 위에서 메모리 Store로 돌린다(deck-list.test.tsx와 같은 방식).
// 덱 상세는 도착한 경로를 글자로 보여 주는 자리로 바꾼다.
jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual('react-native-safe-area-context/jest/mock').default,
);
// jest-expo의 네이티브 UUID 기본 모의는 undefined를 반환하므로 난수 경계만 대체한다.
jest.mock('expo-crypto', () => ({
  randomUUID: () => jest.requireActual('node:crypto').randomUUID(),
}));

// 대기열은 같은 복습일의 카드를 섞는다. 0.99를 돌려주면 섞지 않아 만든 순서가 그대로 남는다.
beforeEach(() => {
  jest.spyOn(Math, 'random').mockReturnValue(0.99);
});

// 훅은 대기열의 오늘을 Date.now()로 만든다. 평가한 날과 같은 날이 되도록 시계를 지금에서 시작한다.
const newStore = (): Store =>
  createStore(createMemoryPort(createMemoryBacking()), {
    now: createTestClock(Date.now()).now,
    newId: createTestIds(),
  });

function DeckRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <Text>{`/deck/${id}`}</Text>;
}

const renderApp = async (store: Store, initialUrl: string, theme?: ThemeName) => {
  const Layout = () => (
    <ThemeProvider override={theme}>
      <HandProvider>
        <StoreProvider store={store}>
          <Stack screenOptions={{ headerShown: false }} />
        </StoreProvider>
      </HandProvider>
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

describe('복습 화면: 평가', () => {
  test.each<ThemeName>(['light', 'dark'])(
    '%s: 정답을 연 뒤에만 모름·헷갈림·앎 버튼이 순서대로 나타나고 마크는 장식이다',
    async (theme) => {
      const { store, deck } = await seed();
      await renderApp(store, `/review/${deck.id}`, theme);
      const user = setupUser();

      for (const name of ['모름', '헷갈림', '앎']) {
        expect(screen.queryByRole('button', { name })).toBeNull();
      }

      await user.press(screen.getByRole('button', { name: '정답 확인' }));

      const group = screen.getByLabelText('평가');
      expect(group.props.role).toBe('group');
      expect(
        within(group)
          .getAllByRole('button')
          .map((button) => button.props.accessibilityLabel),
      ).toEqual(['모름', '헷갈림', '앎']);
      expect(within(group).queryAllByRole('image')).toHaveLength(0);
      for (const name of ['모름', '헷갈림', '앎']) {
        expect(within(group).getByRole('button', { name })).toBeEnabled();
        expect(screen.queryByText(name)).toBeNull();
      }
    },
  );

  // 다음 카드와 남은 수는 대기열이 정한다(ADR 0003). 모름·헷갈림은 오늘 다시 나오므로 남은 수가 줄지 않는다.
  test.each<{ name: string; rating: Rating; remaining: number }>([
    { name: '모름', rating: 'dont', remaining: 2 },
    { name: '헷갈림', rating: 'unsure', remaining: 2 },
    { name: '앎', rating: 'know', remaining: 1 },
  ])(
    '$name 버튼은 $rating 평가를 저장하고 다음 카드의 앞면과 남은 수를 보인다',
    async ({ name, rating, remaining }) => {
      const { store, deck } = await seed();
      const [apple] = await store.listCards(deck.id);
      const save = jest.spyOn(store, 'rateCard');
      await renderApp(store, `/review/${deck.id}`);
      const user = setupUser();

      await user.press(screen.getByRole('button', { name: '정답 확인' }));
      await user.press(screen.getByRole('button', { name }));

      expect(save).toHaveBeenCalledTimes(1);
      expect(save).toHaveBeenCalledWith(apple.id, {
        id: expect.stringMatching(
          /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
        ),
        rating,
        hintUsed: false,
      });
      expect(await screen.findByText('pear')).toBeOnTheScreen();
      expect(screen.getByText(`${remaining}장 남음`)).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: '정답 확인' })).toBeOnTheScreen();
      expect(screen.queryByText('배')).toBeNull();
      expect(screen.queryByLabelText('평가')).toBeNull();
      save.mockRestore();
    },
  );

  test('한 장뿐인 덱에서 모름이면 같은 카드가 다시 나오고 정답은 다시 닫혀 있다', async () => {
    const store = newStore();
    const deck = await store.createDeck({ name: '영어 단어' });
    await store.createCard(deck.id, { front: 'apple', back: '사과' });
    await renderApp(store, `/review/${deck.id}`);
    const user = setupUser();

    await user.press(screen.getByRole('button', { name: '정답 확인' }));
    await user.press(screen.getByRole('button', { name: '모름' }));

    expect(await screen.findByRole('button', { name: '정답 확인' })).toBeOnTheScreen();
    expect(screen.getByText('apple')).toBeOnTheScreen();
    expect(screen.queryByText('사과')).toBeNull();
  });

  test('모름 카드는 대기열 맨 뒤에서 다시 나오고, 다 끝나면 복습 끝을 보인다', async () => {
    const { store, deck } = await seed();
    await renderApp(store, `/review/${deck.id}`);
    const user = setupUser();

    for (const [name, next] of [
      ['모름', 'pear'],
      ['앎', 'apple'],
      ['앎', null],
    ] as const) {
      await user.press(screen.getByRole('button', { name: '정답 확인' }));
      await user.press(screen.getByRole('button', { name }));
      if (next) expect(await screen.findByText(next)).toBeOnTheScreen();
    }

    expect(await screen.findByRole('header', { name: '오늘 복습 끝' })).toBeOnTheScreen();
    expect(screen.getByText('3장을 봤어요')).toBeOnTheScreen();
  });
});

describe('복습 화면: 평가 버튼 반응', () => {
  test('누른 평가는 다음 카드로 넘어가기 전까지 선택된 채 평가색 배경으로 뒤집힌다', async () => {
    const { store, deck } = await seed();
    // 저장이 끝나지 않게 붙잡아 다음 카드로 넘어가기 전 모습을 본다.
    const save = jest.spyOn(store, 'rateCard').mockImplementation(() => new Promise(() => {}));
    await renderApp(store, `/review/${deck.id}`);
    const user = setupUser();

    await user.press(screen.getByRole('button', { name: '정답 확인' }));
    await user.press(screen.getByRole('button', { name: '앎' }));

    const knew = screen.getByRole('button', { name: '앎' });
    expect(knew.props.accessibilityState).toMatchObject({ selected: true });
    expect(knew).toHaveStyle({ backgroundColor: '#1E7A4C' });
    for (const name of ['모름', '헷갈림']) {
      const other = screen.getByRole('button', { name });
      expect(other.props.accessibilityState).toMatchObject({ selected: false, disabled: true });
      expect(other).toHaveStyle({ backgroundColor: '#F4F4F5' });
    }
    save.mockRestore();
  });
});

describe('복습 화면: 앞면 자리', () => {
  // 스크롤 영역 500, 앞면 44, 위아래 기본 여백 40 + 24 → 앞면 위 여백 (500 - 64 - 44) / 2 = 196
  const layOut = async () => {
    await fireEvent(screen.getByTestId('review-scroll'), 'layout', {
      nativeEvent: { layout: { height: 500 } },
    });
    await fireEvent(screen.getByLabelText('앞면 apple'), 'layout', {
      nativeEvent: { layout: { height: 44 } },
    });
  };

  test('정답을 열거나 메모·힌트를 펼쳐도 앞면은 처음 가운데 자리에 머문다', async () => {
    const store = newStore();
    const deck = await store.createDeck({ name: '영어 단어' });
    await store.createCard(deck.id, {
      front: 'apple',
      back: '사과',
      hint: '빨간 과일',
      memo: 'an apple a day',
    });
    await renderApp(store, `/review/${deck.id}`);
    const user = setupUser();
    await layOut();

    const front = () => screen.getByLabelText('앞면 apple');
    expect(front()).toHaveStyle({ marginTop: 196 });

    await user.press(screen.getByRole('button', { name: '힌트 열기' }));
    await user.press(screen.getByRole('button', { name: '메모 열기' }));
    // 펼친 칸은 카드 위에 겹쳐 뜨고, 그 높이만큼 본문 아래 여백만 는다.
    await fireEvent(screen.getByTestId('review-extras'), 'layout', {
      nativeEvent: { layout: { height: 240 } },
    });
    expect(front()).toHaveStyle({ marginTop: 196 });
    expect(screen.getByTestId('review-extras')).toHaveStyle({ position: 'absolute' });
    expect(screen.getByTestId('review-scroll').props.contentContainerStyle).toContainEqual({
      paddingBottom: 24 + 240,
    });

    await user.press(screen.getByRole('button', { name: '정답 확인' }));
    expect(screen.getByText('사과')).toBeOnTheScreen();
    expect(front()).toHaveStyle({ marginTop: 196 });
  });
});

describe('복습 화면: 복습 끝', () => {
  test.each<ThemeName>(['light', 'dark'])(
    '%s: 마지막 평가 후 이번에 본 카드 수·평가 결과를 보여 주고 홈으로 간다',
    async (theme) => {
      const { store, deck } = await seed();
      const past = await store.createCard(deck.id, { front: '이미 본 카드', back: '과거 정답' });
      await store.rateCard(past.id, { id: 'past-review', rating: 'know', hintUsed: false });
      await renderApp(store, `/review/${deck.id}`, theme);
      const user = setupUser();

      for (const name of ['모름', '헷갈림', '앎', '앎']) {
        expect(screen.queryByRole('header', { name: '오늘 복습 끝' })).toBeNull();
        await user.press(await screen.findByRole('button', { name: '정답 확인' }));
        await user.press(screen.getByRole('button', { name }));
      }

      expect(await screen.findByRole('header', { name: '오늘 복습 끝' })).toBeOnTheScreen();
      expect(screen.getByText('4장을 봤어요')).toBeOnTheScreen();
      const results = screen.getByLabelText('평가 결과');
      expect(
        within(results)
          .getAllByRole('listitem')
          .map((item) => item.props.accessibilityLabel),
      ).toEqual(['모름 1', '헷갈림 1', '앎 2']);
      expect(within(results).queryAllByRole('image')).toHaveLength(0);
      expect(screen.queryByRole('button', { name: '복습 닫기' })).toBeNull();
      expect(screen.queryByLabelText('평가')).toBeNull();
      expect(screen.queryByText(/장 남음/)).toBeNull();
      expect(screen.queryByText(`/deck/${deck.id}`)).toBeNull();

      await user.press(screen.getByRole('button', { name: '덱 목록으로' }));

      expect(await screen.findByRole('header', { name: '덱' })).toBeOnTheScreen();
    },
  );
});

describe('복습 화면: 앞면과 정답 확인', () => {
  test('홈에서 덱을 누르면 복습이 시작되고 가장 먼저 만든 카드의 앞면이 보인다', async () => {
    const { store } = await seed();
    await renderApp(store, '/');
    const user = setupUser();

    await user.press(screen.getByRole('button', { name: '영어 단어 복습 시작, 2장, 전체 2장' }));

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

  test('웹에서는 앞면 글자를 버튼의 설명으로 이어 준다', async () => {
    const { store, deck } = await seed();
    await renderApp(store, `/review/${deck.id}`);

    const card = screen.getByRole('button', { name: '정답 확인' });
    const front = screen.getByText('apple');

    expect(front.props.nativeID).toEqual(expect.any(String));
    expect(card.props['aria-describedby']).toBe(front.props.nativeID);
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
    expect(screen.queryByRole('header', { name: '오늘 복습 끝' })).toBeNull();
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

    await user.press(screen.getByRole('button', { name: '영어 단어 복습 시작, 2장, 전체 2장' }));
    await user.press(await screen.findByRole('button', { name: '복습 닫기' }));

    expect(await screen.findByRole('header', { name: '덱' })).toBeOnTheScreen();
    expect(screen.queryByText('2장 남음')).toBeNull();
  });
});

describe('복습 화면: 내일 카드 수', () => {
  test('오늘 평가를 반영해 복습일이 내일인 카드 수를 보인다', async () => {
    const { store, deck } = await seed();
    await renderApp(store, `/review/${deck.id}`);
    const user = setupUser();

    // 두 카드를 모름으로 세 번씩 평가하면 오늘 대기열에서 빠지고 복습일은 내일이 된다.
    for (let i = 0; i < 6; i += 1) {
      await user.press(await screen.findByRole('button', { name: '정답 확인' }));
      await user.press(screen.getByRole('button', { name: '모름' }));
    }

    expect(await screen.findByRole('header', { name: '오늘 복습 끝' })).toBeOnTheScreen();
    expect(await screen.findByText('다음 복습일 · 내일 2장')).toBeOnTheScreen();
  });

  test('복습일이 내일인 카드가 없으면 다음 복습일 줄을 보이지 않는다', async () => {
    const { store, deck } = await seed();
    await renderApp(store, `/review/${deck.id}`);
    const user = setupUser();

    for (let i = 0; i < 2; i += 1) {
      await user.press(await screen.findByRole('button', { name: '정답 확인' }));
      await user.press(screen.getByRole('button', { name: '앎' }));
    }

    expect(await screen.findByRole('header', { name: '오늘 복습 끝' })).toBeOnTheScreen();
    await act(async () => {});
    expect(screen.queryByText(/다음 복습일/)).toBeNull();
  });
});

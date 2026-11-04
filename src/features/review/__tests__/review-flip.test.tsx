import { act, render, screen, userEvent } from '@testing-library/react-native';

import { ReviewFlow } from '@/features/review/components/ReviewFlow';
import { HandProvider } from '@/features/settings/HandProvider';
import { createMemoryBacking, createMemoryPort } from '@/storage/memory-port';
import { createStore, type Card, type Store } from '@/storage/store';
import { StoreProvider } from '@/storage/StoreProvider';
import { createTestClock, createTestIds } from '@/storage/testing/deps';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { motion, shift } from '@/theme/tokens';
import { haptic } from '@/utils/haptics';

// jest-expo의 네이티브 UUID 기본 모의는 undefined를 반환하므로 난수 경계만 대체한다.
jest.mock('expo-crypto', () => ({
  randomUUID: () => jest.requireActual('node:crypto').randomUUID(),
}));
// 덱 이름은 화면 포커스(라우터)에 묶여 있어서 이 테스트의 관심 밖이다.
jest.mock('@/features/decks/use-deck-name', () => ({ useDeckName: () => '영어 단어' }));
jest.mock('@/utils/haptics', () => ({
  haptic: { rate: jest.fn(), select: jest.fn(), threshold: jest.fn() },
}));
// 시스템 설정 구독은 useReducedMotion의 일이라 여기서는 그 값만 바꾼다.
const mockReducedMotion = { current: false };
jest.mock('@/hooks/use-reduced-motion', () => ({
  useReducedMotion: () => mockReducedMotion.current,
}));

// 평가 → 다음 카드(Motion 보드 · 한장 시그니처 보드): 카드가 위로 8px 사라지고(160ms easeIn),
// 더미의 첫 겹이 올라와 다음 카드가 된다(160ms easeOut). 총 320ms.
// 라우터 위의 review.test.tsx에서는 애니메이션 값이 갱신되지 않아서(다른 모션 테스트도 render로 한다) ReviewFlow를 바로 그린다.

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  mockReducedMotion.current = false;
  jest.useRealTimers();
});

const advance = (ms: number) =>
  act(async () => {
    jest.advanceTimersByTime(ms);
  });

const card = () => screen.getByTestId('review-card');
const layer = (depth: number) =>
  screen.getByTestId(`review-pile-layer-${depth}`, { includeHiddenElements: true });

const seed = async (count: number) => {
  const store: Store = createStore(createMemoryPort(createMemoryBacking()), {
    now: createTestClock(Date.now()).now,
    newId: createTestIds(),
  });
  const deck = await store.createDeck({ name: '영어 단어' });
  for (let i = 1; i <= count; i += 1) {
    await store.createCard(deck.id, { front: `card ${i}`, back: `뒷면 ${i}` });
  }
  return { store, deck, cards: await store.listCards(deck.id) };
};

const renderFlow = async (store: Store, deckId: string, cards: Card[]) => {
  await render(
    <ThemeProvider override="light">
      <HandProvider>
        <StoreProvider store={store}>
          <ReviewFlow deckIds={[deckId]} cards={cards} insetBottom={0} />
        </StoreProvider>
      </HandProvider>
    </ThemeProvider>,
  );
  await advance(1);
};

// 정답을 열고 평가를 누른다. 평가 핸들러는 160ms를 기다리므로 user.press로 누르고 시간은 직접 돌린다.
const press = async (name: string) => {
  const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
  await user.press(screen.getByRole('button', { name: '정답 확인' }));
  await user.press(screen.getByRole('button', { name }));
};

// 눌러서 다음 카드로 넘어가는 순간(평가 160ms 뒤)까지 간다.
const rate = async (name: string) => {
  await press(name);
  await advance(motion);
};

describe('평가 연출', () => {
  test('평가를 고르면 햅틱이 한 번 울린다', async () => {
    const { store, deck, cards } = await seed(2);
    await renderFlow(store, deck.id, cards);
    jest.mocked(haptic.rate).mockClear();

    await press('앎');

    expect(haptic.rate).toHaveBeenCalledTimes(1);
  });

  test('평가를 누르면 카드가 위로 8px 가며 160ms에 사라지고, 그동안 평가는 다시 눌리지 않는다', async () => {
    const { store, deck, cards } = await seed(2);
    const rated = store.rateCard.bind(store);
    // 저장을 붙잡아 나가는 동안의 모습을 본다.
    const save = jest.spyOn(store, 'rateCard').mockImplementation(async (...args) => {
      await new Promise((resolve) => setTimeout(resolve, motion * 4));
      return rated(...args);
    });
    await renderFlow(store, deck.id, cards);

    await press('앎');
    await advance(motion);

    expect(card()).toHaveAnimatedStyle({
      opacity: 0,
      transform: [{ translateY: -shift }, { scale: 1 }],
    });
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    await user.press(screen.getByRole('button', { name: '모름' }));
    expect(save).toHaveBeenCalledTimes(1);

    await advance(motion * 4);
    save.mockRestore();
  });

  test('저장에 실패하면 카드가 돌아오고 고른 평가만 남는다', async () => {
    const { store, deck, cards } = await seed(2);
    const save = jest.spyOn(store, 'rateCard').mockImplementation(
      () =>
        new Promise((_, reject) => {
          setTimeout(() => reject(new Error('저장 실패')), motion / 2);
        }),
    );
    await renderFlow(store, deck.id, cards);

    await press('앎');
    await advance(motion / 2);
    await advance(motion);

    expect(card()).toHaveAnimatedStyle({
      opacity: 1,
      transform: [{ translateY: 0 }, { scale: 1 }],
    });
    expect(screen.getByText('card 1')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: '앎' }).props.accessibilityState).toMatchObject({
      selected: true,
    });
    save.mockRestore();
  });

  test('다음 카드는 더미의 첫 겹 자리(아래 6px, 0.95배)에서 올라와 160ms에 제자리에 선다', async () => {
    const { store, deck, cards } = await seed(2);
    await renderFlow(store, deck.id, cards);

    await rate('앎');

    expect(screen.getByText('card 2')).toBeOnTheScreen();
    expect(card()).toHaveStyle({
      opacity: 1,
      transform: [{ translateY: 6 }, { scale: 0.95 }],
    });

    await advance(motion);
    expect(card()).toHaveAnimatedStyle({
      opacity: 1,
      transform: [{ translateY: 0 }, { scale: 1 }],
    });
  });

  test('남은 더미는 남은 수 − 1겹(최대 3겹)이고, 줄어들면 맨 아래 겹부터 페이드로 빠진다', async () => {
    const { store, deck, cards } = await seed(5);
    await renderFlow(store, deck.id, cards);

    for (const depth of [1, 2, 3]) expect(layer(depth)).toHaveStyle({ opacity: 1 });

    // 5장 → 4장: 아직 3겹. 4장 → 3장: 2겹.
    await rate('앎');
    await advance(motion);
    for (const depth of [1, 2, 3]) expect(layer(depth)).toHaveStyle({ opacity: 1 });
    await rate('앎');
    await advance(motion);
    expect(layer(1)).toHaveAnimatedStyle({ opacity: 1 });
    expect(layer(2)).toHaveAnimatedStyle({ opacity: 1 });
    expect(layer(3)).toHaveAnimatedStyle({ opacity: 0 });

    // 마지막 한 장: 겹 없이 "마지막 한 장".
    await rate('앎');
    await advance(motion);
    await rate('앎');
    await advance(motion);
    for (const depth of [1, 2, 3]) expect(layer(depth)).toHaveAnimatedStyle({ opacity: 0 });
    expect(screen.getByLabelText('마지막 한 장')).toBeOnTheScreen();
  });

  test('동작 줄이기: 이동·확대 없이 페이드 아웃 → 페이드 인', async () => {
    mockReducedMotion.current = true;
    const { store, deck, cards } = await seed(2);
    await renderFlow(store, deck.id, cards);

    await rate('앎');
    expect(screen.getByText('card 2')).toBeOnTheScreen();
    expect(card()).toHaveStyle({
      opacity: 0,
      transform: [{ translateY: 0 }, { scale: 1 }],
    });

    await advance(motion);
    expect(card()).toHaveAnimatedStyle({
      opacity: 1,
      transform: [{ translateY: 0 }, { scale: 1 }],
    });
  });

  test('첫 카드는 화면이 열릴 때 움직이지 않는다', async () => {
    const { store, deck, cards } = await seed(2);
    await renderFlow(store, deck.id, cards);

    expect(card()).toHaveStyle({
      opacity: 1,
      transform: [{ translateY: 0 }, { scale: 1 }],
    });
  });
});

import { act, render, screen, userEvent, within } from '@testing-library/react-native';

import { ReviewFlow } from '@/features/review/components/ReviewFlow';
import { HandProvider } from '@/features/settings/HandProvider';
import { createMemoryBacking, createMemoryPort } from '@/storage/memory-port';
import { createStore, type Card, type Store } from '@/storage/store';
import { StoreProvider } from '@/storage/StoreProvider';
import { createTestClock, createTestIds } from '@/storage/testing/deps';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { speech } from '@/utils/speech';

// jest-expo의 네이티브 UUID 기본 모의는 undefined를 반환하므로 난수 경계만 대체한다.
jest.mock('expo-crypto', () => ({
  randomUUID: () => jest.requireActual('node:crypto').randomUUID(),
}));
// 덱 이름·언어는 화면 포커스(라우터)에 묶여 있어서 이 테스트에서는 값만 바꾼다.
const mockDeckLanguage = { current: 'ja' as string | null };
jest.mock('@/features/decks/use-deck-name', () => ({ useDeckName: () => '일본어 N2 단어' }));
jest.mock('@/features/decks/use-deck-language', () => ({
  useDeckLanguage: () => mockDeckLanguage.current,
}));
jest.mock('@/utils/haptics', () => ({
  haptic: { rate: jest.fn(), select: jest.fn(), threshold: jest.fn() },
}));
// 실제 음성은 기기에서만 난다. 화면이 무엇을 읽으라고 하는지만 본다.
jest.mock('@/utils/speech', () => ({ speech: { speak: jest.fn(), stop: jest.fn() } }));

// 복습 중 발음 재생(STA-127): 누를 때만 읽고, 덱에 발음 언어가 없으면 버튼이 없다.

beforeEach(() => {
  jest.useFakeTimers();
  mockDeckLanguage.current = 'ja';
});

afterEach(() => {
  jest.useRealTimers();
  jest.clearAllMocks();
});

const advance = (ms: number) =>
  act(async () => {
    jest.advanceTimersByTime(ms);
  });

const seed = async (cards: { front: string; back: string; memo?: string }[]) => {
  const store: Store = createStore(createMemoryPort(createMemoryBacking()), {
    now: createTestClock(Date.now()).now,
    newId: createTestIds(),
  });
  const deck = await store.createDeck({ name: '일본어 N2 단어', language: 'ja' });
  for (const input of cards) await store.createCard(deck.id, input);
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

const speakButton = () => screen.queryByRole('button', { name: '발음 재생' });
const user = () => userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

describe('복습 화면의 발음 재생', () => {
  test('덱의 발음 언어가 있으면 앞면 화면에 발음 버튼이 있고, 열기만 해서는 읽지 않는다', async () => {
    const { store, deck, cards } = await seed([{ front: '食べる', back: '먹다' }]);
    await renderFlow(store, deck.id, cards);

    expect(speakButton()).toBeOnTheScreen();
    await advance(1000);
    expect(speech.speak).not.toHaveBeenCalled();
  });

  test('발음 버튼을 누르면 앞면을 덱의 발음 언어로 읽는다', async () => {
    const { store, deck, cards } = await seed([{ front: '食べる', back: '먹다' }]);
    await renderFlow(store, deck.id, cards);

    await user().press(speakButton()!);

    expect(speech.speak).toHaveBeenCalledTimes(1);
    expect(speech.speak).toHaveBeenCalledWith('食べる', 'ja');
  });

  test('정답을 연 뒤에도 같은 버튼이 앞면을 읽고, 정답을 열 때 저절로 읽지 않는다', async () => {
    const { store, deck, cards } = await seed([{ front: '食べる', back: '먹다' }]);
    await renderFlow(store, deck.id, cards);

    await user().press(screen.getByRole('button', { name: '정답 확인' }));
    expect(speech.speak).not.toHaveBeenCalled();

    await user().press(speakButton()!);
    expect(speech.speak).toHaveBeenCalledWith('食べる', 'ja');
  });

  test('발음 언어가 없는 덱에서는 발음 버튼이 나타나지 않는다', async () => {
    mockDeckLanguage.current = null;
    const { store, deck, cards } = await seed([{ front: 'apple', back: '사과' }]);
    await renderFlow(store, deck.id, cards);

    expect(speakButton()).not.toBeOnTheScreen();
  });

  test('발음 버튼은 메모 버튼과 같은 줄(카드 아래 모서리)에 모여 있다', async () => {
    const { store, deck, cards } = await seed([{ front: '食べる', back: '먹다', memo: 'る동사' }]);
    await renderFlow(store, deck.id, cards);

    const corner = screen.getByTestId('review-extra-buttons');
    expect(within(corner).getByRole('button', { name: '발음 재생' })).toBeOnTheScreen();
    expect(within(corner).getByRole('button', { name: '메모 열기' })).toBeOnTheScreen();
  });

  test('메모·힌트가 없는 카드에서도 발음 버튼만 그 모서리에 있다', async () => {
    const { store, deck, cards } = await seed([{ front: '食べる', back: '먹다' }]);
    await renderFlow(store, deck.id, cards);

    const corner = screen.getByTestId('review-extra-buttons');
    expect(within(corner).getByRole('button', { name: '발음 재생' })).toBeOnTheScreen();
  });

  test('앞면 글자에 덱의 언어가 속성으로 지정되어 있다', async () => {
    const { store, deck, cards } = await seed([{ front: '食べる', back: '먹다' }]);
    await renderFlow(store, deck.id, cards);

    expect(screen.getByText('食べる')).toHaveProp('lang', 'ja');
  });

  test('카드가 넘어가면 읽던 소리를 멈춘다', async () => {
    const { store, deck, cards } = await seed([
      { front: '食べる', back: '먹다' },
      { front: '飲む', back: '마시다' },
    ]);
    await renderFlow(store, deck.id, cards);
    await user().press(speakButton()!);
    expect(speech.stop).not.toHaveBeenCalled();

    await user().press(screen.getByRole('button', { name: '정답 확인' }));
    await user().press(screen.getByRole('button', { name: '앎' }));
    await advance(400);

    expect(speech.stop).toHaveBeenCalled();
  });
});

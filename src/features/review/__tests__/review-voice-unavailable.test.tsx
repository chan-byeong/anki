import { act, render, screen, userEvent } from '@testing-library/react-native';
import { Platform } from 'react-native';

import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ReviewFlow } from '@/features/review/components/ReviewFlow';
import { HandProvider } from '@/features/settings/HandProvider';
import { createMemoryBacking, createMemoryPort } from '@/storage/memory-port';
import { createStore, type Card, type Store } from '@/storage/store';
import { StoreProvider } from '@/storage/StoreProvider';
import { createTestClock, createTestIds } from '@/storage/testing/deps';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { toastHold } from '@/theme/tokens';
import { speech } from '@/utils/speech';

const safeArea = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

// jest-expo의 네이티브 UUID 기본 모의는 undefined를 반환하므로 난수 경계만 대체한다.
jest.mock('expo-crypto', () => ({
  randomUUID: () => jest.requireActual('node:crypto').randomUUID(),
}));
// 덱 이름·언어는 화면 포커스(라우터)에 묶여 있어서 이 테스트에서는 덱별 값만 바꾼다.
const mockLanguages: Record<string, string | null> = {};
jest.mock('@/features/decks/use-deck-name', () => ({ useDeckName: () => '덱' }));
jest.mock('@/features/decks/use-deck-language', () => ({
  useDeckLanguage: (deckId: string) => mockLanguages[deckId] ?? null,
}));
jest.mock('@/utils/haptics', () => ({
  haptic: { rate: jest.fn(), select: jest.fn(), threshold: jest.fn() },
}));
// 실제 음성은 기기에서만 난다. 기기에 어떤 언어의 음성이 있는지와 화면이 무엇을 읽으라고 하는지만 본다.
const mockInstalled = { current: ['ja', 'en'] };
jest.mock('@/utils/speech', () => ({
  speech: { speak: jest.fn(), stop: jest.fn(), hasVoice: jest.fn() },
}));

// 발음 불가 상태·섞어 복습(STA-128): 음성이 없으면 버튼을 흐리게 하고 이유를 알리며, 카드마다 자기 덱의 언어로 읽는다.

beforeEach(() => {
  jest.useFakeTimers();
  mockInstalled.current = ['ja', 'en'];
  jest
    .mocked(speech.hasVoice)
    .mockImplementation(async (language) => mockInstalled.current.includes(language));
});

afterEach(() => {
  jest.useRealTimers();
  jest.clearAllMocks();
  for (const key of Object.keys(mockLanguages)) delete mockLanguages[key];
});

const advance = (ms: number) =>
  act(async () => {
    jest.advanceTimersByTime(ms);
  });

const seed = async (decks: { name: string; language: string | null; fronts: string[] }[]) => {
  const store: Store = createStore(createMemoryPort(createMemoryBacking()), {
    now: createTestClock(Date.now()).now,
    newId: createTestIds(),
  });
  const ids: string[] = [];
  const cards: Card[] = [];
  for (const { name, language, fronts } of decks) {
    const deck = await store.createDeck({ name, language });
    mockLanguages[deck.id] = language;
    ids.push(deck.id);
    for (const front of fronts) await store.createCard(deck.id, { front, back: `뒷면 ${front}` });
    cards.push(...(await store.listCards(deck.id)));
  }
  return { store, ids, cards };
};

const renderFlow = async (store: Store, deckIds: string[], cards: Card[]) => {
  await render(
    <SafeAreaProvider initialMetrics={safeArea}>
      <ThemeProvider override="light">
        <HandProvider>
          <StoreProvider store={store}>
            <ReviewFlow deckIds={deckIds} cards={cards} insetBottom={0} />
          </StoreProvider>
        </HandProvider>
      </ThemeProvider>
    </SafeAreaProvider>,
  );
  await advance(1);
};

const user = () => userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
const rateNext = async () => {
  await user().press(screen.getByRole('button', { name: '정답 확인' }));
  await user().press(screen.getByRole('button', { name: '앎' }));
  await advance(400);
};

describe('기기에 그 언어 음성이 없을 때', () => {
  beforeEach(() => {
    mockInstalled.current = ['en'];
  });

  test('발음 버튼이 비활성이고, 접근성 이름에 이유가 들어 있다', async () => {
    const { store, ids, cards } = await seed([
      { name: '일본어', language: 'ja', fronts: ['食べる'] },
    ]);
    await renderFlow(store, ids, cards);

    const button = screen.getByRole('button', { name: '발음 재생 (이 기기에 일본어 음성 없음)' });
    expect(button).toBeDisabled();
  });

  test('누를 수 없어 읽지 않는다(기기 기본 언어로 대신 읽지 않는다)', async () => {
    const { store, ids, cards } = await seed([
      { name: '일본어', language: 'ja', fronts: ['食べる'] },
    ]);
    await renderFlow(store, ids, cards);

    await user().press(screen.getByRole('button', { name: /발음 재생/ }));

    expect(speech.speak).not.toHaveBeenCalled();
  });

  test('이유를 토스트로 알리고, 시간이 지나면 사라진다', async () => {
    const { store, ids, cards } = await seed([
      { name: '일본어', language: 'ja', fronts: ['食べる'] },
    ]);
    await renderFlow(store, ids, cards);

    expect(screen.getByText('이 기기에 일본어 음성이 없어요')).toBeOnTheScreen();
    expect(screen.getByText('기기 설정에서 음성을 받으면 바로 들을 수 있어요.')).toBeOnTheScreen();
    await advance(toastHold.withSub + 400);
    expect(screen.queryByText('이 기기에 일본어 음성이 없어요')).not.toBeOnTheScreen();
  });

  test('같은 언어의 다음 카드에서는 같은 안내를 다시 띄우지 않는다', async () => {
    const { store, ids, cards } = await seed([
      { name: '일본어', language: 'ja', fronts: ['食べる', '飲む'] },
    ]);
    await renderFlow(store, ids, cards);
    await advance(toastHold.withSub + 400);

    await rateNext();

    expect(screen.queryByText('이 기기에 일본어 음성이 없어요')).not.toBeOnTheScreen();
    expect(screen.getByRole('button', { name: /발음 재생/ })).toBeDisabled();
  });

  test('음성이 있는 언어의 덱에서는 버튼이 켜져 있고 안내가 없다', async () => {
    const { store, ids, cards } = await seed([{ name: '영어', language: 'en', fronts: ['apple'] }]);
    await renderFlow(store, ids, cards);

    expect(screen.getByRole('button', { name: '발음 재생' })).toBeEnabled();
    expect(screen.queryByText(/음성이 없어요/)).not.toBeOnTheScreen();
  });
});

describe('여러 덱을 섞어 복습할 때', () => {
  test('카드마다 자기 덱의 발음 언어로 읽는다', async () => {
    const { store, ids, cards } = await seed([
      { name: '일본어', language: 'ja', fronts: ['食べる'] },
      { name: '영어', language: 'en', fronts: ['apple'] },
    ]);
    await renderFlow(store, ids, cards);

    const first = screen.getByRole('button', { name: '발음 재생' });
    await user().press(first);
    const [text, language] = jest.mocked(speech.speak).mock.calls[0]!;
    // 두 장 중 어느 쪽이 먼저 나와도, 읽는 글자와 언어는 한 덱의 것이어야 한다.
    expect([text, language]).toEqual(text === '食べる' ? ['食べる', 'ja'] : ['apple', 'en']);

    await rateNext();
    await user().press(screen.getByRole('button', { name: '발음 재생' }));
    const second = jest.mocked(speech.speak).mock.calls[1]!;
    expect([second[0], second[1]]).toEqual(text === '食べる' ? ['apple', 'en'] : ['食べる', 'ja']);
  });

  test('음성이 없는 덱의 카드에서만 버튼이 비활성이다', async () => {
    mockInstalled.current = ['en'];
    const { store, ids, cards } = await seed([
      { name: '영어', language: 'en', fronts: ['apple'] },
      { name: '일본어', language: 'ja', fronts: ['食べる'] },
    ]);
    await renderFlow(store, ids, cards);

    const labelOf = () => screen.getAllByRole('button').map((b) => b.props.accessibilityLabel);
    const disabledNow = () => labelOf().includes('발음 재생 (이 기기에 일본어 음성 없음)');
    const firstDisabled = disabledNow();
    await rateNext();
    const secondDisabled = disabledNow();

    expect([firstDisabled, secondDisabled].sort()).toEqual([false, true]);
  });
});

describe('iOS 무음 모드 안내', () => {
  const setPlatform = (os: 'ios' | 'android') => jest.replaceProperty(Platform, 'OS', os);

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('iOS에서 처음 누를 때 한 번, 무음 모드에서는 들리지 않을 수 있다고 알린다', async () => {
    setPlatform('ios');
    const { store, ids, cards } = await seed([
      { name: '일본어', language: 'ja', fronts: ['食べる', '飲む'] },
    ]);
    await renderFlow(store, ids, cards);
    expect(
      screen.queryByText('무음 모드에서는 발음이 들리지 않을 수 있어요'),
    ).not.toBeOnTheScreen();

    await user().press(screen.getByRole('button', { name: '발음 재생' }));
    expect(screen.getByText('무음 모드에서는 발음이 들리지 않을 수 있어요')).toBeOnTheScreen();

    await advance(toastHold.plain + 400);
    await rateNext();
    await user().press(screen.getByRole('button', { name: '발음 재생' }));
    expect(
      screen.queryByText('무음 모드에서는 발음이 들리지 않을 수 있어요'),
    ).not.toBeOnTheScreen();
    expect(speech.speak).toHaveBeenCalledTimes(2);
  });

  test('Android에서는 알리지 않는다', async () => {
    setPlatform('android');
    const { store, ids, cards } = await seed([
      { name: '일본어', language: 'ja', fronts: ['食べる'] },
    ]);
    await renderFlow(store, ids, cards);

    await user().press(screen.getByRole('button', { name: '발음 재생' }));

    expect(
      screen.queryByText('무음 모드에서는 발음이 들리지 않을 수 있어요'),
    ).not.toBeOnTheScreen();
  });
});

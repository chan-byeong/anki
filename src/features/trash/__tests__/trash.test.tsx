import { Stack } from 'expo-router';
import { userEvent } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';
import { act, renderRouter, screen } from 'expo-router/testing-library';

import TrashScreen from '@/app/trash';
import { createMemoryBacking, createMemoryPort } from '@/storage/memory-port';
import { createStore, type Store } from '@/storage/store';
import { StoreProvider } from '@/storage/StoreProvider';
import { createTestClock, createTestIds } from '@/storage/testing/deps';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { motion, toastHold } from '@/theme/tokens';

// 휴지통에서 복구하고 영구 삭제하는 흐름을 실제 라우터 위에서 메모리 Store로 돌린다(card-edit.test.tsx와 같은 방식).
jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual('react-native-safe-area-context/jest/mock').default,
);

// iOS Modal은 닫힘 애니메이션이 끝나야 사라지고 onDismiss를 부르는데, 테스트에는 네이티브가 없다.
// 닫히면 그리지 않고 MOCK_DISMISS_MS 뒤에 onDismiss를 불러 그 순서를 흉내 낸다. 다른 Modal이 닫히는 중에
// 새 Modal이 열리면 기록한다. iOS는 이때 새 Modal을 띄우지 못할 수 있다(ADR 0007).
const MOCK_DISMISS_MS = 300;
const mockModal = { dismissing: 0, overlapped: false };
jest.mock('react-native/Libraries/Modal/Modal', () => {
  const React = jest.requireActual('react');
  const Actual = jest.requireActual('react-native/Libraries/Modal/Modal');
  const RealModal = Actual.default ?? Actual;
  const DismissingModal = (props: { visible?: boolean; onDismiss?: () => void }) => {
    const wasVisible = React.useRef(props.visible);
    React.useEffect(() => {
      if (props.visible && !wasVisible.current && mockModal.dismissing > 0) {
        mockModal.overlapped = true;
      }
      if (wasVisible.current && !props.visible) {
        mockModal.dismissing += 1;
        setTimeout(() => {
          mockModal.dismissing -= 1;
          props.onDismiss?.();
        }, MOCK_DISMISS_MS);
      }
      wasVisible.current = props.visible;
    });
    return props.visible ? React.createElement(RealModal, props) : null;
  };
  return { __esModule: true, default: DismissingModal };
});

// 시트가 다 닫히기를 기다린다: 시트의 닫힘 애니메이션(motion) 뒤에 Modal이 내려가고 사라진다.
const finishDismiss = () =>
  act(async () => {
    jest.advanceTimersByTime(motion + MOCK_DISMISS_MS);
  });

const newStore = (): Store =>
  createStore(createMemoryPort(createMemoryBacking()), {
    now: createTestClock().now,
    newId: createTestIds(),
  });

const renderTrash = async (store: Store) => {
  const Layout = () => (
    <ThemeProvider>
      <StoreProvider store={store}>
        <Stack screenOptions={{ headerShown: false }} />
      </StoreProvider>
    </ThemeProvider>
  );
  await renderRouter({ _layout: Layout, trash: TrashScreen }, { initialUrl: '/trash' });
  await act(async () => {});
};

const setupUser = () => userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

// 영어 단어 덱: apple은 먼저 따로 지우고, pear는 덱과 함께 지운다.
const seed = async () => {
  const store = newStore();
  const deck = await store.createDeck({ name: '영어 단어' });
  const apple = await store.createCard(deck.id, { front: 'apple', back: '사과' });
  const pear = await store.createCard(deck.id, { front: 'pear', back: '배' });
  await store.trashCard(apple.id);
  await store.trashDeck(deck.id);
  return { store, deck, apple, pear };
};

let sendEvent: jest.SpyInstance;

// sendAccessibilityEvent가 받는 ref는 컴포넌트 인스턴스라 RNTL 요소와 같은 객체가 아니어서, 글자로 식별한다.
const lastFocused = (): unknown => {
  const target = sendEvent.mock.calls.at(-1)?.[0] as { props: { children?: unknown } } | undefined;
  return target?.props.children;
};

beforeEach(() => {
  mockModal.dismissing = 0;
  mockModal.overlapped = false;
  jest.useFakeTimers();
  sendEvent = jest.spyOn(AccessibilityInfo, 'sendAccessibilityEvent').mockImplementation();
});
afterEach(() => {
  expect(mockModal.overlapped).toBe(false);
  jest.useRealTimers();
  sendEvent.mockRestore();
});

describe('휴지통 복구', () => {
  test('덱이 휴지통에 있어도 따로 지운 카드가 덱 이름과 함께 보인다', async () => {
    const { store } = await seed();
    await renderTrash(store);

    expect(screen.getByText('카드 1')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'apple 복구' })).toBeOnTheScreen();
    expect(screen.getByText(/사과 · 영어 단어/)).toBeOnTheScreen();
  });

  test('덱의 복구는 안내 시트를 거치고, 함께 지운 카드만 돌아온다', async () => {
    const { store, deck, pear } = await seed();
    await renderTrash(store);
    const user = setupUser();

    await user.press(screen.getByRole('button', { name: '영어 단어 복구' }));

    expect(
      screen.getByText(
        '덱과 함께 지운 카드 1장이 같이 돌아와요. 덱을 지우기 전에 따로 지운 카드는 휴지통에 그대로 남아요.',
      ),
    ).toBeOnTheScreen();
    expect(await store.getDeck(deck.id)).toBeNull();

    await user.press(screen.getByRole('button', { name: '복구' }));
    await finishDismiss();

    expect(screen.getByText('덱을 복구했어요')).toBeOnTheScreen();
    expect(lastFocused()).toBe('휴지통');
    expect(await store.listCards(deck.id)).toEqual([pear]);
    expect(screen.queryByText('덱 1')).toBeNull();
    expect(screen.getByRole('button', { name: 'apple 복구' })).toBeOnTheScreen();
  });

  test('덱 줄을 눌러도 같은 안내 시트가 열리고, 취소하면 복구하지 않는다', async () => {
    const { store, deck } = await seed();
    await renderTrash(store);
    const user = setupUser();

    await user.press(screen.getByRole('button', { name: /^덱 영어 단어,/ }));
    await user.press(screen.getByRole('button', { name: '취소' }));
    await finishDismiss();

    expect(await store.getDeck(deck.id)).toBeNull();
    expect(screen.getByText('덱 1')).toBeOnTheScreen();
  });

  test('덱이 휴지통에 있는 카드를 복구하려 하면 덱을 먼저 복구하라고 안내한다', async () => {
    const { store, apple } = await seed();
    await renderTrash(store);
    const user = setupUser();

    await user.press(screen.getByRole('button', { name: 'apple 복구' }));
    await act(async () => {});

    expect(screen.getByRole('header', { name: '덱이 휴지통에 있어요' })).toBeOnTheScreen();
    expect(screen.getByText(/먼저 영어 단어 덱을 복구해 주세요/)).toBeOnTheScreen();
    expect(await store.getCard(apple.id)).toBeNull();
  });

  test('카드 시트에서 복구하다 막히면 시트가 다 닫힌 뒤 안내를 연다', async () => {
    const { store } = await seed();
    await renderTrash(store);
    const user = setupUser();

    await user.press(screen.getByRole('button', { name: /^apple,/ }));
    await user.press(screen.getByRole('button', { name: '복구' }));
    await act(async () => {});

    expect(screen.queryByRole('header', { name: '덱이 휴지통에 있어요' })).toBeNull();

    await finishDismiss();

    expect(screen.getByRole('header', { name: '덱이 휴지통에 있어요' })).toBeOnTheScreen();
  });

  test('카드는 바로 복구되고, 토스트는 잠시 뒤 사라진다', async () => {
    const { store, deck, apple, pear } = await seed();
    await store.restoreDeck(deck.id);
    await renderTrash(store);
    const user = setupUser();

    await user.press(screen.getByRole('button', { name: 'apple 복구' }));
    await act(async () => {});

    expect(screen.getByText('카드를 복구했어요')).toBeOnTheScreen();
    expect(lastFocused()).toBe('휴지통');
    expect(await store.listCards(deck.id)).toEqual([apple, pear]);
    expect(screen.getByText('휴지통이 비어 있어요')).toBeOnTheScreen();

    await act(async () => {
      jest.advanceTimersByTime(toastHold.plain);
    });

    expect(screen.queryByText('카드를 복구했어요')).toBeNull();
  });
});

describe('휴지통 영구 삭제', () => {
  test('덱을 영구 삭제하면 확인 문구에 따로 지운 카드까지 센 수가 나오고, 덱과 카드가 모두 사라진다', async () => {
    const { store } = await seed();
    await renderTrash(store);
    const user = setupUser();

    await user.press(screen.getByRole('button', { name: /^덱 영어 단어,/ }));
    await user.press(screen.getByRole('button', { name: '영구 삭제' }));
    await finishDismiss();

    expect(screen.getByRole('header', { name: '영구 삭제할까요?' })).toBeOnTheScreen();
    expect(
      screen.getByText('영어 단어 덱과 카드 2장, 그 학습 이력이 모두 사라져요. 되돌릴 수 없어요.'),
    ).toBeOnTheScreen();

    await user.press(screen.getByRole('button', { name: '영구 삭제' }));
    await finishDismiss();

    expect(screen.getByText('덱을 영구 삭제했어요')).toBeOnTheScreen();
    expect(lastFocused()).toBe('휴지통');
    expect(await store.listTrash()).toEqual({ decks: [], cards: [] });
    expect(screen.getByText('휴지통이 비어 있어요')).toBeOnTheScreen();
  });

  test('확인에서 취소하면 지우지 않는다', async () => {
    const { store } = await seed();
    await renderTrash(store);
    const user = setupUser();

    await user.press(screen.getByRole('button', { name: /^apple,/ }));
    await user.press(screen.getByRole('button', { name: '영구 삭제' }));
    await finishDismiss();
    await user.press(screen.getByRole('button', { name: '취소' }));
    await finishDismiss();

    expect((await store.listTrash()).cards).toHaveLength(1);
    expect(lastFocused()).not.toBe('휴지통');
    expect(screen.getByRole('button', { name: 'apple 복구' })).toBeOnTheScreen();
  });

  test('덱이 휴지통에 있어도 따로 지운 카드는 영구 삭제되고, 덱은 남는다', async () => {
    const { store } = await seed();
    await renderTrash(store);
    const user = setupUser();

    await user.press(screen.getByRole('button', { name: /^apple,/ }));
    await user.press(screen.getByRole('button', { name: '영구 삭제' }));
    await finishDismiss();

    expect(
      screen.getByText('apple 카드와 그 학습 이력이 모두 사라져요. 되돌릴 수 없어요.'),
    ).toBeOnTheScreen();

    await user.press(screen.getByRole('button', { name: '영구 삭제' }));
    await finishDismiss();

    expect(screen.getByText('카드를 영구 삭제했어요')).toBeOnTheScreen();
    expect(await store.listTrash()).toMatchObject({ cards: [] });
    expect(screen.queryByRole('button', { name: 'apple 복구' })).toBeNull();
    expect(screen.getByText('덱 1')).toBeOnTheScreen();
  });

  test('휴지통을 비우면 덱과 카드가 모두 사라지고 비우기 버튼도 없어진다', async () => {
    const { store } = await seed();
    await renderTrash(store);
    const user = setupUser();

    await user.press(screen.getByRole('button', { name: '휴지통 비우기' }));

    expect(
      screen.getByText('덱 1개, 카드 2장과 그 학습 이력이 모두 사라져요. 되돌릴 수 없어요.'),
    ).toBeOnTheScreen();

    await user.press(screen.getAllByRole('button', { name: '휴지통 비우기' }).at(-1)!);
    await finishDismiss();

    expect(screen.getByText('휴지통을 비웠어요')).toBeOnTheScreen();
    expect(lastFocused()).toBe('휴지통');
    expect(await store.countTrash()).toBe(0);
    expect(screen.getByText('휴지통이 비어 있어요')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: '휴지통 비우기' })).toBeNull();
  });
});

import { act, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { createGestureController, getByGestureTestId } from 'react-native-gesture-handler/jest-utils';

import { SwipeToTrash } from '@/features/cards/components/SwipeToTrash';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { motion } from '@/theme/tokens';

// 휴지통으로 보낸 행은 목록의 빠짐 움직임에 기대지 않고 스스로 사라진다.
// 라우터 위에서는 애니메이션 값이 갱신되지 않아서 SwipeToTrash를 바로 그린다.

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

async function renderRow(onTrash: () => Promise<void>) {
  await render(
    <ThemeProvider>
      <SwipeToTrash label="apple" onTrash={onTrash}>
        {() => <Text>apple</Text>}
      </SwipeToTrash>
    </ThemeProvider>,
  );
}

// 행 전체를 오른쪽 끝까지 밀어 바로 휴지통으로 보낸다(너비의 60%를 넘기는 밀기).
async function swipeToCommit() {
  await act(async () => {
    screen.getByTestId('swipe-to-trash').props.onLayout({ nativeEvent: { layout: { width: 300, height: 60 } } });
  });
  const pan = createGestureController(getByGestureTestId('swipe-to-trash-pan'));
  await act(async () => {
    pan.begin();
    pan.activate();
    pan.update({ translationX: -250 });
    pan.end({ translationX: -250 });
  });
  // 첫 번째는 commit을 부르고, 두 번째는 저장이 끝난 뒤 시작하는 사라짐을 돌린다.
  for (let step = 0; step < 2; step += 1) {
    await act(async () => {
      jest.advanceTimersByTime(motion + 20);
    });
  }
}

function rootOf() {
  return screen.getByTestId('swipe-to-trash');
}

describe('SwipeToTrash 사라짐', () => {
  // 캔버스(UX · 밀어서 휴지통): 휴지통 아이콘 아래에 "휴지통" 글자가 함께 있다.
  test('휴지통 칸에는 아이콘과 함께 글자가 있다', async () => {
    await renderRow(() => Promise.resolve());

    expect(screen.getByText('휴지통', { includeHiddenElements: true })).toBeTruthy();
  });

  test('휴지통에 보내고 나면 행이 투명해지고 높이가 0으로 접힌다', async () => {
    const onTrash = jest.fn(() => Promise.resolve());
    await renderRow(onTrash);

    await swipeToCommit();

    expect(onTrash).toHaveBeenCalledTimes(1);
    expect(rootOf()).toHaveAnimatedStyle({ opacity: 0, height: 0 });
  });

  test('휴지통에 보내지 못하면 행은 그대로 남는다', async () => {
    await renderRow(() => Promise.reject(new Error('fail')));

    await swipeToCommit();

    expect(rootOf()).toHaveAnimatedStyle({ opacity: 1 });
  });
});

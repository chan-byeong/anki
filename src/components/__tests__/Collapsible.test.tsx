import { Text } from 'react-native';
import { getAnimatedStyle } from 'react-native-reanimated';

import { Collapsible } from '@/components/motion/Collapsible';
import { motion, motionEnter } from '@/theme/tokens';
import { act, fireEvent, render, screen } from '@testing-library/react-native';

// 시스템 설정 구독은 useReducedMotion의 일이라 여기서는 그 값만 바꾼다.
const mockReducedMotion = { current: false };
jest.mock('@/hooks/use-reduced-motion', () => ({
  useReducedMotion: () => mockReducedMotion.current,
}));

// 높이 열림(ADR 0021): 열기 240ms(motionEnter) easeOut, 접기 160ms(motion) easeIn. 높이와 불투명도가 함께 움직인다.
// 높이는 'auto'로 움직일 수 없어서 내용 높이를 onLayout으로 재서 숫자로 움직인다.
// 접힘이 끝나면 내용을 언마운트하고, 다시 열 때는 첫 프레임을 투명하게(높이 0) 렌더해 높이를 잰 뒤 시작한다.
// 접기 시작하는 순간 aria-hidden으로 스크린리더에서 숨긴다. 열린 동안 내용 높이가 바뀌면 바로 맞춘다.
// 동작 줄이기에서는 높이는 움직이지 않고 160ms 페이드만 남는다.
// 다 열린 뒤 높이를 'auto'로 돌려놓는지는 Jest에서 볼 수 없다(애니메이션 스타일에서 빠진 값은 마지막 값이 남는다). 시뮬레이터에서 본다.
// easeOut·easeIn 곡선은 구간 중간 값을 바꾸므로, 중간은 "0과 끝 사이"로만 확인하고 정확한 값은 끝나는 시각에만 본다.
const CONTENT_HEIGHT = 100;

const advance = (ms: number) =>
  act(async () => {
    jest.advanceTimersByTime(ms);
  });

const NAME = '내용';
const ui = (open: boolean, props: { style?: object } = {}) => (
  <Collapsible open={open} testID="box" {...props}>
    <Text>{NAME}</Text>
  </Collapsible>
);

// 내용이 트리에 있는지. aria-hidden인 내용도 "있음"으로 센다.
const inTree = () => screen.queryByText(NAME, { includeHiddenElements: true }) !== null;
// 스크린리더가 읽을 수 있는지. aria-hidden이면 잡히지 않는다.
const readable = () => screen.queryByText(NAME) !== null;

// 실제 기기에서는 내용이 마운트되면 onLayout이 불린다. 높이를 재는 뷰(testID 뒤에 -content)에 같은 이벤트를 보낸다.
const layout = (height: number) =>
  fireEvent(screen.getByTestId('box-content', { includeHiddenElements: true }), 'layout', {
    nativeEvent: { layout: { x: 0, y: 0, width: 300, height } },
  });

// getAnimatedStyle의 웹용 타입 선언은 인자를 받지 않아서(실행은 받는다) 쓰는 모양으로 다시 선언한다.
type AnimatedStyle = { height?: number | string; opacity?: number };
const readAnimatedStyle = getAnimatedStyle as unknown as (component: unknown) => AnimatedStyle;

// 감싼 뷰의 지금 높이와 불투명도. 높이를 따로 정하지 않았으면 height는 undefined다.
const current = () => {
  const { height, opacity } = readAnimatedStyle(screen.getByTestId('box'));
  return { height, opacity };
};
// 높이가 0과 잰 높이 사이의 중간 값이 아니다(움직이는 중이 아니다).
const notInBetween = (height: unknown) =>
  !(typeof height === 'number' && height > 0 && height < CONTENT_HEIGHT);

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  mockReducedMotion.current = false;
  jest.useRealTimers();
});

// 열린 채로 그리고 높이를 잰 상태.
const renderOpen = async () => {
  const utils = await render(ui(true));
  await layout(CONTENT_HEIGHT);
  return utils;
};

describe('Collapsible: 처음 그릴 때', () => {
  it('닫혀 있으면 내용을 그리지 않는다', async () => {
    await render(ui(false));

    expect(inTree()).toBe(false);
  });

  it('열려 있으면 움직임 없이 바로 내용을 그린다', async () => {
    await render(ui(true));

    expect(readable()).toBe(true);
    expect(current().opacity).toBe(1);
    expect(notInBetween(current().height)).toBe(true);
  });

  it('style을 감싼 뷰에 넘긴다', async () => {
    await render(ui(true, { style: { marginTop: 8 } }));

    expect(screen.getByTestId('box')).toHaveStyle({ marginTop: 8 });
  });
});

describe('Collapsible: 열기', () => {
  it('열면 내용이 그려지지만 높이를 재기 전까지는 높이 0·투명으로 둔다', async () => {
    const { rerender } = await render(ui(false));
    await rerender(ui(true));

    expect(inTree()).toBe(true);
    expect(current()).toEqual({ height: 0, opacity: 0 });
  });

  it('높이를 재기 전에는 시간이 지나도 움직이기 시작하지 않는다', async () => {
    const { rerender } = await render(ui(false));
    await rerender(ui(true));
    await advance(motionEnter);

    expect(current()).toEqual({ height: 0, opacity: 0 });
  });

  it('높이를 잰 뒤 240ms에 걸쳐 잰 높이·불투명도 1까지 열린다', async () => {
    const { rerender } = await render(ui(false));
    await rerender(ui(true));
    await layout(CONTENT_HEIGHT);

    await advance(motionEnter / 2);
    const middle = current();
    expect(middle.height).toBeGreaterThan(0);
    expect(middle.height).toBeLessThan(CONTENT_HEIGHT);
    expect(middle.opacity).toBeGreaterThan(0);
    expect(middle.opacity).toBeLessThan(1);

    await advance(motionEnter / 2);
    expect(current()).toEqual({ height: CONTENT_HEIGHT, opacity: 1 });
  });

  it('열기는 접기보다 길어서 160ms에는 아직 다 열리지 않았다', async () => {
    const { rerender } = await render(ui(false));
    await rerender(ui(true));
    await layout(CONTENT_HEIGHT);
    await advance(motion);

    expect(current().height).toBeLessThan(CONTENT_HEIGHT);
    expect(current().opacity).toBeLessThan(1);
  });

  it('다 열리면 스크린리더가 읽을 수 있다', async () => {
    const { rerender } = await render(ui(false));
    await rerender(ui(true));
    await layout(CONTENT_HEIGHT);
    await advance(motionEnter);

    expect(readable()).toBe(true);
  });
});

describe('Collapsible: 접기', () => {
  it('접으면 160ms에 걸쳐 높이 0·투명까지 접힌다', async () => {
    const { rerender } = await renderOpen();
    await rerender(ui(false));

    await advance(motion / 2);
    const middle = current();
    expect(middle.height).toBeGreaterThan(0);
    expect(middle.height).toBeLessThan(CONTENT_HEIGHT);
    expect(middle.opacity).toBeGreaterThan(0);
    expect(middle.opacity).toBeLessThan(1);

    await advance(motion / 2);
    // 접힘이 끝나는 순간 내용을 치우므로, 감싼 뷰가 남아 있다면 접힌 모습이어야 한다.
    if (screen.queryByTestId('box')) expect(current()).toEqual({ height: 0, opacity: 0 });
  });

  it('접기 시작하는 순간 스크린리더에서 숨기지만 내용은 아직 트리에 있다', async () => {
    const { rerender } = await renderOpen();
    expect(readable()).toBe(true);

    await rerender(ui(false));

    expect(readable()).toBe(false);
    expect(inTree()).toBe(true);
  });

  it('접는 도중에는 내용을 지우지 않는다', async () => {
    const { rerender } = await renderOpen();
    await rerender(ui(false));
    await advance(motion - 1);

    expect(inTree()).toBe(true);
  });

  it('접힘이 끝나면 내용을 언마운트한다', async () => {
    const { rerender } = await renderOpen();
    await rerender(ui(false));
    await advance(motion);
    await advance(0);

    expect(inTree()).toBe(false);
  });

  it('접히는 도중에 다시 열면 내용을 지우지 않고 끝까지 열린다', async () => {
    const { rerender } = await renderOpen();
    await rerender(ui(false));
    await advance(motion / 2);
    await rerender(ui(true));
    await advance(motionEnter + 1000);

    expect(inTree()).toBe(true);
    expect(readable()).toBe(true);
    expect(notInBetween(current().height)).toBe(true);
    expect(current().height).not.toBe(0);
    expect(current().opacity).toBe(1);
  });

  it('열리는 도중에 접어도 끝까지 접히고 내용을 언마운트한다', async () => {
    const { rerender } = await render(ui(false));
    await rerender(ui(true));
    await layout(CONTENT_HEIGHT);
    await advance(motionEnter / 2);
    await rerender(ui(false));
    await advance(motion);
    await advance(0);

    expect(inTree()).toBe(false);
  });

  it('언마운트된 뒤 다시 열면 높이를 새로 재고 시작한다', async () => {
    const { rerender } = await renderOpen();
    await rerender(ui(false));
    await advance(motion);
    await advance(0);

    await rerender(ui(true));
    await advance(motionEnter);
    // 새로 마운트됐으니 옛 높이를 쓰지 않고 잴 때까지 기다린다.
    expect(current()).toEqual({ height: 0, opacity: 0 });

    await layout(120);
    await advance(motionEnter);
    expect(current()).toEqual({ height: 120, opacity: 1 });
  });
});

describe('Collapsible: 동작 줄이기', () => {
  beforeEach(() => {
    mockReducedMotion.current = true;
  });

  it('열 때 높이는 움직이지 않고 160ms 페이드만 한다', async () => {
    const { rerender } = await render(ui(false));
    await rerender(ui(true));
    await layout(CONTENT_HEIGHT);
    // 높이는 처음부터 끝까지 중간 값이 없다.
    expect(notInBetween(current().height)).toBe(true);
    expect(current().opacity).toBe(0);

    await advance(motion / 2);
    expect(notInBetween(current().height)).toBe(true);
    expect(current().opacity).toBeGreaterThan(0);
    expect(current().opacity).toBeLessThan(1);

    await advance(motion / 2);
    expect(notInBetween(current().height)).toBe(true);
    expect(current().opacity).toBe(1);
  });

  it('접을 때도 높이는 움직이지 않고 160ms 페이드만 한 뒤 언마운트한다', async () => {
    const { rerender } = await renderOpen();
    await rerender(ui(false));

    // 높이는 중간 값이 없다. 잰 높이로 있다가 접힘이 끝나면 0이 되거나 처음부터 0이다.
    expect(notInBetween(current().height)).toBe(true);

    await advance(motion / 2);
    expect(notInBetween(current().height)).toBe(true);
    expect(current().opacity).toBeGreaterThan(0);
    expect(current().opacity).toBeLessThan(1);

    await advance(motion / 2);
    await advance(0);
    expect(inTree()).toBe(false);
  });

  it('동작 줄이기에서도 접기 시작하는 순간 스크린리더에서 숨긴다', async () => {
    const { rerender } = await renderOpen();
    await rerender(ui(false));

    expect(readable()).toBe(false);
    expect(inTree()).toBe(true);
  });
});

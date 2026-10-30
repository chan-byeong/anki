import { Pressable } from 'react-native';
import Animated from 'react-native-reanimated';

import { useShake, type ShakeOptions } from '@/hooks/use-shake';
import { act, fireEvent, render, screen } from '@testing-library/react-native';

// 시스템 설정 구독은 useReducedMotion의 일이라 여기서는 그 값만 바꾼다.
const mockReducedMotion = { current: false };
jest.mock('@/hooks/use-reduced-motion', () => ({
  useReducedMotion: () => mockReducedMotion.current,
}));

// 흔들기(ADR 0021): 기본은 240ms 동안 −4 → 4 → −4 → 0px, 60ms씩. 거리와 시간은 옵션으로 바꿀 수 있다. 곡선은 easeMove라서
// 구간 중간 값은 곡선에 따라 달라진다. 그래서 구간이 끝나는 시각(60·120·180·240ms)만 값으로 확인한다.
const STEP = 60;
const TOTAL = 240;
const DISTANCE = 4;

const advance = (ms: number) =>
  act(async () => {
    jest.advanceTimersByTime(ms);
  });

// 훅의 style을 받는 상자와, shake()를 부르는 버튼.
function Harness(options: ShakeOptions) {
  const { style, shake } = useShake(options);
  return (
    <>
      <Animated.View testID="box" style={style} />
      <Pressable testID="trigger" onPress={shake} />
    </>
  );
}

const trigger = () => fireEvent.press(screen.getByTestId('trigger'));
const box = () => screen.getByTestId('box');
const at = (translateX: number) => ({ transform: [{ translateX }] });

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  mockReducedMotion.current = false;
  jest.useRealTimers();
});

describe('useShake', () => {
  it('흔들기 전에는 제자리에 있다', async () => {
    await render(<Harness />);

    expect(box()).toHaveAnimatedStyle(at(0));
  });

  it('shake()를 부르면 60ms마다 −4 → 4 → −4 → 0px로 움직인다', async () => {
    await render(<Harness />);
    await trigger();

    await advance(STEP);
    expect(box()).toHaveAnimatedStyle(at(-DISTANCE));

    await advance(STEP);
    expect(box()).toHaveAnimatedStyle(at(DISTANCE));

    await advance(STEP);
    expect(box()).toHaveAnimatedStyle(at(-DISTANCE));

    await advance(STEP);
    expect(box()).toHaveAnimatedStyle(at(0));
  });

  it('240ms가 지나면 제자리에서 멈춘다', async () => {
    await render(<Harness />);
    await trigger();
    await advance(TOTAL);
    await advance(1000);

    expect(box()).toHaveAnimatedStyle(at(0));
  });

  it('끝난 뒤에 다시 부르면 처음부터 다시 흔든다', async () => {
    await render(<Harness />);
    await trigger();
    await advance(TOTAL);

    await trigger();
    await advance(STEP);
    expect(box()).toHaveAnimatedStyle(at(-DISTANCE));

    await advance(STEP);
    expect(box()).toHaveAnimatedStyle(at(DISTANCE));
  });

  it('흔드는 중에 다시 부르면 그때부터 처음부터 다시 흔든다', async () => {
    await render(<Harness />);
    await trigger();
    await advance(STEP * 2);
    expect(box()).toHaveAnimatedStyle(at(DISTANCE));

    await trigger();
    await advance(STEP);
    expect(box()).toHaveAnimatedStyle(at(-DISTANCE));

    await advance(STEP);
    expect(box()).toHaveAnimatedStyle(at(DISTANCE));

    await advance(STEP);
    expect(box()).toHaveAnimatedStyle(at(-DISTANCE));

    await advance(STEP);
    expect(box()).toHaveAnimatedStyle(at(0));
  });

  it('흔드는 중에 다시 불러도 처음 흔들기의 남은 움직임이 섞이지 않는다', async () => {
    await render(<Harness />);
    await trigger();
    await advance(STEP * 3);

    await trigger();
    await advance(TOTAL);
    await advance(1000);

    expect(box()).toHaveAnimatedStyle(at(0));
  });

  it('distance를 주면 그 거리만큼 좌우로 움직인다', async () => {
    await render(<Harness distance={10} />);
    await trigger();

    await advance(STEP);
    expect(box()).toHaveAnimatedStyle(at(-10));

    await advance(STEP);
    expect(box()).toHaveAnimatedStyle(at(10));

    await advance(STEP);
    expect(box()).toHaveAnimatedStyle(at(-10));

    await advance(STEP);
    expect(box()).toHaveAnimatedStyle(at(0));
  });

  it('duration을 주면 그 시간을 네 구간이 똑같이 나눠 흔든다', async () => {
    await render(<Harness duration={120} />);
    await trigger();

    await advance(30);
    expect(box()).toHaveAnimatedStyle(at(-DISTANCE));

    await advance(30);
    expect(box()).toHaveAnimatedStyle(at(DISTANCE));

    await advance(30);
    expect(box()).toHaveAnimatedStyle(at(-DISTANCE));

    await advance(30);
    expect(box()).toHaveAnimatedStyle(at(0));
  });

  it('distance와 duration을 함께 줄 수 있고, 한쪽만 주면 나머지는 기본값이다', async () => {
    await render(<Harness distance={6} duration={480} />);
    await trigger();

    await advance(120);
    expect(box()).toHaveAnimatedStyle(at(-6));

    await advance(360);
    expect(box()).toHaveAnimatedStyle(at(0));
  });

  it('옵션을 줘도 동작 줄이기에서는 움직이지 않는다', async () => {
    mockReducedMotion.current = true;
    await render(<Harness distance={10} duration={120} />);
    await trigger();

    await advance(120);
    expect(box()).toHaveAnimatedStyle(at(0));
  });

  it('동작 줄이기가 켜지면 shake()를 불러도 움직이지 않는다', async () => {
    mockReducedMotion.current = true;
    await render(<Harness />);
    await trigger();

    for (let elapsed = STEP; elapsed <= TOTAL; elapsed += STEP) {
      await advance(STEP);
      expect(box()).toHaveAnimatedStyle(at(0));
    }
  });
});

import { Keyframe, LayoutAnimationConfig } from 'react-native-reanimated';

import { CountText, countTextAnimations } from '@/components/motion/CountText';
import { motion, shift } from '@/theme/tokens';
import { render, screen } from '@testing-library/react-native';

// LayoutAnimationConfig에 어떤 props가 들어갔는지 보려고 감싼다. 동작은 그대로 실제 컴포넌트다.
jest.mock('react-native-reanimated', () => {
  const actual = jest.requireActual('react-native-reanimated');
  const { createElement } = jest.requireActual('react');
  return {
    ...actual,
    __esModule: true,
    // 실제 LayoutAnimationConfig는 클래스라서 jest.fn으로 직접 감쌀 수 없다. 함수 컴포넌트로 한 겹 씌운다.
    LayoutAnimationConfig: jest.fn((props) => createElement(actual.LayoutAnimationConfig, props)),
  };
});

// 시스템 설정 구독은 useReducedMotion의 일이라 여기서는 그 값만 바꾼다.
const mockReducedMotion = { current: false };
jest.mock('@/hooks/use-reduced-motion', () => ({
  useReducedMotion: () => mockReducedMotion.current,
}));

// 숫자 바뀜(ADR 0021): 값이 바뀌면 새 숫자는 아래 8px에서 올라오며 나타나고, 옛 숫자는 위로 8px 가며 사라진다.
// 160ms. 늘든 줄든 방향은 항상 위. 첫 렌더에서는 움직이지 않는다. 동작 줄이기에서는 이동 없이 페이드만.
// Jest에서는 entering·exiting이 돌지 않아서(FadeSwap 테스트와 같은 이유) 어떤 키프레임을 붙였는지로 확인한다.
// 값이 바뀔 때 새로 마운트되게 하는 key는 Jest에서 확인할 수 없다. 시뮬레이터에서 본다.

type Frame = { opacity?: number; transform?: Record<string, number>[] };
type KeyframeInfo = { definitions: Record<string, Frame>; durationV?: number; delayV?: number };

// reanimated의 Keyframe 타입은 정의와 시간을 드러내지 않아서 읽을 수 있는 모양으로 바꿔 본다.
const inspect = (keyframe: unknown) => keyframe as KeyframeInfo;
// Keyframe의 정의는 0/100 또는 from/to로 쓸 수 있다. 어느 쪽이든 읽는다.
const startOf = (keyframe: unknown): Frame =>
  inspect(keyframe).definitions['0'] ?? inspect(keyframe).definitions.from;
const endOf = (keyframe: unknown): Frame =>
  inspect(keyframe).definitions['100'] ?? inspect(keyframe).definitions.to;
// -shift가 0일 때의 -0도 0으로 본다.
const translateY = (frame: Frame) =>
  frame.transform?.find((entry) => 'translateY' in entry)?.translateY || 0;

describe('countTextAnimations', () => {
  it('새 숫자는 아래에서 올라오며 나타난다', () => {
    const { entering } = countTextAnimations({ shift, duration: motion });

    expect(entering).toBeInstanceOf(Keyframe);
    expect(startOf(entering).opacity).toBe(0);
    expect(translateY(startOf(entering))).toBe(shift);
    expect(endOf(entering).opacity).toBe(1);
    expect(translateY(endOf(entering))).toBe(0);
  });

  it('옛 숫자는 위로 올라가며 사라진다', () => {
    const { exiting } = countTextAnimations({ shift, duration: motion });

    expect(exiting).toBeInstanceOf(Keyframe);
    expect(startOf(exiting).opacity).toBe(1);
    expect(translateY(startOf(exiting))).toBe(0);
    expect(endOf(exiting).opacity).toBe(0);
    expect(translateY(endOf(exiting))).toBe(-shift);
  });

  it('둘 다 주어진 시간 동안 움직이고 기다림 없이 동시에 시작한다', () => {
    const { entering, exiting } = countTextAnimations({ shift, duration: 160 });

    expect(inspect(entering).durationV).toBe(160);
    expect(inspect(exiting).durationV).toBe(160);
    expect(inspect(entering).delayV).toBeUndefined();
    expect(inspect(exiting).delayV).toBeUndefined();
  });

  it('이동 거리가 0이면 움직이지 않고 페이드만 한다', () => {
    const { entering, exiting } = countTextAnimations({ shift: 0, duration: motion });

    expect(translateY(startOf(entering))).toBe(0);
    expect(translateY(endOf(entering))).toBe(0);
    expect(translateY(startOf(exiting))).toBe(0);
    expect(translateY(endOf(exiting))).toBe(0);
    expect(startOf(entering).opacity).toBe(0);
    expect(endOf(exiting).opacity).toBe(0);
  });
});

beforeEach(() => {
  jest.mocked(LayoutAnimationConfig).mockClear();
});

afterEach(() => {
  mockReducedMotion.current = false;
});

// 숫자를 감싼 뷰에 붙은 들어옴·나감 키프레임.
const animations = () => {
  const { entering, exiting } = screen.getByTestId('count').props;
  return { entering, exiting };
};

describe('CountText', () => {
  it('숫자를 그린다', async () => {
    await render(<CountText value={12} testID="count" />);

    expect(screen.getByText('12')).toBeOnTheScreen();
  });

  it('0도 그린다', async () => {
    await render(<CountText value={0} testID="count" />);

    expect(screen.getByText('0')).toBeOnTheScreen();
  });

  it('값이 바뀌면 새 숫자만 남고 옛 숫자는 없다', async () => {
    const { rerender } = await render(<CountText value={5} testID="count" />);
    await rerender(<CountText value={4} testID="count" />);

    expect(screen.getByText('4')).toBeOnTheScreen();
    expect(screen.queryByText('5')).not.toBeOnTheScreen();
  });

  it('줄어들 때도 늘어날 때와 똑같이 아래에서 올라온다', async () => {
    const { rerender } = await render(<CountText value={5} testID="count" />);

    await rerender(<CountText value={4} testID="count" />);
    expect(translateY(startOf(animations().entering))).toBe(shift);
    expect(translateY(endOf(animations().exiting))).toBe(-shift);

    await rerender(<CountText value={9} testID="count" />);
    expect(translateY(startOf(animations().entering))).toBe(shift);
    expect(translateY(endOf(animations().exiting))).toBe(-shift);
  });

  it('감싼 뷰에 160ms 키프레임을 붙인다', async () => {
    await render(<CountText value={5} testID="count" />);

    expect(inspect(animations().entering).durationV).toBe(motion);
    expect(inspect(animations().exiting).durationV).toBe(motion);
  });

  it('첫 렌더에서는 들어오는 애니메이션을 건너뛴다', async () => {
    await render(<CountText value={5} testID="count" />);

    expect(LayoutAnimationConfig).toHaveBeenCalledWith(
      expect.objectContaining({ skipEntering: true }),
      undefined,
    );
  });

  it('동작 줄이기가 켜지면 이동 없이 페이드만 한다', async () => {
    mockReducedMotion.current = true;
    await render(<CountText value={5} testID="count" />);
    const { entering, exiting } = animations();

    expect(translateY(startOf(entering))).toBe(0);
    expect(translateY(endOf(exiting))).toBe(0);
    expect(startOf(entering).opacity).toBe(0);
    expect(endOf(exiting).opacity).toBe(0);
    expect(inspect(entering).durationV).toBe(motion);
  });

  it('글자 style을 숫자에 넘긴다', async () => {
    await render(<CountText value={5} testID="count" style={{ fontSize: 20 }} />);

    expect(screen.getByText('5')).toHaveStyle({ fontSize: 20 });
  });
});

import { useEffect } from 'react';
import { Text, type ViewStyle } from 'react-native';
import { FadeIn, FadeOut, LayoutAnimationConfig } from 'react-native-reanimated';

import { FadeSwap, fadeSwapAnimations } from '@/components/motion/FadeSwap';
import { motion } from '@/theme/tokens';
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

// 바꿔 끼우기(ADR 0021): swapKey가 바뀌면 옛 내용과 새 내용이 160ms 동안 동시에 크로스페이드한다.
// Jest에서는 entering·exiting이 돌지 않는다(나간 요소는 바로 사라지고, 들어온 요소의 스타일도 비어 있다).
// 그래서 어떤 애니메이션을 붙였는지는 순수 함수(fadeSwapAnimations)로, 컴포넌트는 구조로만 확인한다.

describe('fadeSwapAnimations', () => {
  it('들어오는 쪽은 160ms 페이드 인이다', () => {
    const { entering } = fadeSwapAnimations();

    expect(entering).toBeInstanceOf(FadeIn);
    expect(entering.getDuration()).toBe(motion);
  });

  it('나가는 쪽은 160ms 페이드 아웃이다', () => {
    const { exiting } = fadeSwapAnimations();

    expect(exiting).toBeInstanceOf(FadeOut);
    expect(exiting.getDuration()).toBe(motion);
  });

  it('둘 다 기다림 없이 동시에 시작한다(크로스페이드)', () => {
    const { entering, exiting } = fadeSwapAnimations();

    expect(entering.getDelay()).toBe(0);
    expect(exiting.getDelay()).toBe(0);
  });
});

// 마운트될 때마다 세는 자식. swapKey가 같으면 다시 마운트되지 않고, 다르면 새로 마운트되어야 한다.
const mounted = jest.fn();
function Content({ label }: { label: string }) {
  useEffect(() => {
    mounted(label);
    // 마운트 때만 센다. label이 바뀌어도 세지 않는다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return <Text>{label}</Text>;
}

const ui = (swapKey: string, label: string, style?: ViewStyle) => (
  <FadeSwap swapKey={swapKey} style={style} testID="swap">
    <Content label={label} />
  </FadeSwap>
);

beforeEach(() => {
  mounted.mockClear();
  jest.mocked(LayoutAnimationConfig).mockClear();
});

describe('FadeSwap', () => {
  it('내용을 그린다', async () => {
    await render(ui('a', '처음'));

    expect(screen.getByText('처음')).toBeOnTheScreen();
  });

  it('swapKey가 바뀌면 새 내용만 남고 옛 내용은 없다', async () => {
    const { rerender } = await render(ui('a', '처음'));
    await rerender(ui('b', '나중'));

    expect(screen.getByText('나중')).toBeOnTheScreen();
    expect(screen.queryByText('처음')).not.toBeOnTheScreen();
  });

  it('swapKey가 바뀌면 내용을 새로 마운트한다', async () => {
    const { rerender } = await render(ui('a', '처음'));
    await rerender(ui('b', '나중'));

    expect(mounted).toHaveBeenCalledTimes(2);
    expect(mounted).toHaveBeenLastCalledWith('나중');
  });

  it('swapKey가 같으면 내용만 갱신하고 다시 마운트하지 않는다', async () => {
    const { rerender } = await render(ui('a', '처음'));
    await rerender(ui('a', '고침'));

    expect(screen.getByText('고침')).toBeOnTheScreen();
    expect(mounted).toHaveBeenCalledTimes(1);
  });

  it('바꿔 끼우는 뷰에 160ms 페이드 인·아웃을 붙인다', async () => {
    await render(ui('a', '처음'));
    const { entering, exiting } = screen.getByTestId('swap').props;

    expect(entering).toBeInstanceOf(FadeIn);
    expect(entering.getDuration()).toBe(motion);
    expect(exiting).toBeInstanceOf(FadeOut);
    expect(exiting.getDuration()).toBe(motion);
  });

  it('swapKey를 바꿔도 페이드 인·아웃은 그대로 붙어 있다', async () => {
    const { rerender } = await render(ui('a', '처음'));
    await rerender(ui('b', '나중'));
    const { entering, exiting } = screen.getByTestId('swap').props;

    expect(entering).toBeInstanceOf(FadeIn);
    expect(exiting).toBeInstanceOf(FadeOut);
  });

  it('style을 감싼 뷰에 넘긴다', async () => {
    await render(ui('a', '처음', { flex: 1 }));

    expect(screen.getByTestId('swap')).toHaveStyle({ flex: 1 });
  });

  it('swapKey를 바꿔도 style은 그대로 남는다', async () => {
    const { rerender } = await render(ui('a', '처음', { flex: 1 }));
    await rerender(ui('b', '나중', { flex: 1 }));

    expect(screen.getByTestId('swap')).toHaveStyle({ flex: 1 });
  });

  it('첫 렌더에서는 들어오는 애니메이션을 건너뛴다', async () => {
    await render(ui('a', '처음'));

    expect(LayoutAnimationConfig).toHaveBeenCalledWith(
      expect.objectContaining({ skipEntering: true }),
      undefined,
    );
  });
});

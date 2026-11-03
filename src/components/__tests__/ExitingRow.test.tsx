import { Text } from 'react-native';
import { FadeOut, LinearTransition } from 'react-native-reanimated';

import { ExitingRow, exitingRowAnimations } from '@/components/motion/ExitingRow';
import { motion } from '@/theme/tokens';
import { render, screen } from '@testing-library/react-native';

// 목록에서 빠짐: 빠지는 행은 160ms 페이드 아웃, 아래 행은 160ms에 올라온다.
// Jest에서는 레이아웃 애니메이션이 돌지 않아(ADR 0021) 어떤 애니메이션을 고르는지는 순수 함수로, 컴포넌트는 구조로만 본다.

describe('exitingRowAnimations', () => {
  it('빠지는 행은 160ms 페이드 아웃이다', () => {
    const { exiting } = exitingRowAnimations({ reduced: false });

    expect(exiting).toBeInstanceOf(FadeOut);
    expect(exiting.getDuration()).toBe(motion);
  });

  it('아래 행은 160ms에 걸쳐 올라온다', () => {
    const { layout } = exitingRowAnimations({ reduced: false });

    expect(layout).toBeInstanceOf(LinearTransition);
    expect(layout?.getDuration()).toBe(motion);
  });

  it('동작 줄이기에서는 아래 행이 바로 올라오고 페이드만 남는다', () => {
    const { exiting, layout } = exitingRowAnimations({ reduced: true });

    expect(exiting).toBeInstanceOf(FadeOut);
    expect(exiting.getDuration()).toBe(motion);
    expect(layout).toBeUndefined();
  });
});

describe('ExitingRow', () => {
  it('행 내용을 그대로 그린다', async () => {
    await render(
      <ExitingRow testID="row">
        <Text>사과</Text>
      </ExitingRow>,
    );

    expect(screen.getByTestId('row')).toContainElement(screen.getByText('사과'));
  });
});

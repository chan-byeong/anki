import { act, render, screen } from '@testing-library/react-native';
import { getAnimatedStyle } from 'react-native-reanimated';

import { LogoSplash } from '@/features/splash/components/LogoSplash';
import { ThemeProvider } from '@/theme/ThemeProvider';

// 시스템 설정 구독은 useReducedMotion의 일이라 여기서는 그 값만 바꾼다.
const mockReducedMotion = { current: false };
jest.mock('@/hooks/use-reduced-motion', () => ({
  useReducedMotion: () => mockReducedMotion.current,
}));

// 로고 모션 "첫 장 놓기": 종이가 아래 24px에서 놓이고(0–240ms), 줄이 가운데서 양옆으로(160–320ms),
// 귀퉁이가 오른쪽 위에서 접힌다(240–400ms, 글자도 같이 페이드). 겹쳐서 400ms 안에 끝난다.
beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  mockReducedMotion.current = false;
  jest.useRealTimers();
});

// 로고는 장식이라 스크린 리더에서 숨겨져 있다. 모션만 확인하므로 숨은 요소도 찾는다.
// getAnimatedStyle의 웹용 타입 선언은 인자를 받지 않아서(실행은 받는다) 쓰는 모양으로 다시 선언한다.
const readAnimatedStyle = getAnimatedStyle as unknown as (component: unknown) => {
  transform?: { scaleX?: number }[];
};

const part = (testID: string) => screen.getByTestId(testID, { includeHiddenElements: true });

const advance = (ms: number) =>
  act(async () => {
    jest.advanceTimersByTime(ms);
  });

const ui = (onShown?: () => void) => (
  <ThemeProvider override="light">
    <LogoSplash onShown={onShown} />
  </ThemeProvider>
);

describe('로고 모션', () => {
  test('종이 → 줄 → 귀퉁이와 글자 순서로 400ms 안에 끝난다', async () => {
    await render(ui());

    expect(part('logo-symbol')).toHaveStyle({ opacity: 0 });
    expect(part('logo-wordmark')).toHaveStyle({ opacity: 0 });

    await advance(240);
    expect(part('logo-symbol')).toHaveAnimatedStyle({
      opacity: 1,
      transform: [{ translateY: 0 }],
    });
    // 줄은 160ms에 시작해 한창 그어지는 중이다.
    const drawn = readAnimatedStyle(part('logo-line')).transform?.[0].scaleX;
    expect(drawn).toBeGreaterThan(0);
    expect(drawn).toBeLessThan(1);

    await advance(160);
    expect(part('logo-line')).toHaveAnimatedStyle({ transform: [{ scaleX: 1 }] });
    expect(part('logo-fold')).toHaveAnimatedStyle({ transform: [{ scale: 1 }] });
    expect(part('logo-wordmark')).toHaveAnimatedStyle({ opacity: 1 });
  });

  test('동작 줄이기에서는 움직임 없이 바로 보인다', async () => {
    mockReducedMotion.current = true;
    await render(ui());
    await advance(1);

    expect(part('logo-symbol')).toHaveAnimatedStyle({
      opacity: 1,
      transform: [{ translateY: 0 }],
    });
    expect(part('logo-fold')).toHaveAnimatedStyle({ transform: [{ scale: 1 }] });
  });

  test('처음 그려지면 알린다', async () => {
    const onShown = jest.fn();
    await render(ui(onShown));

    screen.getByLabelText('한장').props.onLayout();
    expect(onShown).toHaveBeenCalledTimes(1);
  });
});

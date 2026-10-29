import { Button, IconButton, ListRow, Segmented, StatusDot } from '@/components';
import { PlusIcon } from '@/components/icons';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { colors } from '@/theme/tokens';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import type { ReactElement } from 'react';

// 시스템 설정 구독은 useReducedMotion의 일이라 여기서는 그 값만 바꾼다.
const mockReducedMotion = { current: false };
jest.mock('@/hooks/use-reduced-motion', () => ({
  useReducedMotion: () => mockReducedMotion.current,
}));

const light = colors.light;

const renderLight = (ui: ReactElement) =>
  render(<ThemeProvider override="light">{ui}</ThemeProvider>);

const advance = (ms: number) =>
  act(async () => {
    jest.advanceTimersByTime(ms);
  });

// 누름 반응은 Pressable 안의 첫 자식(눈에 보이는 면)에 붙는다.
const face = (name: string) => screen.getByRole('button', { name }).children[0];

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  mockReducedMotion.current = false;
  jest.useRealTimers();
});

describe('Button 누름', () => {
  test('누르는 동안 0.97배로 줄고 주 버튼은 불투명도 0.88, 떼면 돌아온다', async () => {
    await renderLight(<Button label="저장" onPress={() => {}} />);

    await fireEvent(screen.getByRole('button', { name: '저장' }), 'pressIn');
    await advance(100);
    expect(face('저장')).toHaveAnimatedStyle({ opacity: 0.88, transform: [{ scale: 0.97 }] });

    await fireEvent(screen.getByRole('button', { name: '저장' }), 'pressOut');
    await advance(100);
    expect(face('저장')).toHaveAnimatedStyle({ opacity: 1, transform: [{ scale: 1 }] });
  });

  test('주 버튼이 아니면 크기만 줄고 불투명도는 그대로다', async () => {
    await renderLight(<Button variant="secondary" label="로그아웃" onPress={() => {}} />);

    await fireEvent(screen.getByRole('button', { name: '로그아웃' }), 'pressIn');
    await advance(100);

    expect(face('로그아웃')).toHaveAnimatedStyle({ opacity: 1, transform: [{ scale: 0.97 }] });
  });

  test('동작 줄이기가 켜지면 크기는 그대로, 불투명도만 바뀐다', async () => {
    mockReducedMotion.current = true;
    await renderLight(<Button label="저장" onPress={() => {}} />);

    await fireEvent(screen.getByRole('button', { name: '저장' }), 'pressIn');
    await advance(100);

    expect(face('저장')).toHaveAnimatedStyle({ opacity: 0.88, transform: [{ scale: 1 }] });
  });

  test('비활성 버튼은 반응하지 않는다', async () => {
    await renderLight(<Button label="저장" onPress={() => {}} disabled />);

    await fireEvent(screen.getByRole('button', { name: '저장' }), 'pressIn');
    await advance(100);

    expect(face('저장')).toHaveAnimatedStyle({ opacity: 1, transform: [{ scale: 1 }] });
  });
});

describe('IconButton 누름', () => {
  test('누르는 동안 --surface 바탕이 나타나고, 떼면 사라진다', async () => {
    await renderLight(<IconButton icon={PlusIcon} label="덱 추가" onPress={() => {}} />);

    await fireEvent(screen.getByRole('button', { name: '덱 추가' }), 'pressIn');
    await advance(100);
    expect(face('덱 추가')).toHaveAnimatedStyle({ opacity: 1 });
    expect(face('덱 추가')).toHaveStyle({ backgroundColor: light.surface });

    await fireEvent(screen.getByRole('button', { name: '덱 추가' }), 'pressOut');
    await advance(100);
    expect(face('덱 추가')).toHaveAnimatedStyle({ opacity: 0 });
  });

  test('켜진 동안은 켜짐 바탕을 그대로 둔다', async () => {
    await renderLight(<IconButton icon={PlusIcon} label="메모 닫기" pressed onPress={() => {}} />);

    expect(screen.getByRole('button', { name: '메모 닫기' })).toHaveStyle({
      backgroundColor: light.text,
    });
  });
});

describe('ListRow 누름', () => {
  test('누르는 동안 행 전체에 --surface 바탕이 나타난다', async () => {
    await renderLight(<ListRow title="휴지통" trailing={{ kind: 'chevron' }} onPress={() => {}} />);

    const row = screen.getByRole('button', { name: '휴지통' });
    await fireEvent(row, 'pressIn');
    await advance(100);

    const layer = screen.getByTestId('list-row-pressed');
    expect(layer).toHaveStyle({ backgroundColor: light.surface });
    expect(layer).toHaveAnimatedStyle({ opacity: 1 });

    await fireEvent(row, 'pressOut');
    await advance(100);
    expect(layer).toHaveAnimatedStyle({ opacity: 0 });
  });

  test('누를 수 없는 행에는 바탕이 없다', async () => {
    await renderLight(<ListRow title="버전" trailing={{ kind: 'value', value: '1.0' }} />);

    expect(screen.queryByTestId('list-row-pressed')).toBeNull();
  });
});

describe('Segmented 선택 바탕', () => {
  const options = [
    { value: 'system', label: '시스템' },
    { value: 'light', label: '라이트' },
    { value: 'dark', label: '다크' },
  ] as const;

  const layout = (name: string, x: number) =>
    fireEvent(screen.getByRole('radio', { name }), 'layout', {
      nativeEvent: { layout: { x, y: 4, width: 64, height: 36 } },
    });

  const renderSegmented = async (value: (typeof options)[number]['value']) => {
    const ui = (v: typeof value) => (
      <ThemeProvider override="light">
        <Segmented label="테마" options={options} value={v} onChange={() => {}} />
      </ThemeProvider>
    );
    const result = await render(ui(value));
    await layout('시스템', 4);
    await layout('라이트', 72);
    await layout('다크', 140);
    await advance(0);
    return (next: typeof value) => result.rerender(ui(next));
  };

  test('다른 칸을 고르면 선택 바탕이 160ms에 걸쳐 새 칸으로 미끄러진다', async () => {
    const select = await renderSegmented('system');
    const thumb = screen.getByTestId('segmented-thumb');
    expect(thumb).toHaveAnimatedStyle({ width: 64, transform: [{ translateX: 4 }] });

    await select('dark');
    await advance(80);
    expect(thumb).not.toHaveAnimatedStyle({ transform: [{ translateX: 140 }] });

    await advance(80);
    expect(thumb).toHaveAnimatedStyle({ transform: [{ translateX: 140 }] });
  });

  test('동작 줄이기가 켜지면 선택 바탕이 미끄러지지 않고 바로 옮겨 간다', async () => {
    mockReducedMotion.current = true;
    const select = await renderSegmented('system');

    await select('dark');
    await advance(0);

    expect(screen.getByTestId('segmented-thumb')).toHaveAnimatedStyle({
      transform: [{ translateX: 140 }],
    });
  });
});

describe('StatusDot 상태 바뀜', () => {
  // reanimated는 색을 옮긴 뒤 rgba 문자열로 준다.
  const rgba = (hex: string) => {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
    return `rgba(${r}, ${g}, ${b}, 1)`;
  };

  test('상태가 바뀌면 점 색이 160ms에 걸쳐 새 색으로 바뀐다', async () => {
    const ui = (state: 'synced' | 'failed') => (
      <ThemeProvider override="light">
        <StatusDot state={state} label="동기화" />
      </ThemeProvider>
    );
    const { rerender } = await render(ui('synced'));
    const dot = screen.getByTestId('status-dot', { includeHiddenElements: true });
    expect(dot).toHaveAnimatedStyle({ backgroundColor: light.success });

    await rerender(ui('failed'));
    await advance(80);
    expect(dot).not.toHaveAnimatedStyle({ backgroundColor: rgba(light.danger) });

    await advance(80);
    expect(dot).toHaveAnimatedStyle({ backgroundColor: rgba(light.danger) });
  });
});

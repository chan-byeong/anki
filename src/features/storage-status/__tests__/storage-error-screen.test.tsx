import { act, render, screen } from '@testing-library/react-native';

import { StorageErrorScreen } from '@/features/storage-status/components/StorageErrorScreen';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { slow } from '@/theme/tokens';

jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual('react-native-safe-area-context/jest/mock').default,
);

const advance = (ms: number) =>
  act(async () => {
    jest.advanceTimersByTime(ms);
  });

const ui = (retrying: boolean) => (
  <ThemeProvider>
    <StorageErrorScreen onRetry={() => {}} retrying={retrying} />
  </ThemeProvider>
);

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

// 다시 시도(State-6): 버튼은 누르자마자 잠그고, 늦을 때만(slow.after 뒤) 기다린다는 글자를 띄운다.
describe('StorageErrorScreen: 다시 시도', () => {
  it('다시 여는 동안 버튼은 바로 잠기고, 300ms 안에는 글자가 그대로다', async () => {
    await render(ui(true));
    expect(screen.getByRole('button', { name: '다시 시도' })).toBeDisabled();
    await advance(slow.after - 1);
    expect(screen.getByRole('button', { name: '다시 시도' })).toBeOnTheScreen();
  });

  it('300ms가 지나면 "다시 여는 중"을 띄운다', async () => {
    await render(ui(true));
    await advance(slow.after);
    expect(screen.getByRole('button', { name: '다시 여는 중' })).toBeDisabled();
  });

  it('빨리 끝나면 기다림 글자를 띄우지 않는다', async () => {
    const view = await render(ui(true));
    await advance(slow.after - 100);
    await view.rerender(ui(false));
    await advance(1000);
    expect(screen.getByRole('button', { name: '다시 시도' })).toBeEnabled();
  });
});

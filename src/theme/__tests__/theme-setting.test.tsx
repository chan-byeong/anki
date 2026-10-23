import { Stack } from 'expo-router';
import { userEvent } from '@testing-library/react-native';
import { act, renderRouter, screen } from 'expo-router/testing-library';

import SettingsScreen from '@/app/settings';
import { createMemoryBacking, createMemoryPort } from '@/storage/memory-port';
import { createStore } from '@/storage/store';
import { StoreProvider } from '@/storage/StoreProvider';
import { createTestClock, createTestIds } from '@/storage/testing/deps';
import type { PreferenceStorage } from '@/theme/theme-preference';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { colors } from '@/theme/tokens';

// 설정 화면에서 테마를 고르는 흐름을 실제 라우터 위에서 돌린다. 기기 설정은 mockScheme으로 바꾼다.
jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual('react-native-safe-area-context/jest/mock').default,
);

let mockScheme: 'light' | 'dark' = 'light';
jest.mock('react-native/Libraries/Utilities/useColorScheme', () => ({
  __esModule: true,
  default: () => mockScheme,
}));

const memoryStorage = (initial: Record<string, string> = {}) => {
  const items = { ...initial };
  const storage: PreferenceStorage = {
    getItemSync: (key) => items[key] ?? null,
    setItem: async (key, value) => {
      items[key] = value;
    },
  };
  return { storage, items };
};

const renderSettings = async (storage: PreferenceStorage) => {
  const store = createStore(createMemoryPort(createMemoryBacking()), {
    now: createTestClock().now,
    newId: createTestIds(),
  });
  const Layout = () => (
    <ThemeProvider storage={storage}>
      <StoreProvider store={store}>
        <Stack screenOptions={{ headerShown: false }} />
      </StoreProvider>
    </ThemeProvider>
  );
  await renderRouter({ _layout: Layout, settings: SettingsScreen }, { initialUrl: '/settings' });
  await act(async () => {});
};

const option = (name: string) => screen.getByRole('radio', { name });

beforeEach(() => {
  mockScheme = 'light';
});

describe('테마 선택', () => {
  test('처음에는 시스템이 선택돼 있고 기기 설정을 따른다', async () => {
    mockScheme = 'dark';
    await renderSettings(memoryStorage().storage);

    expect(option('시스템')).toBeChecked();
    expect(screen.getByText('테마')).toHaveStyle({ color: colors.dark.text });
  });

  test('다크를 고르면 바로 다크로 그리고 선택을 저장한다', async () => {
    const { storage, items } = memoryStorage();
    await renderSettings(storage);
    const user = userEvent.setup();

    await user.press(option('다크'));

    expect(option('다크')).toBeChecked();
    expect(option('시스템')).not.toBeChecked();
    expect(screen.getByText('테마')).toHaveStyle({ color: colors.dark.text });
    expect(items['theme-preference']).toBe('dark');
  });

  test('저장한 선택으로 다시 시작하고, 기기 설정과 달라도 그 선택을 따른다', async () => {
    mockScheme = 'dark';
    await renderSettings(memoryStorage({ 'theme-preference': 'light' }).storage);

    expect(option('라이트')).toBeChecked();
    expect(screen.getByText('테마')).toHaveStyle({ color: colors.light.text });
  });
});

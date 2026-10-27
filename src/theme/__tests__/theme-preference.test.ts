import {
  readThemePreference,
  writeThemePreference,
  type PreferenceStorage,
} from '../theme-preference';

const memoryStorage = (
  initial: Record<string, string> = {},
): PreferenceStorage & {
  items: Record<string, string>;
} => {
  const items = { ...initial };
  return {
    items,
    getItemSync: (key) => items[key] ?? null,
    setItem: async (key, value) => {
      items[key] = value;
    },
  };
};

const broken: PreferenceStorage = {
  getItemSync: () => {
    throw new Error('저장소를 열 수 없다');
  },
  setItem: () => Promise.reject(new Error('저장소를 열 수 없다')),
};

describe('테마 선택 저장', () => {
  test('저장된 선택이 없으면 시스템이다', () => {
    expect(readThemePreference(memoryStorage())).toBe('system');
  });

  test('저장한 선택을 다시 읽는다', async () => {
    const storage = memoryStorage();

    await writeThemePreference(storage, 'dark');

    expect(readThemePreference(storage)).toBe('dark');
  });

  test('알 수 없는 값이 저장돼 있으면 시스템이다', () => {
    expect(readThemePreference(memoryStorage({ 'theme-preference': 'sepia' }))).toBe('system');
  });

  test('저장소를 쓰지 못해도 실패하지 않고, 읽지 못하면 시스템이다', async () => {
    await expect(writeThemePreference(broken, 'light')).resolves.toBeUndefined();
    expect(readThemePreference(broken)).toBe('system');
  });
});

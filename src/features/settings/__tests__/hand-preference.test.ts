import type { PreferenceStorage } from '@/theme/theme-preference';

import { readHandPreference, writeHandPreference } from '../hand-preference';

const memoryStorage = (initial: Record<string, string> = {}): PreferenceStorage => {
  const items = { ...initial };
  return {
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

describe('주로 쓰는 손 저장', () => {
  test('저장된 선택이 없으면 오른손이다', () => {
    expect(readHandPreference(memoryStorage())).toBe('right');
  });

  test('저장한 선택을 다시 읽는다', async () => {
    const storage = memoryStorage();

    await writeHandPreference(storage, 'left');

    expect(readHandPreference(storage)).toBe('left');
  });

  test('알 수 없는 값이 저장돼 있으면 오른손이다', () => {
    expect(readHandPreference(memoryStorage({ hand: 'both' }))).toBe('right');
  });

  test('저장소를 쓰지 못해도 실패하지 않고, 읽지 못하면 오른손이다', async () => {
    await expect(writeHandPreference(broken, 'left')).resolves.toBeUndefined();
    expect(readHandPreference(broken)).toBe('right');
  });
});

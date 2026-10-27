import { kvStore } from '../kv-store.web';

const createFakeLocalStorage = () => {
  const items = new Map<string, string>();
  return {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => {
      items.set(key, value);
    },
  };
};

describe('웹 kvStore', () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');

  afterEach(() => {
    if (original) Object.defineProperty(globalThis, 'localStorage', original);
    else delete (globalThis as { localStorage?: unknown }).localStorage;
  });

  const useLocalStorage = (storage: unknown) =>
    Object.defineProperty(globalThis, 'localStorage', { value: storage, configurable: true });

  it('쓴 값을 동기·비동기로 다시 읽는다', async () => {
    useLocalStorage(createFakeLocalStorage());

    await kvStore.setItem('theme-preference', 'dark');

    expect(kvStore.getItemSync('theme-preference')).toBe('dark');
    await expect(kvStore.getItem('theme-preference')).resolves.toBe('dark');
  });

  it('없는 키는 null이다', async () => {
    useLocalStorage(createFakeLocalStorage());

    expect(kvStore.getItemSync('missing')).toBeNull();
    await expect(kvStore.getItem('missing')).resolves.toBeNull();
  });

  it('localStorage를 못 쓰면 비동기 호출은 거절된다', async () => {
    useLocalStorage({
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    });

    await expect(kvStore.getItem('k')).rejects.toThrow('blocked');
    await expect(kvStore.setItem('k', 'v')).rejects.toThrow('blocked');
  });
});

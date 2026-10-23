import { createLongPressGuide, type GuideStorage } from '../long-press-guide';

// 길게 누르기 안내는 덱 목록에 들어온 처음 3번만 보이고, 닫으면 다시 나오지 않는다.
const memoryStorage = (initial: Record<string, string> = {}): GuideStorage => {
  const values = new Map(Object.entries(initial));
  return {
    getItem: async (key) => values.get(key) ?? null,
    setItem: async (key, value) => {
      values.set(key, value);
    },
  };
};

describe('createLongPressGuide', () => {
  test('덱 목록에 처음 들어온 3번은 보이고 4번째부터는 보이지 않는다', async () => {
    const guide = createLongPressGuide(memoryStorage());

    expect(await guide.visit()).toBe(true);
    expect(await guide.visit()).toBe(true);
    expect(await guide.visit()).toBe(true);
    expect(await guide.visit()).toBe(false);
  });

  test('횟수는 저장소에 남아서 새 안내 객체(앱을 다시 연 상태)도 이어서 센다', async () => {
    const storage = memoryStorage();
    await createLongPressGuide(storage).visit();
    await createLongPressGuide(storage).visit();

    const reopened = createLongPressGuide(storage);

    expect(await reopened.visit()).toBe(true);
    expect(await reopened.visit()).toBe(false);
  });

  test('닫으면 남은 횟수와 상관없이 다시 보이지 않는다', async () => {
    const storage = memoryStorage();
    const guide = createLongPressGuide(storage);
    await guide.visit();

    await guide.dismiss();

    expect(await guide.visit()).toBe(false);
    expect(await createLongPressGuide(storage).visit()).toBe(false);
  });

  test('저장된 값이 숫자가 아니면 처음으로 본다', async () => {
    const guide = createLongPressGuide(memoryStorage({ 'long-press-guide-shown': 'abc' }));

    expect(await guide.visit()).toBe(true);
  });

  test('저장소를 읽거나 쓰지 못하면 안내를 보이지 않는다', async () => {
    const broken: GuideStorage = {
      getItem: async () => {
        throw new Error('읽기 실패');
      },
      setItem: async () => {
        throw new Error('쓰기 실패');
      },
    };
    const guide = createLongPressGuide(broken);

    expect(await guide.visit()).toBe(false);
    await expect(guide.dismiss()).resolves.toBeUndefined();
  });
});

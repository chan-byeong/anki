// 덱 목록의 "길게 눌러 여러 덱 선택" 안내. 기기에만 남는 화면 설정이라 Store(동기화 대상)에 넣지 않는다.
export interface GuideStorage {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
}

export interface LongPressGuide {
  /** 덱 목록에 들어올 때 한 번 부른다. 안내를 보일지 돌려주고, 보이면 횟수를 센다. */
  visit: () => Promise<boolean>;
  /** 안내를 닫는다. 이후로 다시 보이지 않는다. */
  dismiss: () => Promise<void>;
}

const KEY = 'long-press-guide-shown';
export const GUIDE_LIMIT = 3;

export const createLongPressGuide = (storage: GuideStorage): LongPressGuide => {
  const readShown = async (): Promise<number> => {
    const shown = Number(await storage.getItem(KEY));
    return Number.isInteger(shown) && shown > 0 ? shown : 0;
  };

  return {
    visit: async () => {
      try {
        const shown = await readShown();
        if (shown >= GUIDE_LIMIT) return false;
        await storage.setItem(KEY, String(shown + 1));
        return true;
      } catch {
        // 저장소를 못 쓰면 매번 보이게 되므로 안내를 보이지 않는다.
        return false;
      }
    },
    dismiss: async () => {
      try {
        await storage.setItem(KEY, String(GUIDE_LIMIT));
      } catch {
        // 닫는 동작은 화면에서 이미 반영됐다. 기록하지 못하면 다음 방문에 한 번 더 보일 뿐이다.
      }
    },
  };
};

// 테마 선택(시스템·라이트·다크). 기기에만 남는 화면 설정이라 Store(동기화 대상)에 넣지 않는다.
export type ThemePreference = 'system' | 'light' | 'dark';

export interface PreferenceStorage {
  // 첫 화면을 그리기 전에 읽어서, 시스템 테마로 잠깐 그렸다가 바뀌지 않게 한다.
  getItemSync: (key: string) => string | null;
  setItem: (key: string, value: string) => Promise<void>;
}

const KEY = 'theme-preference';

const isPreference = (value: unknown): value is ThemePreference =>
  value === 'system' || value === 'light' || value === 'dark';

/** 저장된 선택. 없거나 읽지 못하면 시스템이다. */
export const readThemePreference = (storage: PreferenceStorage): ThemePreference => {
  try {
    const value = storage.getItemSync(KEY);
    return isPreference(value) ? value : 'system';
  } catch {
    return 'system';
  }
};

export const writeThemePreference = async (
  storage: PreferenceStorage,
  preference: ThemePreference,
): Promise<void> => {
  try {
    await storage.setItem(KEY, preference);
  } catch {
    // 화면에는 이미 반영됐다. 기록하지 못하면 다음 실행에 이전 선택으로 시작할 뿐이다.
  }
};

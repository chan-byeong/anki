import Storage from 'expo-sqlite/kv-store';

// 기기에만 남는 화면 설정(테마, 안내 횟수)을 담는 키-값 저장소. 웹 구현은 kv-store.web.ts.
export interface KvStore {
  getItem: (key: string) => Promise<string | null>;
  getItemSync: (key: string) => string | null;
  setItem: (key: string, value: string) => Promise<void>;
}

export const kvStore: KvStore = Storage;

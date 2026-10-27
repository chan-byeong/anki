import type { KvStore } from './kv-store';

// 웹용. expo-sqlite는 웹에서 쓰지 않으므로(open-app-store.web.ts) localStorage에 둔다.
// 정적 렌더링(Node)처럼 localStorage가 없거나 막혀 있으면 던지고, 호출하는 쪽이 기본값으로 처리한다.
export const kvStore: KvStore = {
  getItem: async (key) => globalThis.localStorage.getItem(key),
  getItemSync: (key) => globalThis.localStorage.getItem(key),
  setItem: async (key, value) => {
    globalThis.localStorage.setItem(key, value);
  },
};

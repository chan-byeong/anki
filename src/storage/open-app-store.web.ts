import * as Crypto from 'expo-crypto';

import { createMemoryBacking, createMemoryPort } from './memory-port';
import { createStore, type Store } from './store';

// 웹용. expo-sqlite의 웹 구현은 wasm과 COEP/COOP 헤더 설정이 필요한 alpha라 아직 쓰지 않는다.
// 메모리 포트에 올리므로 새로고침하면 자료가 사라진다. 웹 저장은 따로 다룬다.
export const openAppStore = async (): Promise<Store> =>
  createStore(createMemoryPort(createMemoryBacking()), {
    now: Date.now,
    newId: Crypto.randomUUID,
  });

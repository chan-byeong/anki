import * as Crypto from 'expo-crypto';

import { migrations } from './schema';
import { openExpoDriver } from './sql/expo-driver';
import { migrate } from './sql/migrate';
import { createSqlitePort } from './sqlite-port';
import { createStore, type Store } from './store';

// 비로그인 사용의 자료는 기기의 이 파일에만 남는다(ADR 0009).
const GUEST_DB = 'guest.db';

// 앱이 쓰는 Store를 연다. 테스트 하네스와 같은 순서로 드라이버 위에 마이그레이션, 포트, Store를 올린다.
export const openAppStore = async (): Promise<Store> => {
  const driver = await openExpoDriver(GUEST_DB);
  await migrate(driver, migrations);
  return createStore(createSqlitePort(driver), { now: Date.now, newId: Crypto.randomUUID });
};

import * as SQLite from 'expo-sqlite';

import { CONNECTION_PRAGMAS, serialize, type SqlDriver } from './driver';

// 기기용 드라이버. Jest에서는 expo-sqlite가 쿼리를 실행하지 못하므로 개발 빌드에서 스모크 확인한다(ADR 0012).
// 트랜잭션은 BEGIN/COMMIT을 직접 보낸다. serialize()가 호출을 한 줄로 세우므로 다른 쿼리가 섞이지 않는다.
export const openExpoDriver = async (name: string): Promise<SqlDriver> => {
  const db = await SQLite.openDatabaseAsync(name);
  await db.execAsync(CONNECTION_PRAGMAS);

  return serialize({
    exec: (sql) => db.execAsync(sql),
    run: async (sql, params = []) => {
      const { changes } = await db.runAsync(sql, params);
      return { changes };
    },
    all: (sql, params = []) => db.getAllAsync(sql, params),
    first: (sql, params = []) => db.getFirstAsync(sql, params),
    begin: () => db.execAsync('BEGIN'),
    commit: () => db.execAsync('COMMIT'),
    rollback: () => db.execAsync('ROLLBACK'),
    close: () => db.closeAsync(),
  });
};

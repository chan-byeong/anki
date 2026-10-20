/// <reference types="node" />
import { DatabaseSync } from 'node:sqlite';

import { CONNECTION_PRAGMAS, serialize, type SqlDriver } from './driver';

// Jest 전용 드라이버(ADR 0012). 앱 코드에서 import하지 않는다.
// node:sqlite는 동기 API라 Promise로 감싼다.
export const openNodeDriver = (path: string): SqlDriver => {
  const db = new DatabaseSync(path);
  db.exec(CONNECTION_PRAGMAS);

  return serialize({
    exec: async (sql) => {
      db.exec(sql);
    },
    run: async (sql, params = []) => {
      const { changes } = db.prepare(sql).run(...params);
      return { changes: Number(changes) };
    },
    all: async <T>(sql: string, params: Parameters<SqlDriver['all']>[1] = []) =>
      db.prepare(sql).all(...params) as T[],
    first: async <T>(sql: string, params: Parameters<SqlDriver['first']>[1] = []) =>
      (db.prepare(sql).get(...params) as T | undefined) ?? null,
    begin: async () => {
      db.exec('BEGIN');
    },
    commit: async () => {
      db.exec('COMMIT');
    },
    rollback: async () => {
      db.exec('ROLLBACK');
    },
    close: async () => {
      db.close();
    },
  });
};

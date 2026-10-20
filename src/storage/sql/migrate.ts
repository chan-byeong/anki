import type { SqlDriver, SqlExecutor } from './driver';

// migrations[i]는 버전 i에서 i + 1로 올리는 단계다. 단계마다 트랜잭션 하나로 묶고,
// 같은 트랜잭션에서 PRAGMA user_version을 올린다. 앱과 Jest가 같은 함수를 쓴다(ADR 0012).
export type Migration = (tx: SqlExecutor) => Promise<void>;

export const migrate = async (driver: SqlDriver, migrations: Migration[]): Promise<void> => {
  const row = await driver.first<{ user_version: number }>('PRAGMA user_version');
  const current = row?.user_version ?? 0;

  if (current > migrations.length) {
    throw new Error(`DB 버전(${current})이 앱이 아는 마지막 버전(${migrations.length})보다 높다.`);
  }

  for (let version = current; version < migrations.length; version += 1) {
    await driver.transaction(async (tx) => {
      await migrations[version](tx);
      await tx.exec(`PRAGMA user_version = ${version + 1}`);
    });
  }
};

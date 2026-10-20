import { createSerialQueue } from '../serial-queue';

// 저장 포트와 SQL 엔진 사이의 얇은 드라이버(ADR 0012). 기기는 expo-sqlite, Jest는 node:sqlite가 구현한다.
// 파라미터는 위치 배열만 받는다. 불리언은 두 엔진이 다르게 다루므로 0/1 정수로 넘긴다.

export type SqlValue = string | number | null | Uint8Array;

export type SqlRunResult = { changes: number };

export interface SqlExecutor {
  exec(sql: string): Promise<void>;
  run(sql: string, params?: SqlValue[]): Promise<SqlRunResult>;
  all<T>(sql: string, params?: SqlValue[]): Promise<T[]>;
  first<T>(sql: string, params?: SqlValue[]): Promise<T | null>;
}

export interface SqlDriver extends SqlExecutor {
  // fn 안에서는 받은 tx로만 쿼리한다. 바깥 드라이버를 부르면 큐를 기다리다 멈춘다.
  transaction<T>(fn: (tx: SqlExecutor) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}

// 엔진별 어댑터가 구현하는 부분. 직렬화는 serialize()가 맡는다.
export interface RawConnection extends SqlExecutor {
  begin(): Promise<void>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
  close(): Promise<void>;
}

// 모든 호출을 한 줄로 세운다. expo-sqlite의 withTransactionAsync는 배타적이지 않아
// 같은 연결의 다른 쿼리가 트랜잭션에 섞일 수 있기 때문이다(ADR 0010).
export const serialize = (conn: RawConnection): SqlDriver => {
  const enqueue = createSerialQueue();

  return {
    exec: (sql) => enqueue(() => conn.exec(sql)),
    run: (sql, params) => enqueue(() => conn.run(sql, params)),
    all: (sql, params) => enqueue(() => conn.all(sql, params)),
    first: (sql, params) => enqueue(() => conn.first(sql, params)),
    transaction: (fn) =>
      enqueue(async () => {
        await conn.begin();
        try {
          const value = await fn(conn);
          await conn.commit();
          return value;
        } catch (error) {
          await conn.rollback();
          throw error;
        }
      }),
    close: () => enqueue(() => conn.close()),
  };
};

// 두 엔진의 외래 키 기본값이 달라서(expo-sqlite 꺼짐, node:sqlite 켜짐) 열 때마다 명시한다.
// journal_mode는 트랜잭션 안에서 바꿀 수 없어 마이그레이션이 아니라 여기서 켠다. 파일에 남는 설정이다.
export const CONNECTION_PRAGMAS = 'PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;';

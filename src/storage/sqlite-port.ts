import type { SqlDriver, SqlExecutor, SqlValue } from './sql/driver';
import type { CardRow, DeckRow, Port, PortTables, ReviewRow, TombstoneRow } from './port';

// SQLite 저장 포트(ADR 0010). 메서드 하나가 SQL 한 문장이고, 직렬화와 PRAGMA는 드라이버가 맡는다.
// 같은 시각의 행도 순서가 정해지도록 정렬에는 항상 id를 덧붙인다.

// 열 목록을 행 타입에서 빠짐없이 뽑는다. 행 타입에 열이 늘면 여기서 타입 오류가 난다.
const columnsOf = <Row>(shape: Record<keyof Row, true>): (keyof Row & string)[] =>
  Object.keys(shape) as (keyof Row & string)[];

const DECK_COLUMNS = columnsOf<DeckRow>({
  id: true,
  name: true,
  language: true,
  created_at: true,
  name_ts: true,
  language_ts: true,
  deleted_at: true,
  deleted_ts: true,
  deleted_by_op: true,
});

const CARD_COLUMNS = columnsOf<CardRow>({
  id: true,
  deck_id: true,
  front: true,
  back: true,
  memo: true,
  image: true,
  created_at: true,
  front_ts: true,
  back_ts: true,
  memo_ts: true,
  image_ts: true,
  deleted_at: true,
  deleted_ts: true,
  deleted_by_op: true,
  hint: true,
  hint_ts: true,
});

const REVIEW_COLUMNS = columnsOf<ReviewRow>({
  id: true,
  card_id: true,
  rating: true,
  hint_used: true,
  study_day: true,
  rated_at: true,
});

const TOMBSTONE_COLUMNS = columnsOf<TombstoneRow>({ id: true, kind: true });

const insertSql = (table: string, columns: string[]): string =>
  `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`;

// INSERT OR REPLACE는 기존 행을 지웠다가 넣어서 외래 키 동작이 일어날 수 있으므로 ON CONFLICT로 고친다.
const upsertSql = (table: string, columns: string[]): string =>
  `${insertSql(table, columns)} ON CONFLICT (id) DO UPDATE SET ${columns
    .filter((column) => column !== 'id')
    .map((column) => `${column} = excluded.${column}`)
    .join(', ')}`;

const valuesOf = <Row>(row: Row, columns: (keyof Row & string)[]): SqlValue[] =>
  columns.map((column) => row[column] as SqlValue);

const DECK_PUT = upsertSql('decks', DECK_COLUMNS);
const CARD_PUT = upsertSql('cards', CARD_COLUMNS);
const REVIEW_APPEND = insertSql('reviews', REVIEW_COLUMNS);
const TOMBSTONE_PUT = upsertSql('tombstones', TOMBSTONE_COLUMNS);

// SQLite에는 불리언이 없어서 hint_used를 0/1로 저장한다.
type StoredReview = Omit<ReviewRow, 'hint_used'> & { hint_used: 0 | 1 };

const fromStoredReview = ({ hint_used, ...rest }: StoredReview): ReviewRow => ({
  ...rest,
  hint_used: hint_used === 1,
});

// 엔진이 돌려준 행 객체를 평범한 객체로 복사한다.
const plain = <Row>(row: Row | null): Row | null => (row === null ? null : { ...row });
const plainAll = <Row>(rows: Row[]): Row[] => rows.map((row) => ({ ...row }));

const tablesOn = (db: SqlExecutor): PortTables => ({
  decks: {
    put: async (row) => {
      await db.run(DECK_PUT, valuesOf(row, DECK_COLUMNS));
    },
    get: async (id) => plain(await db.first<DeckRow>('SELECT * FROM decks WHERE id = ?', [id])),
    listAlive: async () =>
      plainAll(
        await db.all<DeckRow>(
          'SELECT * FROM decks WHERE deleted_at IS NULL ORDER BY created_at, id',
        ),
      ),
    listTrashed: async () =>
      plainAll(
        await db.all<DeckRow>(
          'SELECT * FROM decks WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC, id',
        ),
      ),
    remove: async (id) => {
      await db.run('DELETE FROM decks WHERE id = ?', [id]);
    },
  },
  cards: {
    put: async (row) => {
      await db.run(CARD_PUT, valuesOf(row, CARD_COLUMNS));
    },
    get: async (id) => plain(await db.first<CardRow>('SELECT * FROM cards WHERE id = ?', [id])),
    listAliveByDeck: async (deckId) =>
      plainAll(
        await db.all<CardRow>(
          'SELECT * FROM cards WHERE deck_id = ? AND deleted_at IS NULL ORDER BY created_at, id',
          [deckId],
        ),
      ),
    listTrashed: async () =>
      plainAll(
        await db.all<CardRow>(
          'SELECT * FROM cards WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC, id',
        ),
      ),
    listByDeleteOp: async (opId) =>
      plainAll(
        await db.all<CardRow>(
          'SELECT * FROM cards WHERE deleted_by_op = ? ORDER BY created_at, id',
          [opId],
        ),
      ),
    countByDeleteOps: async (opIds) => {
      const counts: Record<string, number> = Object.fromEntries(opIds.map((opId) => [opId, 0]));
      if (opIds.length === 0) return counts;
      const marks = opIds.map(() => '?').join(', ');
      const rows = await db.all<{ op: string; total: number }>(
        `SELECT deleted_by_op AS op, COUNT(*) AS total FROM cards WHERE deleted_by_op IN (${marks}) GROUP BY deleted_by_op`,
        opIds,
      );
      for (const row of rows) counts[row.op] = row.total;
      return counts;
    },
    remove: async (id) => {
      await db.run('DELETE FROM cards WHERE id = ?', [id]);
    },
    listByDeck: async (deckId) =>
      plainAll(
        await db.all<CardRow>('SELECT * FROM cards WHERE deck_id = ? ORDER BY created_at, id', [
          deckId,
        ]),
      ),
  },
  reviews: {
    append: async (row) => {
      await db.run(
        REVIEW_APPEND,
        valuesOf({ ...row, hint_used: row.hint_used ? 1 : 0 }, REVIEW_COLUMNS),
      );
    },
    get: async (id) => {
      const row = await db.first<StoredReview>('SELECT * FROM reviews WHERE id = ?', [id]);
      return row === null ? null : fromStoredReview(row);
    },
    listByCard: async (cardId) =>
      (
        await db.all<StoredReview>(
          'SELECT * FROM reviews WHERE card_id = ? ORDER BY rated_at, id',
          [cardId],
        )
      ).map(fromStoredReview),
    countByStudyDay: async () =>
      plainAll(
        await db.all<{ study_day: number; count: number }>(
          'SELECT study_day, COUNT(*) AS count FROM reviews GROUP BY study_day ORDER BY study_day',
        ),
      ),
  },
  tombstones: {
    put: async (row) => {
      await db.run(TOMBSTONE_PUT, valuesOf(row, TOMBSTONE_COLUMNS));
    },
    get: async (id) =>
      plain(await db.first<TombstoneRow>('SELECT * FROM tombstones WHERE id = ?', [id])),
  },
});

export const createSqlitePort = (driver: SqlDriver): Port => ({
  ...tablesOn(driver),
  transaction: (fn) => driver.transaction((tx) => fn(tablesOn(tx))),
});

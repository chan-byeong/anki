import type { CardRow, DeckRow, Port, PortTables, ReviewRow, TombstoneRow } from './port';
import { createSerialQueue, type Enqueue } from './serial-queue';

// 메모리 저장 포트(ADR 0010). 테스트용이고, SQLite 포트와 같은 결과를 내도록 맞춘다.
// 스키마의 외래 키(덱 → 카드 RESTRICT, 카드 → 학습 이력 CASCADE, ADR 0014)도 여기서 흉내 낸다.
// 행은 복사해서 넣고 복사해서 꺼낸다. 받은 객체를 고쳐도 저장된 값이 바뀌지 않아야 SQLite와 같다.

export type MemoryBacking = {
  decks: Map<string, DeckRow>;
  cards: Map<string, CardRow>;
  reviews: Map<string, ReviewRow>;
  tombstones: Map<string, TombstoneRow>;
};

export const createMemoryBacking = (): MemoryBacking => ({
  decks: new Map(),
  cards: new Map(),
  reviews: new Map(),
  tombstones: new Map(),
});

const FOREIGN_KEY_FAILED = 'FOREIGN KEY constraint failed';

const copy = <Row>(row: Row | undefined): Row | null => (row === undefined ? null : { ...row });

// SQLite 포트와 같은 순서. 같은 시각이면 id로 정한다.
const byId = (a: { id: string }, b: { id: string }): number =>
  a.id < b.id ? -1 : a.id > b.id ? 1 : 0;

const byCreated = <Row extends { id: string; created_at: number }>(a: Row, b: Row): number =>
  a.created_at - b.created_at || byId(a, b);

const byDeletedDesc = <Row extends { id: string; deleted_at: number | null }>(
  a: Row,
  b: Row,
): number => (b.deleted_at ?? 0) - (a.deleted_at ?? 0) || byId(a, b);

const byRated = (a: ReviewRow, b: ReviewRow): number => a.rated_at - b.rated_at || byId(a, b);

const select = <Row>(
  rows: Map<string, Row>,
  where: (row: Row) => boolean,
  order: (a: Row, b: Row) => number,
): Row[] =>
  [...rows.values()]
    .filter(where)
    .sort(order)
    .map((row) => ({ ...row }));

const tablesOn = (db: MemoryBacking): PortTables => ({
  decks: {
    put: async (row) => {
      db.decks.set(row.id, { ...row });
    },
    get: async (id) => copy(db.decks.get(id)),
    listAlive: async () => select(db.decks, (row) => row.deleted_at === null, byCreated),
    listTrashed: async () => select(db.decks, (row) => row.deleted_at !== null, byDeletedDesc),
    remove: async (id) => {
      if ([...db.cards.values()].some((card) => card.deck_id === id)) {
        throw new Error(FOREIGN_KEY_FAILED);
      }
      db.decks.delete(id);
    },
  },
  cards: {
    put: async (row) => {
      if (!db.decks.has(row.deck_id)) {
        throw new Error(FOREIGN_KEY_FAILED);
      }
      db.cards.set(row.id, { ...row });
    },
    get: async (id) => copy(db.cards.get(id)),
    listAliveByDeck: async (deckId) =>
      select(db.cards, (row) => row.deck_id === deckId && row.deleted_at === null, byCreated),
    listTrashed: async () => select(db.cards, (row) => row.deleted_at !== null, byDeletedDesc),
    listByDeleteOp: async (opId) =>
      select(db.cards, (row) => row.deleted_by_op === opId, byCreated),
    remove: async (id) => {
      db.cards.delete(id);
      for (const review of [...db.reviews.values()]) {
        if (review.card_id === id) {
          db.reviews.delete(review.id);
        }
      }
    },
    listByDeck: async (deckId) => select(db.cards, (row) => row.deck_id === deckId, byCreated),
  },
  reviews: {
    append: async (row) => {
      if (db.reviews.has(row.id)) {
        throw new Error('UNIQUE constraint failed: reviews.id');
      }
      if (!db.cards.has(row.card_id)) {
        throw new Error(FOREIGN_KEY_FAILED);
      }
      db.reviews.set(row.id, { ...row });
    },
    get: async (id) => copy(db.reviews.get(id)),
    listByCard: async (cardId) => select(db.reviews, (row) => row.card_id === cardId, byRated),
    countByStudyDay: async () => {
      const counts = new Map<number, number>();
      for (const { study_day } of db.reviews.values()) {
        counts.set(study_day, (counts.get(study_day) ?? 0) + 1);
      }
      return [...counts]
        .map(([study_day, count]) => ({ study_day, count }))
        .sort((a, b) => a.study_day - b.study_day);
    },
  },
  tombstones: {
    put: async (row) => {
      db.tombstones.set(row.id, { ...row });
    },
    get: async (id) => copy(db.tombstones.get(id)),
  },
});

type AnyMethod = (...args: never[]) => Promise<unknown>;

// 테이블의 메서드마다 큐를 거치게 한다.
const queued = <Table extends Record<string, AnyMethod>>(table: Table, enqueue: Enqueue): Table =>
  Object.fromEntries(
    Object.entries(table).map(([name, method]) => [
      name,
      (...args: never[]) => enqueue(() => method(...args)),
    ]),
  ) as Table;

// Map을 같은 객체로 둔 채 내용만 되돌린다. 하네스가 같은 backing을 다시 쓰기 때문이다.
const restore = <Row>(target: Map<string, Row>, saved: Map<string, Row>): void => {
  target.clear();
  saved.forEach((row, id) => target.set(id, row));
};

export const createMemoryPort = (backing: MemoryBacking): Port => {
  const enqueue = createSerialQueue();
  const direct = tablesOn(backing);

  return {
    decks: queued(direct.decks, enqueue),
    cards: queued(direct.cards, enqueue),
    reviews: queued(direct.reviews, enqueue),
    tombstones: queued(direct.tombstones, enqueue),
    // 저장된 행은 바꾸지 않고 교체만 하므로 Map을 얕게 복사해 두면 충분하다.
    transaction: (fn) =>
      enqueue(async () => {
        const saved = {
          decks: new Map(backing.decks),
          cards: new Map(backing.cards),
          reviews: new Map(backing.reviews),
          tombstones: new Map(backing.tombstones),
        };
        try {
          return await fn(direct);
        } catch (error) {
          restore(backing.decks, saved.decks);
          restore(backing.cards, saved.cards);
          restore(backing.reviews, saved.reviews);
          restore(backing.tombstones, saved.tombstones);
          throw error;
        }
      }),
  };
};

import { studyDayOf } from '@/utils/study-day';

import type { CardRow, DeckRow, Port, PortTables, ReviewRow } from './port';

// 도메인 동작과 규칙을 한 번만 두는 곳(ADR 0010). 동작 하나가 트랜잭션 하나이고,
// 동작마다 now()와 newId()는 필요한 만큼만 한 번씩 부른다. 포트 행의 동기화 메타데이터는 밖으로 내보내지 않는다.

export type StoreDeps = {
  now: () => number;
  newId: () => string;
};

export type Rating = ReviewRow['rating'];

export type Deck = {
  id: string;
  name: string;
  language: string | null;
  createdAt: number;
};

export type Card = {
  id: string;
  deckId: string;
  front: string;
  back: string;
  hint: string | null;
  memo: string | null;
  image: string | null;
  createdAt: number;
};

export type Review = {
  id: string;
  cardId: string;
  rating: Rating;
  hintUsed: boolean;
  studyDay: number;
  ratedAt: number;
};

export type ReviewDayCount = { studyDay: number; count: number };

export type RatingCount = { rating: Rating; hintUsed: boolean; count: number };

export type CardWithHistory = { card: Card; history: Review[] };

export type Trash = {
  /** cardCount는 덱과 같은 작업으로 함께 삭제된 카드 수다. 먼저 따로 지운 카드는 세지 않는다. */
  decks: (Deck & { deletedAt: number; cardCount: number })[];
  /** 따로 휴지통에 넣은 카드. 덱이 휴지통에 있어도 나온다. 덱과 함께 지운 카드는 덱과 함께 다룬다(ADR 0018). */
  cards: (Card & { deletedAt: number })[];
};

export type CreateDeckInput = { name: string; language?: string | null };

export type CreateCardInput = {
  front: string;
  back: string;
  hint?: string | null;
  memo?: string | null;
  image?: string | null;
};

/** undefined인 필드는 바꾸지 않는다. null은 값을 지운다. */
export type DeckPatch = { name?: string; language?: string | null };
export type CardPatch = {
  front?: string;
  back?: string;
  hint?: string | null;
  memo?: string | null;
  image?: string | null;
};

export type RateInput = {
  /** 호출하는 쪽이 평가 한 번마다 만드는 UUID v4. 다시 시도할 때는 같은 값을 넘긴다. */
  id: string;
  rating: Rating;
  hintUsed: boolean;
};

/**
 * 코드 하나가 원인 하나에 대응한다. 대상은 동작이 인자로 받은 ID가 가리키는 덱이나 카드다.
 * - not_found: 대상이 없다.
 * - trashed: 대상이 휴지통에 있다.
 * - not_trashed: 대상이 휴지통에 없다(복구·영구 삭제).
 * - deck_trashed: 대상 카드는 괜찮지만 그 카드의 덱이 휴지통에 있다. 덱을 먼저 복구해야 한다.
 * - invalid: 입력 값이 잘못됐다.
 * - conflict: 이미 쓰인 평가 ID로 다른 내용의 평가가 왔다.
 */
export type StoreErrorCode =
  'not_found' | 'trashed' | 'not_trashed' | 'deck_trashed' | 'invalid' | 'conflict';

/** Store가 거부한 요청. 화면은 code로 분기한다. */
export class StoreError extends Error {
  constructor(
    readonly code: StoreErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'StoreError';
  }
}

/**
 * 카드는 카드와 그 덱이 모두 휴지통에 없을 때 살아 있다.
 * 동기화를 거치면 휴지통에 있는 덱에 휴지통에 없는 카드가 생길 수 있어서(ADR 0011), 카드의 삭제 표시만으로는 판단하지 않는다.
 */
export interface Store {
  // 덱
  createDeck(input: CreateDeckInput): Promise<Deck>;
  listDecks(): Promise<Deck[]>;
  /** 살아 있는 덱만. 휴지통의 덱은 listTrash로 본다. */
  getDeck(deckId: string): Promise<Deck | null>;
  updateDeck(deckId: string, patch: DeckPatch): Promise<Deck>;
  /** 덱과 그 시점에 휴지통에 없는 카드에 같은 op ID를 남긴다(ADR 0011). */
  trashDeck(deckId: string): Promise<void>;

  // 카드
  createCard(deckId: string, input: CreateCardInput): Promise<Card>;
  /** 살아 있는 카드만. */
  getCard(cardId: string): Promise<Card | null>;
  /** 덱이 없거나 휴지통에 있으면 거부한다. 빈 덱과 구분하기 위해서다. */
  listCards(deckId: string): Promise<Card[]>;
  /**
   * 덱의 살아 있는 카드를 만든 순서대로, 카드마다 학습 이력(평가 시각 순서)과 함께 한 트랜잭션에서 읽는다.
   * 이력이 없는 카드의 history는 빈 배열이다. 복습일이나 대기열은 계산하지 않는다(ADR 0010).
   * 덱이 없거나 휴지통에 있으면 거부한다.
   */
  listCardsWithHistory(deckId: string): Promise<CardWithHistory[]>;
  /** 살아 있는 덱마다 살아 있는 카드 수(덱 목록의 "320장"). 카드가 없는 덱은 0이다. */
  countCardsByDeck(): Promise<Record<string, number>>;
  updateCard(cardId: string, patch: CardPatch): Promise<Card>;
  trashCard(cardId: string): Promise<void>;

  // 휴지통
  listTrash(): Promise<Trash>;
  /** 휴지통 목록의 항목 수(덱 + 따로 지운 카드). listTrash와 같은 기준이다. */
  countTrash(): Promise<number>;
  /** 덱과 같은 작업으로 삭제된 카드만 되살린다. 따로 휴지통에 넣은 카드는 남는다. */
  restoreDeck(deckId: string): Promise<void>;
  /** 덱이 휴지통에 있으면 deck_trashed로 거부한다. 덱을 먼저 복구해야 한다. */
  restoreCard(cardId: string): Promise<void>;
  /**
   * 덱의 카드를 모두 지운 뒤 덱을 지우고, 지운 행마다 톰스톤을 남긴다(ADR 0014).
   * 그 덱에서 먼저 따로 지운 카드도 함께 지워진다.
   */
  deleteDeckPermanently(deckId: string): Promise<void>;
  /**
   * 학습 이력은 외래 키 CASCADE로 함께 지워진다.
   * 덱과 함께 지운 카드는 deck_trashed로 거부한다. 따로 지우면 덱 복구 때 빠지기 때문이다.
   * 먼저 따로 지운 카드는 덱이 휴지통에 있어도 지울 수 있다(ADR 0018).
   */
  deleteCardPermanently(cardId: string): Promise<void>;
  /** 휴지통의 덱(그 카드 전부)과 따로 지운 카드를 한 번에 영구 삭제한다. 지운 행마다 톰스톤을 남긴다. */
  emptyTrash(): Promise<void>;

  // 복습
  /**
   * 평가 한 건을 학습 이력에 추가한다. 학습일은 평가한 시각의 기기 날짜다.
   * 같은 ID로 같은 내용을 다시 보내면 새로 쓰지 않고 처음 기록한 평가를 돌려준다(두 번 눌림·재시도).
   * 같은 ID로 내용이 다르면 conflict로 거부한다.
   */
  rateCard(cardId: string, input: RateInput): Promise<Review>;
  /**
   * 학습일별 평가 횟수를 학습일 순서로. 휴지통에 있는 카드와 덱의 이력도 센다(영구 삭제하면 이력과 함께 사라진다).
   * 연속 복습일 같은 통계는 `features/stats`가 이 값으로 계산한다(ADR 0010).
   */
  countReviewsByDay(): Promise<ReviewDayCount[]>;
  /**
   * 학습일별로 평가한 서로 다른 카드 수를 학습일 순서로. 같은 날 재등장으로 여러 번 평가한 카드는 하나로 센다.
   * 휴지통 기준은 countReviewsByDay와 같다. 복습 달력이 이 값으로 진하기를 정한다.
   */
  countReviewedCardsByDay(): Promise<ReviewDayCount[]>;
  /**
   * 평가와 힌트 사용 여부 조합별 평가 횟수. 원본 평가 그대로이고, 힌트를 쓴 앎을 어떻게 셀지는 features/stats가 정한다.
   * 휴지통 기준은 countReviewsByDay와 같다. 순서는 정하지 않는다.
   */
  countReviewsByRating(): Promise<RatingCount[]>;
  /** 카드가 살아 있지 않으면 거부한다. getCard와 같은 기준이다. */
  listReviewHistory(cardId: string): Promise<Review[]>;
}

const toDeck = (row: DeckRow): Deck => ({
  id: row.id,
  name: row.name,
  language: row.language,
  createdAt: row.created_at,
});

const toCard = (row: CardRow): Card => ({
  id: row.id,
  deckId: row.deck_id,
  front: row.front,
  back: row.back,
  hint: row.hint,
  memo: row.memo,
  image: row.image,
  createdAt: row.created_at,
});

const toReview = (row: ReviewRow): Review => ({
  id: row.id,
  cardId: row.card_id,
  rating: row.rating,
  hintUsed: row.hint_used,
  studyDay: row.study_day,
  ratedAt: row.rated_at,
});

// <field>_ts 열이 짝으로 있는 필드만. 수정 시각이 없는 열을 넘기면 타입 오류가 난다.
type TrackedField<Row> = {
  [K in keyof Row & string]: `${K}_ts` extends keyof Row ? K : never;
}[keyof Row & string];

// 값이 실제로 바뀐 필드와 그 <field>_ts만 고친다(ADR 0011).
// 바뀐 필드가 없으면 받은 row를 그대로 돌려주므로, 호출하는 쪽은 같은 객체인지로 쓰기를 건너뛴다.
const withChanges = <Row extends Record<string, unknown>>(
  row: Row,
  patch: Partial<Pick<Row, TrackedField<Row>>>,
  fields: readonly TrackedField<Row>[],
  now: number,
): Row => {
  const next: Record<string, unknown> = { ...row };
  let changed = false;
  for (const field of fields) {
    const value = patch[field];
    if (value !== undefined && value !== row[field]) {
      next[field] = value;
      next[`${field}_ts`] = now;
      changed = true;
    }
  }
  return changed ? (next as Row) : row;
};

const trashMark = (now: number, opId: string) => ({
  deleted_at: now,
  deleted_ts: now,
  deleted_by_op: opId,
});

const aliveMark = (now: number) => ({ deleted_at: null, deleted_ts: now, deleted_by_op: null });

const requireText = (value: string | undefined, field: string): void => {
  if (value !== undefined && value.trim() === '') {
    throw new StoreError('invalid', `${field}이(가) 비어 있다.`);
  }
};

const RATINGS: readonly Rating[] = ['know', 'unsure', 'dont'];

// SQLite는 CHECK 제약으로 막지만 메모리 포트는 막지 못하므로, 두 포트가 같게 Store에서 거부한다.
const requireRateInput = (input: RateInput): void => {
  if (typeof input.id !== 'string' || input.id === '') {
    throw new StoreError('invalid', '평가 ID가 비어 있다.');
  }
  if (!RATINGS.includes(input.rating) || typeof input.hintUsed !== 'boolean') {
    throw new StoreError('invalid', `평가 값이 잘못됐다(${String(input.rating)}).`);
  }
};

const isSameRating = (row: ReviewRow, cardId: string, input: RateInput): boolean =>
  row.card_id === cardId && row.rating === input.rating && row.hint_used === input.hintUsed;

const isAlive = (row: DeckRow | CardRow): boolean => row.deleted_at === null;

const requireAlive = (row: DeckRow | CardRow): void => {
  if (!isAlive(row)) throw new StoreError('trashed', `휴지통에 있다(${row.id}).`);
};

const requireTrashed = (row: DeckRow | CardRow): void => {
  if (isAlive(row)) throw new StoreError('not_trashed', `휴지통에 없다(${row.id}).`);
};

const findDeck = async (tx: PortTables, deckId: string): Promise<DeckRow> => {
  const row = await tx.decks.get(deckId);
  if (row === null) throw new StoreError('not_found', `덱(${deckId})이 없다.`);
  return row;
};

const findCard = async (tx: PortTables, cardId: string): Promise<CardRow> => {
  const row = await tx.cards.get(cardId);
  if (row === null) throw new StoreError('not_found', `카드(${cardId})가 없다.`);
  return row;
};

const findAliveDeck = async (tx: PortTables, deckId: string): Promise<DeckRow> => {
  const row = await findDeck(tx, deckId);
  requireAlive(row);
  return row;
};

// 카드의 덱이 휴지통에 있으면 deck_trashed. 카드 자신의 상태와 원인을 구분한다.
const requireDeckOfCardAlive = async (tx: PortTables, card: CardRow): Promise<void> => {
  const deck = await findDeck(tx, card.deck_id);
  if (!isAlive(deck)) {
    throw new StoreError('deck_trashed', `카드(${card.id})의 덱이 휴지통에 있다.`);
  }
};

// 카드와 덱이 모두 휴지통에 없어야 살아 있다(Store 인터페이스 참고).
const findAliveCard = async (tx: PortTables, cardId: string): Promise<CardRow> => {
  const row = await findCard(tx, cardId);
  requireAlive(row);
  await requireDeckOfCardAlive(tx, row);
  return row;
};

// 덱과 같은 작업으로 지운 카드면 deck_trashed. 따로 지운 카드는 덱이 휴지통에 있어도 통과한다(ADR 0018).
const requireNotTrashedWithDeck = async (tx: PortTables, card: CardRow): Promise<void> => {
  const deck = await findDeck(tx, card.deck_id);
  if (!isAlive(deck) && deck.deleted_by_op === card.deleted_by_op) {
    throw new StoreError('deck_trashed', `카드(${card.id})는 덱과 함께 휴지통에 있다.`);
  }
};

// 영구 삭제는 행을 지우고 톰스톤을 남긴다. 덱은 카드를 먼저 지워야 외래 키를 지킨다(ADR 0014).
const removeCard = async (tx: PortTables, cardId: string): Promise<void> => {
  await tx.cards.remove(cardId);
  await tx.tombstones.put({ id: cardId, kind: 'card' });
};

const removeDeckWithCards = async (tx: PortTables, deckId: string): Promise<void> => {
  for (const card of await tx.cards.listByDeck(deckId)) {
    await removeCard(tx, card.id);
  }
  await tx.decks.remove(deckId);
  await tx.tombstones.put({ id: deckId, kind: 'deck' });
};

// listTrashed가 살아 있는 행을 돌려줬다면 포트나 데이터가 깨진 것이므로 숨기지 않고 던진다.
const toTrashed = <Row extends DeckRow | CardRow, Item>(row: Row, toItem: (row: Row) => Item) => {
  if (row.deleted_at === null) {
    throw new Error(`휴지통 목록에 살아 있는 행이 있다(${row.id}).`);
  }
  return { ...toItem(row), deletedAt: row.deleted_at };
};

// 휴지통의 카드 중 덱과 같은 작업으로 지워지지 않은 것. 덱이 휴지통에 있어도 먼저 따로 지운 카드는 남는다(ADR 0018).
// 작업 ID는 작업마다 새로 만들므로 덱 ID를 함께 볼 필요가 없다.
const listSeparatelyTrashedCards = async (
  tx: PortTables,
  trashedDecks: DeckRow[],
): Promise<CardRow[]> => {
  const deckOpIds = new Set(trashedDecks.map((deck) => deck.deleted_by_op));
  return (await tx.cards.listTrashed()).filter((card) => !deckOpIds.has(card.deleted_by_op));
};

export const createStore = (port: Port, deps: StoreDeps): Store => ({
  // 덱
  async createDeck(input) {
    requireText(input.name, '덱 이름');
    return port.transaction(async (tx) => {
      const now = deps.now();
      const row: DeckRow = {
        id: deps.newId(),
        name: input.name,
        language: input.language ?? null,
        created_at: now,
        name_ts: now,
        language_ts: now,
        ...aliveMark(now),
      };
      await tx.decks.put(row);
      return toDeck(row);
    });
  },

  async listDecks() {
    return (await port.decks.listAlive()).map(toDeck);
  },

  async getDeck(deckId) {
    const row = await port.decks.get(deckId);
    return row !== null && isAlive(row) ? toDeck(row) : null;
  },

  async updateDeck(deckId, patch) {
    requireText(patch.name, '덱 이름');
    return port.transaction(async (tx) => {
      const row = await findAliveDeck(tx, deckId);
      const next = withChanges(row, patch, ['name', 'language'], deps.now());
      if (next !== row) await tx.decks.put(next);
      return toDeck(next);
    });
  },

  async trashDeck(deckId) {
    await port.transaction(async (tx) => {
      const row = await findAliveDeck(tx, deckId);
      const mark = trashMark(deps.now(), deps.newId());
      for (const card of await tx.cards.listAliveByDeck(deckId)) {
        await tx.cards.put({ ...card, ...mark });
      }
      await tx.decks.put({ ...row, ...mark });
    });
  },

  // 카드
  async createCard(deckId, input) {
    requireText(input.front, '앞면');
    requireText(input.back, '뒷면');
    return port.transaction(async (tx) => {
      await findAliveDeck(tx, deckId);
      const now = deps.now();
      const row: CardRow = {
        id: deps.newId(),
        deck_id: deckId,
        front: input.front,
        back: input.back,
        hint: input.hint ?? null,
        memo: input.memo ?? null,
        image: input.image ?? null,
        created_at: now,
        front_ts: now,
        back_ts: now,
        hint_ts: now,
        memo_ts: now,
        image_ts: now,
        ...aliveMark(now),
      };
      await tx.cards.put(row);
      return toCard(row);
    });
  },

  async getCard(cardId) {
    return port.transaction(async (tx) => {
      const row = await tx.cards.get(cardId);
      if (row === null || !isAlive(row)) return null;
      const deck = await tx.decks.get(row.deck_id);
      return deck !== null && isAlive(deck) ? toCard(row) : null;
    });
  },

  async listCards(deckId) {
    return port.transaction(async (tx) => {
      await findAliveDeck(tx, deckId);
      return (await tx.cards.listAliveByDeck(deckId)).map(toCard);
    });
  },

  async listCardsWithHistory(deckId) {
    const cardWithHistory: CardWithHistory[] = [];
    await port.transaction(async (tx) => {
      await findAliveDeck(tx, deckId);
      const liveCards = (await tx.cards.listAliveByDeck(deckId)).map(toCard);
      for (const card of liveCards) {
        const reviews = (await tx.reviews.listByCard(card.id)).map(toReview);
        cardWithHistory.push({ card, history: reviews });
      }
    });
    return cardWithHistory;
  },

  async updateCard(cardId, patch) {
    requireText(patch.front, '앞면');
    requireText(patch.back, '뒷면');
    return port.transaction(async (tx) => {
      const row = await findAliveCard(tx, cardId);
      const next = withChanges(row, patch, ['front', 'back', 'hint', 'memo', 'image'], deps.now());
      if (next !== row) await tx.cards.put(next);
      return toCard(next);
    });
  },

  async trashCard(cardId) {
    await port.transaction(async (tx) => {
      const row = await findAliveCard(tx, cardId);
      await tx.cards.put({ ...row, ...trashMark(deps.now(), deps.newId()) });
    });
  },

  // 휴지통
  async listTrash() {
    return port.transaction(async (tx) => {
      const decks = await tx.decks.listTrashed();
      const opIds = decks.flatMap((row) => (row.deleted_by_op === null ? [] : [row.deleted_by_op]));
      const counts = await tx.cards.countByDeleteOps(opIds);
      const trashedDecks = decks.map((row) => ({
        ...toTrashed(row, toDeck),
        cardCount: row.deleted_by_op === null ? 0 : (counts[row.deleted_by_op] ?? 0),
      }));
      const cards = await listSeparatelyTrashedCards(tx, decks);
      return {
        decks: trashedDecks,
        cards: cards.map((row) => toTrashed(row, toCard)),
      };
    });
  },

  async countCardsByDeck() {
    return port.transaction(async (tx) => {
      const decks = await tx.decks.listAlive();
      return tx.cards.countAliveByDecks(decks.map(({ id }) => id));
    });
  },

  async countTrash() {
    return port.transaction(async (tx) => {
      const decks = await tx.decks.listTrashed();
      const cards = await listSeparatelyTrashedCards(tx, decks);
      return decks.length + cards.length;
    });
  },

  async restoreDeck(deckId) {
    await port.transaction(async (tx) => {
      const row = await findDeck(tx, deckId);
      requireTrashed(row);
      const mark = aliveMark(deps.now());
      await tx.decks.put({ ...row, ...mark });
      if (row.deleted_by_op !== null) {
        for (const card of await tx.cards.listByDeleteOp(row.deleted_by_op)) {
          await tx.cards.put({ ...card, ...mark });
        }
      }
    });
  },

  async restoreCard(cardId) {
    await port.transaction(async (tx) => {
      const row = await findCard(tx, cardId);
      requireTrashed(row);
      await requireDeckOfCardAlive(tx, row);
      await tx.cards.put({ ...row, ...aliveMark(deps.now()) });
    });
  },

  async deleteDeckPermanently(deckId) {
    await port.transaction(async (tx) => {
      requireTrashed(await findDeck(tx, deckId));
      await removeDeckWithCards(tx, deckId);
    });
  },

  async deleteCardPermanently(cardId) {
    await port.transaction(async (tx) => {
      const row = await findCard(tx, cardId);
      requireTrashed(row);
      await requireNotTrashedWithDeck(tx, row);
      await removeCard(tx, cardId);
    });
  },

  async emptyTrash() {
    await port.transaction(async (tx) => {
      for (const deck of await tx.decks.listTrashed()) {
        await removeDeckWithCards(tx, deck.id);
      }
      // 덱을 지운 뒤 남은 휴지통 카드는 살아 있는 덱에서 따로 지운 것뿐이다.
      for (const card of await tx.cards.listTrashed()) {
        await removeCard(tx, card.id);
      }
    });
  },

  // 복습
  async rateCard(cardId, input) {
    requireRateInput(input);
    return port.transaction(async (tx) => {
      // 이미 기록된 요청이면 카드 상태와 상관없이 처음 결과를 돌려준다. 재시도가 같은 답을 받아야 하기 때문이다.
      const existing = await tx.reviews.get(input.id);
      if (existing !== null) {
        if (!isSameRating(existing, cardId, input)) {
          throw new StoreError('conflict', `평가 ID(${input.id})가 다른 평가에 쓰였다.`);
        }
        return toReview(existing);
      }
      await findAliveCard(tx, cardId);
      const now = deps.now();
      const row: ReviewRow = {
        id: input.id,
        card_id: cardId,
        rating: input.rating,
        hint_used: input.hintUsed,
        study_day: studyDayOf(now),
        rated_at: now,
      };
      await tx.reviews.append(row);
      return toReview(row);
    });
  },

  async countReviewsByDay() {
    return (await port.reviews.countByStudyDay()).map(({ study_day, count }) => ({
      studyDay: study_day,
      count,
    }));
  },

  async countReviewedCardsByDay() {
    return (await port.reviews.countCardsByStudyDay()).map(({ study_day, count }) => ({
      studyDay: study_day,
      count,
    }));
  },

  async countReviewsByRating() {
    return (await port.reviews.countByRating()).map(({ rating, hint_used, count }) => ({
      rating,
      hintUsed: hint_used,
      count,
    }));
  },

  async listReviewHistory(cardId) {
    return port.transaction(async (tx) => {
      await findAliveCard(tx, cardId);
      return (await tx.reviews.listByCard(cardId)).map(toReview);
    });
  },
});

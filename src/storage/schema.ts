import type { Migration } from './sql/migrate';

// SQLite 스키마(ADR 0011). 열은 port.ts의 행 타입과 이름·순서를 맞춘다.
// 불리언은 0/1 INTEGER로, 시각은 밀리초 INTEGER로 저장한다. 이미 배포한 단계는 고치지 않고 뒤에 더한다.

const v1: Migration = async (tx) => {
  await tx.exec(`
    CREATE TABLE decks (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      language TEXT,
      created_at INTEGER NOT NULL,
      name_ts INTEGER NOT NULL,
      language_ts INTEGER NOT NULL,
      deleted_at INTEGER,
      deleted_ts INTEGER NOT NULL,
      deleted_by_op TEXT
    ) STRICT;

    -- 휴지통 이동은 UPDATE라 CASCADE가 필요 없다. 덱을 영구 삭제할 때는 Store가 카드를 먼저 지운다.
    CREATE TABLE cards (
      id TEXT PRIMARY KEY,
      deck_id TEXT NOT NULL REFERENCES decks (id),
      front TEXT NOT NULL,
      back TEXT NOT NULL,
      memo TEXT,
      image TEXT,
      created_at INTEGER NOT NULL,
      front_ts INTEGER NOT NULL,
      back_ts INTEGER NOT NULL,
      memo_ts INTEGER NOT NULL,
      image_ts INTEGER NOT NULL,
      deleted_at INTEGER,
      deleted_ts INTEGER NOT NULL,
      deleted_by_op TEXT
    ) STRICT;

    -- 카드를 영구 삭제하면 학습 이력도 함께 지워진다. CASCADE는 여기에만 쓴다.
    CREATE TABLE reviews (
      id TEXT PRIMARY KEY,
      card_id TEXT NOT NULL REFERENCES cards (id) ON DELETE CASCADE,
      rating TEXT NOT NULL CHECK (rating IN ('know', 'unsure', 'dont')),
      hint_used INTEGER NOT NULL CHECK (hint_used IN (0, 1)),
      study_day INTEGER NOT NULL,
      rated_at INTEGER NOT NULL
    ) STRICT;

    -- 지워진 행을 가리키므로 외래 키를 두지 않는다.
    CREATE TABLE tombstones (
      id TEXT PRIMARY KEY,
      kind TEXT NOT NULL CHECK (kind IN ('card', 'deck'))
    ) STRICT;

    -- 부분 인덱스는 쿼리에도 deleted_at IS NULL이 그대로 있어야 쓰인다.
    CREATE INDEX decks_alive ON decks (created_at) WHERE deleted_at IS NULL;
    CREATE INDEX cards_alive_by_deck ON cards (deck_id, created_at) WHERE deleted_at IS NULL;
    -- listByDeck과, 덱을 지울 때 남은 카드가 있는지 보는 외래 키 검사가 쓴다.
    CREATE INDEX cards_by_deck ON cards (deck_id, created_at);
    CREATE INDEX cards_by_delete_op ON cards (deleted_by_op) WHERE deleted_by_op IS NOT NULL;
    CREATE INDEX reviews_by_card ON reviews (card_id, rated_at);
  `);
};

export const migrations: Migration[] = [v1];

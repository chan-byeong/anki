// 행 단위 저장 포트(ADR 0010). 테이블별 타입이 있는 메서드와 transaction만 두고 도메인 규칙은 모른다.
// 행 모양은 ADR 0011을 따르고, 열 이름은 SQLite 열과 같은 snake_case로 쓴다.

export type DeckRow = {
  /** 클라이언트에서 생성한 UUID v4 문자열. */
  readonly id: string;
  name: string;
  /** 기본 발음 언어. 없으면 null. */
  language: string | null;
  /** 덱을 만든 시각(밀리초 정수). 목록 정렬에 쓴다. */
  readonly created_at: number;
  /** 각 필드가 마지막으로 변경된 시각(밀리초 정수). */
  name_ts: number;
  language_ts: number;
  /** 휴지통에 들어간 시각. null이면 살아 있는 덱. */
  deleted_at: number | null;
  /** 복구를 포함해 휴지통 상태가 마지막으로 변경된 시각(밀리초 정수). */
  deleted_ts: number;
  /** 함께 삭제된 행을 묶는 작업 ID. 삭제 표시가 없으면 null. */
  deleted_by_op: string | null;
};

export type CardRow = {
  /** 클라이언트에서 생성한 UUID v4 문자열. */
  readonly id: string;
  readonly deck_id: string;
  front: string;
  back: string;
  memo: string | null;
  image: string | null;
  /** 카드를 만든 시각(밀리초 정수). 덱 안의 정렬에 쓴다. */
  readonly created_at: number;
  /** 각 필드가 마지막으로 변경된 시각(밀리초 정수). */
  front_ts: number;
  back_ts: number;
  memo_ts: number;
  image_ts: number;
  /** 휴지통에 들어간 시각. null이면 살아 있는 카드. */
  deleted_at: number | null;
  /** 복구를 포함해 휴지통 상태가 마지막으로 변경된 시각(밀리초 정수). */
  deleted_ts: number;
  /** 함께 삭제된 행을 묶는 작업 ID. 삭제 표시가 없으면 null. */
  deleted_by_op: string | null;
};

/** 학습 이력 한 건. 추가만 하는 데이터라 모든 필드가 바뀌지 않는다. */
export type ReviewRow = {
  /** 클라이언트에서 생성한 UUID v4 문자열. */
  readonly id: string;
  readonly card_id: string;
  readonly rating: 'know' | 'unsure' | 'dont';
  readonly hint_used: boolean;
  /** 평가한 날의 기기 날짜를 1970-01-01부터 센 일수(ADR 0013). */
  readonly study_day: number;
  /** 평가한 시각(밀리초 정수). */
  readonly rated_at: number;
};

/** 영구 삭제한 행의 ID. 이후 들어오는 수정으로 되살리지 않는 데 쓴다. */
export type TombstoneRow = {
  /** 지워진 덱 또는 카드의 ID. */
  readonly id: string;
  readonly kind: 'card' | 'deck';
};

/** transaction 안팎에서 같은 모양으로 쓰는 테이블 메서드. */
export interface PortTables {
  decks: {
    /** 행 전체를 upsert한다. 동기화 엔진이 받은 행을 넣을 때도 쓴다. */
    put(row: DeckRow): Promise<void>;
    /** 삭제 표시와 상관없이 ID로 찾는다. 없으면 null. */
    get(id: string): Promise<DeckRow | null>;
    /** 삭제 표시가 없는 덱을 created_at 오름차순으로. */
    listAlive(): Promise<DeckRow[]>;
    /** 휴지통에 있는 덱을 deleted_at 내림차순으로. */
    listTrashed(): Promise<DeckRow[]>;
    /** 영구 삭제. 행을 실제로 지운다. 톰스톤은 Store가 따로 남긴다. */
    remove(id: string): Promise<void>;
  };
  cards: {
    put(row: CardRow): Promise<void>;
    get(id: string): Promise<CardRow | null>;
    /** 덱에 속한 살아 있는 카드를 created_at 오름차순으로. */
    listAliveByDeck(deckId: string): Promise<CardRow[]>;
    /** 덱에서 삭제 표시가 없고 학습 이력이 없는 카드를 created_at 오름차순으로. */
    listUnreviewedAliveByDeck(deckId: string): Promise<CardRow[]>;
    /** 삭제 표시가 없고 학습 이력이 없는 카드를 덱별로 센다. 카드가 없는 덱은 빠진다. */
    countUnreviewedAliveByDeck(): Promise<{ deck_id: string; count: number }[]>;
    /** 휴지통에 있는 카드를 deleted_at 내림차순으로. 덱과 함께 삭제된 카드도 포함한다. */
    listTrashed(): Promise<CardRow[]>;
    /** 같은 작업으로 함께 삭제된 카드. 덱을 복구할 때 되살릴 카드를 찾는 데 쓴다. */
    listByDeleteOp(opId: string): Promise<CardRow[]>;
    /** 영구 삭제. 학습 이력은 외래 키 CASCADE로 함께 지워진다. */
    remove(id: string): Promise<void>;
    /** 삭제 표시와 상관없이 덱의 모든 카드를 created_at 오름차순으로. 덱을 영구 삭제할 때 쓴다(ADR 0014). */
    listByDeck(deckId: string): Promise<CardRow[]>;
  };
  reviews: {
    /** 한 건을 추가한다. 이미 있는 행은 고치지 않고, 같은 ID가 있으면 실패한다. */
    append(row: ReviewRow): Promise<void>;
    /** ID로 찾는다. 없으면 null. 같은 평가 요청이 다시 왔는지 확인하는 데 쓴다. */
    get(id: string): Promise<ReviewRow | null>;
    /** 카드의 학습 이력을 rated_at 오름차순으로. 일정 계산은 스스로 정렬하므로 이 순서에 의존하지 않는다(ADR 0015). */
    listByCard(cardId: string): Promise<ReviewRow[]>;
  };
  tombstones: {
    /** 같은 ID를 다시 받아도 한 행으로 남는다. */
    put(row: TombstoneRow): Promise<void>;
    get(id: string): Promise<TombstoneRow | null>;
  };
}

export interface Port extends PortTables {
  /**
   * fn 안의 호출을 한 트랜잭션으로 묶는다. fn이 throw하면 모두 되돌린다.
   * 포트는 모든 호출을 내부 큐로 직렬화하므로(ADR 0010), fn 안에서는 반드시 tx를 쓴다.
   * 바깥 Port를 부르면 큐가 transaction이 끝나기를 기다리며 멈춘다.
   */
  transaction<T>(fn: (tx: PortTables) => Promise<T>): Promise<T>;
}

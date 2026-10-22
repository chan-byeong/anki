import type { Port } from './port';
import type { Rating, Store } from './store';
import type { Harness } from './testing/harness';

// Store 계약 스위트(ADR 0012). 메모리 포트와 SQLite 포트 위의 Store에 그대로 돌린다.
// Store에 작업을 요청하고 공개 조회로 읽어서 약속한 결과인지 확인한다.
// 이 파일은 Jest testMatch에 걸리지 않도록 __tests__ 밖에 두고 *.test.ts로 이름 짓지 않는다.
export const describeStoreContract = (
  name: string,
  makeHarness: () => Harness<Store, Port>,
): void => {
  describe(`Store 계약: ${name}`, () => {
    let harness: Harness<Store, Port>;

    beforeEach(() => {
      harness = makeHarness();
    });

    afterEach(async () => {
      await harness.dispose();
    });

    describe('덱', () => {
      test('덱을 만들면 덱 목록에 보인다', async () => {
        const { store } = await harness.open();

        await store.createDeck({ name: '영어 단어' });

        expect(await store.listDecks()).toEqual([
          { id: 'id-1', name: '영어 단어', language: null, createdAt: 1000 },
        ]);
      });

      test('덱을 고치면 값이 바뀐 필드의 수정 시각만 움직인다', async () => {
        const { store, port } = await harness.open();
        const deck = await store.createDeck({ name: '영어 단어' });

        await store.updateDeck(deck.id, { name: '영어 단어', language: 'en' });

        expect(await port.decks.get(deck.id)).toMatchObject({
          name: '영어 단어',
          language: 'en',
          name_ts: 1000,
          language_ts: 2000,
        });
      });

      test('휴지통에 있는 덱의 카드 목록은 거부한다', async () => {
        const { store } = await harness.open();
        const deck = await store.createDeck({ name: '영어 단어' });
        await store.trashDeck(deck.id);

        await expect(store.listCards(deck.id)).rejects.toMatchObject({ code: 'trashed' });
        await expect(store.listCards('없는 덱')).rejects.toMatchObject({ code: 'not_found' });
      });

      test('이름과 발음 언어를 고치거나 없음으로 되돌려도 다시 열면 유지된다', async () => {
        let { store } = await harness.open();
        const deck = await store.createDeck({ name: '처음 덱', language: 'en' });
        for (const language of ['ja', 'ko', null]) {
          const name = `고친 덱 ${language ?? '없음'}`;
          await store.updateDeck(deck.id, { name, language });
          ({ store } = await harness.reopen());
          expect(await store.getDeck(deck.id)).toEqual({ ...deck, name, language });
          expect(await store.listDecks()).toEqual([{ ...deck, name, language }]);
        }
      });
    });

    describe('카드', () => {
      test('카드를 만들면 덱의 카드 목록과 조회에 보인다', async () => {
        const { store } = await harness.open();
        const deck = await store.createDeck({ name: '영어 단어' });

        const card = await store.createCard(deck.id, {
          front: 'apple',
          back: '사과',
          memo: '과일',
        });

        const expected = {
          id: card.id,
          deckId: deck.id,
          front: 'apple',
          back: '사과',
          memo: '과일',
          image: null,
          createdAt: 2000,
        };
        expect(card).toEqual(expected);
        expect(await store.getCard(card.id)).toEqual(expected);
        expect(await store.listCards(deck.id)).toEqual([expected]);
      });

      test('카드를 고치면 값이 바뀐 필드만 달라지고 null은 값을 지운다', async () => {
        const { store } = await harness.open();
        const deck = await store.createDeck({ name: '영어 단어' });
        const card = await store.createCard(deck.id, {
          front: 'apple',
          back: '사과',
          memo: '과일',
        });

        const updated = await store.updateCard(card.id, { back: '애플', memo: null });

        expect(updated).toEqual({ ...card, back: '애플', memo: null });
        expect(await store.getCard(card.id)).toEqual(updated);
      });

      test('카드를 고치면 값이 바뀐 필드의 수정 시각만 움직인다', async () => {
        const { store, port } = await harness.open();
        const deck = await store.createDeck({ name: '영어 단어' });
        const card = await store.createCard(deck.id, {
          front: 'apple',
          back: '사과',
          memo: '과일',
        });

        // front는 같은 값을 보내므로 바뀐 것이 아니다.
        await store.updateCard(card.id, { front: 'apple', back: '애플', memo: null });

        expect(await port.cards.get(card.id)).toMatchObject({
          front_ts: 2000,
          back_ts: 3000,
          memo_ts: 3000,
          image_ts: 2000,
        });
      });

      test('빈 앞면·뒷면으로 만들거나 고치는 것은 거부한다', async () => {
        const { store } = await harness.open();
        const deck = await store.createDeck({ name: '영어 단어' });
        const card = await store.createCard(deck.id, { front: 'apple', back: '사과' });

        await expect(store.createCard(deck.id, { front: ' ', back: '사과' })).rejects.toMatchObject(
          {
            code: 'invalid',
          },
        );
        await expect(store.updateCard(card.id, { back: '' })).rejects.toMatchObject({
          code: 'invalid',
        });
        expect((await store.listCards(deck.id)).map(({ id }) => id)).toEqual([card.id]);
      });
    });

    describe('다시 열기', () => {
      test('저장소를 닫았다가 다시 열어도 덱, 카드, 학습 이력이 그대로다', async () => {
        const first = await harness.open();
        const deck = await first.store.createDeck({ name: '영어 단어', language: 'en' });
        const card = await first.store.createCard(deck.id, { front: 'apple', back: '사과' });
        const review = await first.store.rateCard(card.id, {
          id: 'review-1',
          rating: 'know',
          hintUsed: false,
        });
        const trashed = await first.store.createCard(deck.id, { front: 'pear', back: '배' });
        await first.store.trashCard(trashed.id);

        const { store, port } = await harness.reopen();

        expect(await store.listDecks()).toEqual([
          { id: deck.id, name: '영어 단어', language: 'en', createdAt: 1000 },
        ]);
        expect(await store.listCards(deck.id)).toEqual([card]);
        expect(await store.listReviewHistory(card.id)).toEqual([review]);
        expect((await store.listTrash()).cards.map(({ id }) => id)).toEqual([trashed.id]);
        expect(await port.decks.get(deck.id)).toMatchObject({ name_ts: 1000, language_ts: 1000 });
      });
    });

    describe('삭제 표시와 톰스톤', () => {
      test('카드를 휴지통에 넣으면 행은 남고 삭제 표시만 붙는다', async () => {
        const { store, port } = await harness.open();
        const deck = await store.createDeck({ name: '영어 단어' });
        const card = await store.createCard(deck.id, { front: 'apple', back: '사과' });

        await store.trashCard(card.id);

        const row = await port.cards.get(card.id);
        expect(row).toMatchObject({
          front: 'apple',
          deleted_at: 3000,
          deleted_ts: 3000,
          deleted_by_op: expect.any(String),
        });
        expect(await store.getCard(card.id)).toBeNull();
        expect(await port.tombstones.get(card.id)).toBeNull();
      });

      test('덱을 휴지통에 넣으면 덱과 카드의 행이 남고 같은 작업 ID가 붙는다', async () => {
        const { store, port } = await harness.open();
        const deck = await store.createDeck({ name: '영어 단어' });
        const card = await store.createCard(deck.id, { front: 'apple', back: '사과' });

        await store.trashDeck(deck.id);

        const deckRow = await port.decks.get(deck.id);
        const cardRow = await port.cards.get(card.id);
        expect(deckRow).toMatchObject({ deleted_at: 3000, deleted_ts: 3000 });
        expect(cardRow).toMatchObject({ deleted_at: 3000, deleted_ts: 3000 });
        expect(deckRow!.deleted_by_op).not.toBeNull();
        expect(cardRow!.deleted_by_op).toBe(deckRow!.deleted_by_op);
        expect(await store.getDeck(deck.id)).toBeNull();
      });

      test('복구하면 삭제 표시가 지워지고 휴지통 시각만 갱신된다', async () => {
        const { store, port } = await harness.open();
        const deck = await store.createDeck({ name: '영어 단어' });
        const card = await store.createCard(deck.id, { front: 'apple', back: '사과' });
        await store.trashCard(card.id);

        await store.restoreCard(card.id);

        expect(await port.cards.get(card.id)).toMatchObject({
          deleted_at: null,
          deleted_by_op: null,
          deleted_ts: 4000,
        });
      });

      test('카드를 영구 삭제하면 행이 지워지고 톰스톤이 남는다', async () => {
        const { store, port } = await harness.open();
        const deck = await store.createDeck({ name: '영어 단어' });
        const card = await store.createCard(deck.id, { front: 'apple', back: '사과' });
        await store.trashCard(card.id);

        await store.deleteCardPermanently(card.id);

        expect(await port.cards.get(card.id)).toBeNull();
        expect(await port.tombstones.get(card.id)).toEqual({ id: card.id, kind: 'card' });
        expect(await port.decks.get(deck.id)).not.toBeNull();
      });

      test('덱을 영구 삭제하면 덱과 카드의 행이 지워지고 각각 톰스톤이 남는다', async () => {
        const { store, port } = await harness.open();
        const deck = await store.createDeck({ name: '영어 단어' });
        const card = await store.createCard(deck.id, { front: 'apple', back: '사과' });
        await store.trashDeck(deck.id);

        await store.deleteDeckPermanently(deck.id);

        expect(await port.decks.get(deck.id)).toBeNull();
        expect(await port.cards.get(card.id)).toBeNull();
        expect(await port.tombstones.get(deck.id)).toEqual({ id: deck.id, kind: 'deck' });
        expect(await port.tombstones.get(card.id)).toEqual({ id: card.id, kind: 'card' });
      });
    });

    describe('휴지통', () => {
      test('덱과 함께 휴지통에 들어간 카드는 따로 영구 삭제할 수 없고, 덱을 복구하면 돌아온다', async () => {
        const { store } = await harness.open();
        const deck = await store.createDeck({ name: '영어 단어' });
        const card = await store.createCard(deck.id, { front: 'apple', back: '사과' });
        await store.trashDeck(deck.id);

        await expect(store.deleteCardPermanently(card.id)).rejects.toMatchObject({
          code: 'deck_trashed',
        });

        await store.restoreDeck(deck.id);
        expect((await store.listCards(deck.id)).map(({ id }) => id)).toEqual([card.id]);
      });

      test('덱이 휴지통에 있으면 따로 넣은 카드의 복구를 deck_trashed로 거부한다', async () => {
        const { store } = await harness.open();
        const deck = await store.createDeck({ name: '영어 단어' });
        const card = await store.createCard(deck.id, { front: 'apple', back: '사과' });
        await store.trashCard(card.id);
        await store.trashDeck(deck.id);

        await expect(store.restoreCard(card.id)).rejects.toMatchObject({ code: 'deck_trashed' });
      });
    });

    describe('동기화로 덱만 휴지통에 있는 카드', () => {
      // 다른 기기에서 덱을 휴지통에 넣는 사이 이 기기에서 카드를 되살린 상태를 포트로 직접 만든다.
      const openWithStrandedCard = async () => {
        const { store, port } = await harness.open();
        const deck = await store.createDeck({ name: '영어 단어' });
        const card = await store.createCard(deck.id, { front: 'apple', back: '사과' });
        await store.trashDeck(deck.id);
        const row = await port.cards.get(card.id);
        await port.cards.put({ ...row!, deleted_at: null, deleted_by_op: null });
        return { store, card };
      };

      test('살아 있는 카드로 보지 않는다', async () => {
        const { store, card } = await openWithStrandedCard();

        expect(await store.getCard(card.id)).toBeNull();
        await expect(store.listReviewHistory(card.id)).rejects.toMatchObject({
          code: 'deck_trashed',
        });
        await expect(
          store.rateCard(card.id, { id: 'review-1', rating: 'know', hintUsed: false }),
        ).rejects.toMatchObject({ code: 'deck_trashed' });
      });

      test('덱을 영구 삭제하면 함께 지워진다', async () => {
        const { store, card } = await openWithStrandedCard();

        await store.deleteDeckPermanently(card.deckId);

        await expect(store.listReviewHistory(card.id)).rejects.toMatchObject({
          code: 'not_found',
        });
      });
    });

    describe('복습', () => {
      test('잘못된 평가 값은 거부하고 학습 이력에 남기지 않는다', async () => {
        const { store } = await harness.open();
        const deck = await store.createDeck({ name: '영어 단어' });
        const card = await store.createCard(deck.id, { front: 'apple', back: '사과' });

        await expect(
          store.rateCard(card.id, { id: 'review-1', rating: 'good' as Rating, hintUsed: false }),
        ).rejects.toMatchObject({ code: 'invalid' });

        expect(await store.listReviewHistory(card.id)).toEqual([]);
      });

      test('같은 평가 ID로 다시 보내면 한 번만 기록하고 처음 결과를 돌려준다', async () => {
        const { store } = await harness.open();
        const deck = await store.createDeck({ name: '영어 단어' });
        const card = await store.createCard(deck.id, { front: 'apple', back: '사과' });
        const input = { id: 'review-1', rating: 'know', hintUsed: true } as const;

        const first = await store.rateCard(card.id, input);
        const retried = await store.rateCard(card.id, input);

        expect(retried).toEqual(first);
        expect(await store.listReviewHistory(card.id)).toEqual([first]);
      });

      test('같은 평가 ID로 다른 내용을 보내면 conflict로 거부한다', async () => {
        const { store } = await harness.open();
        const deck = await store.createDeck({ name: '영어 단어' });
        const card = await store.createCard(deck.id, { front: 'apple', back: '사과' });
        await store.rateCard(card.id, { id: 'review-1', rating: 'know', hintUsed: false });

        await expect(
          store.rateCard(card.id, { id: 'review-1', rating: 'dont', hintUsed: false }),
        ).rejects.toMatchObject({ code: 'conflict' });
      });

      test('휴지통에 있는 카드의 학습 이력은 거부한다', async () => {
        const { store } = await harness.open();
        const deck = await store.createDeck({ name: '영어 단어' });
        const card = await store.createCard(deck.id, { front: 'apple', back: '사과' });
        await store.rateCard(card.id, { id: 'review-1', rating: 'know', hintUsed: false });
        await store.trashCard(card.id);

        await expect(store.listReviewHistory(card.id)).rejects.toMatchObject({ code: 'trashed' });
      });
    });

    const openWithCard = async () => {
      const { store } = await harness.open();
      const deck = await store.createDeck({ name: '영어 단어' });
      const card = await store.createCard(deck.id, { front: 'apple', back: '사과' });
      return { store, deck, card };
    };

    // Store는 사실만 읽는다. 대기열 같은 파생 값은 features/review가 이 목록에서 만든다(ADR 0010).
    describe('카드와 학습 이력', () => {
      test('덱의 살아 있는 카드를 만든 순서대로 카드별 학습 이력과 함께 돌려준다', async () => {
        const { store, deck, card: apple } = await openWithCard();
        const pear = await store.createCard(deck.id, { front: 'pear', back: '배' });
        const grape = await store.createCard(deck.id, { front: 'grape', back: '포도' });
        const other = await store.createDeck({ name: '개발 지식' });
        const git = await store.createCard(other.id, { front: 'git', back: '버전 관리' });
        const first = await store.rateCard(apple.id, {
          id: 'review-1',
          rating: 'dont',
          hintUsed: false,
        });
        const second = await store.rateCard(apple.id, {
          id: 'review-2',
          rating: 'know',
          hintUsed: true,
        });
        await store.rateCard(git.id, { id: 'review-3', rating: 'know', hintUsed: false });
        await store.rateCard(grape.id, { id: 'review-4', rating: 'unsure', hintUsed: false });
        await store.trashCard(grape.id);

        expect(await store.listCardsWithHistory(deck.id)).toEqual([
          { card: apple, history: [first, second] },
          { card: pear, history: [] },
        ]);
      });

      test('학습 이력은 평가 시각 순서이고 listReviewHistory와 같다', async () => {
        const { store, deck, card } = await openWithCard();
        harness.clock.set(5000);
        const later = await store.rateCard(card.id, {
          id: 'review-1',
          rating: 'know',
          hintUsed: false,
        });
        harness.clock.set(2000);
        const earlier = await store.rateCard(card.id, {
          id: 'review-2',
          rating: 'dont',
          hintUsed: false,
        });

        const [entry] = await store.listCardsWithHistory(deck.id);

        expect(entry.history).toEqual([earlier, later]);
        expect(entry.history).toEqual(await store.listReviewHistory(card.id));
      });

      test('덱이 없거나 휴지통에 있으면 거부한다', async () => {
        const { store, deck } = await openWithCard();
        await store.trashDeck(deck.id);

        await expect(store.listCardsWithHistory(deck.id)).rejects.toMatchObject({
          code: 'trashed',
        });
        await expect(store.listCardsWithHistory('none')).rejects.toMatchObject({
          code: 'not_found',
        });
      });
    });

    describe('학습 이력 기록', () => {
      test('평가마다 원본 평가, 힌트 사용 여부, 학습일, 평가 시각을 남긴다', async () => {
        const { store, card } = await openWithCard();
        harness.clock.set(new Date(2026, 0, 1, 12).getTime());
        await store.rateCard(card.id, { id: 'review-1', rating: 'unsure', hintUsed: true });
        harness.clock.set(new Date(2026, 0, 3, 9, 30).getTime());
        await store.rateCard(card.id, { id: 'review-2', rating: 'know', hintUsed: false });

        expect(await store.listReviewHistory(card.id)).toEqual([
          {
            id: 'review-1',
            cardId: card.id,
            rating: 'unsure',
            hintUsed: true,
            studyDay: 20454,
            ratedAt: new Date(2026, 0, 1, 12).getTime(),
          },
          {
            id: 'review-2',
            cardId: card.id,
            rating: 'know',
            hintUsed: false,
            studyDay: 20456,
            ratedAt: new Date(2026, 0, 3, 9, 30).getTime(),
          },
        ]);
      });
    });
  });
};

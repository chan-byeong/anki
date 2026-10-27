import { createMemoryBacking, createMemoryPort } from '@/storage/memory-port';
import { createStore, type Rating } from '@/storage/store';
import { createTestClock, createTestIds } from '@/storage/testing/deps';

import { countDueOn, countQueue, listQueue, listQueueOf, listReviewCardsOf } from '../queue';

// 대기열은 Store가 읽어 주는 카드와 학습 이력에서 features/review가 만든다(ADR 0010).
// 날짜는 Jest의 고정 TZ에서 시계를 해당 날의 정오로 옮겨 만든다(ADR 0013).
// 2026-01-01의 학습일은 20454다. 오늘은 listQueue·countQueue에 인자로 넘긴다.

const FIRST_DAY = 20454;
const dayAt = (day: number): number => new Date(2026, 0, 1 + day, 12).getTime();

const openWithCard = async () => {
  const clock = createTestClock();
  const store = createStore(createMemoryPort(createMemoryBacking()), {
    now: clock.now,
    newId: createTestIds(),
  });
  const deck = await store.createDeck({ name: '영어 단어' });
  const card = await store.createCard(deck.id, { front: 'apple', back: '사과' });
  let reviewCount = 0;

  const rate = async (
    cardId: string,
    rating: Rating,
    { day = 0, hintUsed = false } = {},
  ): Promise<void> => {
    clock.set(dayAt(day));
    reviewCount += 1;
    await store.rateCard(cardId, { id: `review-${reviewCount}`, rating, hintUsed });
  };

  const queueIds = async (day = 0): Promise<string[]> =>
    (await listQueue(store, deck.id, FIRST_DAY + day)).map(({ id }) => id);

  return { store, deck, card, rate, queueIds };
};

describe('listQueue', () => {
  test('이력이 없는 신규 카드도 대기열에 나온다', async () => {
    const { card, queueIds } = await openWithCard();

    expect(await queueIds()).toEqual([card.id]);
  });

  // 오늘의 마지막 유효 평가가 모름·헷갈림이고 오늘 평가가 3건 미만이면 남는다(ADR 0003).
  test.each<{ label: string; ratings: Rating[]; remains: boolean }>([
    { label: '앎 한 번', ratings: ['know'], remains: false },
    { label: '모름 한 번', ratings: ['dont'], remains: true },
    { label: '헷갈림 한 번', ratings: ['unsure'], remains: true },
    { label: '모름 뒤 앎', ratings: ['dont', 'know'], remains: false },
    { label: '앎 뒤 모름', ratings: ['know', 'dont'], remains: true },
    { label: '모름 두 번', ratings: ['dont', 'dont'], remains: true },
    { label: '모름 세 번', ratings: ['dont', 'dont', 'dont'], remains: false },
    { label: '모름·헷갈림·모름', ratings: ['dont', 'unsure', 'dont'], remains: false },
  ])('같은 날 $label 평가한 카드는 대기열에 남는다: $remains', async ({ ratings, remains }) => {
    const { card, rate, queueIds } = await openWithCard();

    for (const rating of ratings) {
      await rate(card.id, rating);
    }

    expect(await queueIds()).toEqual(remains ? [card.id] : []);
  });

  test('힌트를 쓴 앎은 헷갈림으로 보아 같은 날 대기열에 남는다', async () => {
    const { card, rate, queueIds } = await openWithCard();

    await rate(card.id, 'know', { hintUsed: true });

    expect(await queueIds()).toEqual([card.id]);
  });

  // 신규 카드의 첫 평가 간격은 모름 1일, 헷갈림 2일, 앎 3일이다(ADR 0004).
  test.each<{ label: string; rating: Rating; absentDays: number[]; presentDay: number }>([
    { label: '모름', rating: 'dont', absentDays: [], presentDay: 1 },
    { label: '헷갈림', rating: 'unsure', absentDays: [1], presentDay: 2 },
    { label: '앎', rating: 'know', absentDays: [0, 1, 2], presentDay: 3 },
  ])(
    '신규 카드를 $label으로 처음 평가하면 $presentDay일째 대기열에 나온다',
    async ({ rating, absentDays, presentDay }) => {
      const { card, rate, queueIds } = await openWithCard();
      await rate(card.id, rating);

      for (const day of absentDays) {
        expect(await queueIds(day)).toEqual([]);
      }
      expect(await queueIds(presentDay)).toEqual([card.id]);
    },
  );

  test('복습일이 지나도 평가할 때까지 대기열에 남는다', async () => {
    const { card, rate, queueIds } = await openWithCard();
    await rate(card.id, 'know');

    expect(await queueIds(10)).toEqual([card.id]);
  });

  test('모름을 세 번 평가해 빠진 카드도 다음 날에는 나온다', async () => {
    const { card, rate, queueIds } = await openWithCard();
    for (const rating of ['dont', 'dont', 'dont'] as const) {
      await rate(card.id, rating);
    }

    expect(await queueIds(0)).toEqual([]);
    expect(await queueIds(1)).toEqual([card.id]);
  });

  test('날이 바뀌면 오늘 평가 건수를 새로 센다', async () => {
    const { card, rate, queueIds } = await openWithCard();
    await rate(card.id, 'dont', { day: 0 });
    await rate(card.id, 'dont', { day: 0 });
    await rate(card.id, 'dont', { day: 1 });

    expect(await queueIds(1)).toEqual([card.id]);
  });

  test('신규 카드와 복습일이 된 카드가 함께 나온다', async () => {
    const { store, deck, card: reviewed, rate, queueIds } = await openWithCard();
    const fresh = await store.createCard(deck.id, { front: 'pear', back: '배' });
    await rate(reviewed.id, 'know');

    const ids = await queueIds(3);

    expect(ids).toHaveLength(2);
    expect(ids).toEqual(expect.arrayContaining([reviewed.id, fresh.id]));
  });

  describe('순서', () => {
    const openWithCards = async (count: number) => {
      const ctx = await openWithCard();
      const cards = [ctx.card];
      for (let i = 1; i < count; i += 1) {
        cards.push(await ctx.store.createCard(ctx.deck.id, { front: `w${i}`, back: `b${i}` }));
      }
      return { ...ctx, cards };
    };

    test('복습일이 오래된 카드가 먼저 나오고 신규 카드가 그 뒤에 나온다', async () => {
      const { store, deck, cards, rate } = await openWithCards(3);
      const fresh = await store.createCard(deck.id, { front: 'new', back: '신규' });
      await rate(cards[0].id, 'know'); // 복습일 3일째
      await rate(cards[1].id, 'unsure'); // 복습일 2일째
      await rate(cards[2].id, 'dont'); // 복습일 1일째

      const ids = (await listQueue(store, deck.id, FIRST_DAY + 5)).map(({ id }) => id);

      expect(ids).toEqual([cards[2].id, cards[1].id, cards[0].id, fresh.id]);
    });

    test('복습일이 같은 카드끼리는 주입한 난수로 순서를 섞는다', async () => {
      const { store, deck, cards, rate } = await openWithCards(3);
      for (const card of cards) await rate(card.id, 'know');
      const ids = async (random: () => number) =>
        (await listQueue(store, deck.id, FIRST_DAY + 3, random)).map(({ id }) => id);

      const ascending = await ids(() => 0.99);
      const reversed = await ids(() => 0);

      expect([...ascending].sort()).toEqual(cards.map(({ id }) => id).sort());
      expect(reversed).not.toEqual(ascending);
    });

    test('신규 카드끼리도 난수로 섞이지만 복습일이 된 카드 뒤에 온다', async () => {
      const { store, deck, cards, rate } = await openWithCards(1);
      const fresh = [
        await store.createCard(deck.id, { front: 'n1', back: '1' }),
        await store.createCard(deck.id, { front: 'n2', back: '2' }),
      ];
      await rate(cards[0].id, 'dont');

      const ids = (await listQueue(store, deck.id, FIRST_DAY + 1, () => 0)).map(({ id }) => id);

      expect(ids[0]).toBe(cards[0].id);
      expect(ids.slice(1).sort()).toEqual(fresh.map(({ id }) => id).sort());
    });
  });

  test('휴지통의 카드와 다른 덱의 카드는 나오지 않는다', async () => {
    const { store, deck, card, queueIds } = await openWithCard();
    const other = await store.createDeck({ name: '개발 지식' });
    await store.createCard(other.id, { front: 'git', back: '버전 관리' });
    const trashed = await store.createCard(deck.id, { front: 'pear', back: '배' });
    await store.trashCard(trashed.id);

    expect(await queueIds()).toEqual([card.id]);
  });

  test('덱이 없거나 휴지통에 있으면 거부한다', async () => {
    const { store, deck } = await openWithCard();
    await store.trashDeck(deck.id);

    await expect(listQueue(store, deck.id, FIRST_DAY)).rejects.toMatchObject({
      code: 'trashed',
    });
    await expect(listQueue(store, 'none', FIRST_DAY)).rejects.toMatchObject({
      code: 'not_found',
    });
  });
});

describe('삭제한 덱과 카드', () => {
  // 삭제한 덱의 카드는 대기열과 복습할 카드 수에서 빠진다. 삭제한 카드도 마찬가지다.
  test('덱을 휴지통에 넣으면 그 덱의 카드가 복습할 카드 수에서 빠지고 대기열은 거부한다', async () => {
    const { store, deck } = await openWithCard();
    const other = await store.createDeck({ name: '개발 지식' });
    await store.createCard(other.id, { front: 'git', back: '버전 관리' });
    expect((await countQueue(store, FIRST_DAY))[deck.id]).toBe(1);

    await store.trashDeck(deck.id);

    expect(Object.keys(await countQueue(store, FIRST_DAY))).toEqual([other.id]);
    await expect(listQueue(store, deck.id, FIRST_DAY)).rejects.toMatchObject({ code: 'trashed' });
  });

  test('카드를 휴지통에 넣으면 대기열과 복습할 카드 수에서 빠진다', async () => {
    const { store, deck, card } = await openWithCard();
    const kept = await store.createCard(deck.id, { front: 'pear', back: '배' });

    await store.trashCard(card.id);

    expect((await countQueue(store, FIRST_DAY))[deck.id]).toBe(1);
    expect((await listQueue(store, deck.id, FIRST_DAY)).map(({ id }) => id)).toEqual([kept.id]);
  });
});

describe('listQueueOf', () => {
  // 여러 덱을 고르면 대기열이 하나로 합쳐져 복습일이 오래된 카드부터 나온다.
  test('선택한 덱들의 대기열을 하나로 합쳐 복습일이 오래된 카드부터 낸다', async () => {
    const { store, deck: words, card: wordKnown, rate } = await openWithCard();
    const dev = await store.createDeck({ name: '개발 지식' });
    const devMissed = await store.createCard(dev.id, { front: 'git', back: '버전 관리' });
    const devNew = await store.createCard(dev.id, { front: 'ci', back: '지속적 통합' });
    await rate(wordKnown.id, 'know'); // 복습일 3일째
    await rate(devMissed.id, 'dont'); // 복습일 1일째

    const cards = await listQueueOf(store, [words.id, dev.id], FIRST_DAY + 5);

    expect(cards.map(({ id }) => id)).toEqual([devMissed.id, wordKnown.id, devNew.id]);
  });

  test('선택하지 않은 덱의 카드와 아직 복습일이 아닌 카드는 나오지 않는다', async () => {
    const { store, deck, card, rate } = await openWithCard();
    const other = await store.createDeck({ name: '선택 안 함' });
    await store.createCard(other.id, { front: 'git', back: '버전 관리' });
    const later = await store.createCard(deck.id, { front: 'pear', back: '배' });
    await rate(later.id, 'know');

    const cards = await listQueueOf(store, [deck.id], FIRST_DAY);

    expect(cards.map(({ id }) => id)).toEqual([card.id]);
  });

  test('선택한 덱 중 하나라도 없거나 휴지통에 있으면 거부한다', async () => {
    const { store, deck } = await openWithCard();
    const trashed = await store.createDeck({ name: '지운 덱' });
    await store.trashDeck(trashed.id);

    await expect(listQueueOf(store, [deck.id, trashed.id], FIRST_DAY)).rejects.toMatchObject({
      code: 'trashed',
    });
  });
});

describe('listReviewCardsOf', () => {
  // 오늘 대기열이 빈 덱(홈의 체크 표시)을 고르면 그 덱의 모든 카드를 섞어서 복습한다.
  test('오늘 대기열이 있는 덱은 대기열과 같다', async () => {
    const { store, deck, card, rate } = await openWithCard();
    const later = await store.createCard(deck.id, { front: 'pear', back: '배' });
    await rate(later.id, 'know');

    const cards = await listReviewCardsOf(store, [deck.id], FIRST_DAY);

    expect(cards.map(({ id }) => id)).toEqual([card.id]);
  });

  test('오늘 대기열이 빈 덱은 살아 있는 모든 카드를 섞어서 낸다', async () => {
    const { store, deck, card: apple, rate } = await openWithCard();
    const pear = await store.createCard(deck.id, { front: 'pear', back: '배' });
    const plum = await store.createCard(deck.id, { front: 'plum', back: '자두' });
    const trashed = await store.createCard(deck.id, { front: 'grape', back: '포도' });
    for (const { id } of [apple, pear, plum]) await rate(id, 'know');
    await store.trashCard(trashed.id);
    expect(await listQueueOf(store, [deck.id], FIRST_DAY)).toEqual([]);

    // 피셔-예이츠 섞기에서 늘 0을 고르면 [a, b, c]가 [b, c, a]가 된다.
    const cards = await listReviewCardsOf(store, [deck.id], FIRST_DAY, () => 0);

    expect(cards.map(({ id }) => id)).toEqual([pear.id, plum.id, apple.id]);
  });

  test('여러 덱이면 대기열이 있는 덱의 카드가 먼저, 대기열이 빈 덱의 카드가 그 뒤에 온다', async () => {
    const { store, deck: words, card: apple, rate } = await openWithCard();
    const dev = await store.createDeck({ name: '개발 지식' });
    const git = await store.createCard(dev.id, { front: 'git', back: '버전 관리' });
    await rate(apple.id, 'know');

    const cards = await listReviewCardsOf(store, [words.id, dev.id], FIRST_DAY);

    expect(cards.map(({ id }) => id)).toEqual([git.id, apple.id]);
  });

  test('카드가 없는 덱은 아무 카드도 내지 않는다', async () => {
    const { store } = await openWithCard();
    const empty = await store.createDeck({ name: '빈 덱' });

    expect(await listReviewCardsOf(store, [empty.id], FIRST_DAY)).toEqual([]);
  });

  test('선택한 덱 중 하나라도 없거나 휴지통에 있으면 거부한다', async () => {
    const { store, deck } = await openWithCard();
    await store.trashDeck(deck.id);

    await expect(listReviewCardsOf(store, [deck.id], FIRST_DAY)).rejects.toMatchObject({
      code: 'trashed',
    });
  });
});

describe('countQueue', () => {
  test('살아 있는 덱마다 대기열에 나오는 카드 수를 센다', async () => {
    const { store, deck: words, card: missed, rate } = await openWithCard();
    const empty = await store.createDeck({ name: '빈 덱' });
    await store.createCard(words.id, { front: 'pear', back: '배' });
    const known = await store.createCard(words.id, { front: 'plum', back: '자두' });
    const trashed = await store.createCard(words.id, { front: 'grape', back: '포도' });
    await rate(missed.id, 'dont');
    await rate(known.id, 'know');
    await store.trashCard(trashed.id);

    expect(await countQueue(store, FIRST_DAY)).toEqual({ [words.id]: 2, [empty.id]: 0 });
  });

  test('덱의 대기열 길이와 같다', async () => {
    const { store, deck, card, rate, queueIds } = await openWithCard();
    await rate(card.id, 'unsure');
    const today = FIRST_DAY + 2;

    const counts = await countQueue(store, today);

    expect(counts[deck.id]).toBe((await queueIds(2)).length);
    expect(counts[deck.id]).toBe(1);
  });

  test('휴지통에 있는 덱은 빠진다', async () => {
    const { store, deck } = await openWithCard();
    await store.trashDeck(deck.id);

    expect(await countQueue(store, FIRST_DAY)).toEqual({});
  });
});

describe('countDueOn', () => {
  test('여러 덱을 주면 덱마다 센 수를 더한다', async () => {
    const { store, deck, card, rate } = await openWithCard();
    const other = await store.createDeck({ name: '다른 덱' });
    const elsewhere = await store.createCard(other.id, { front: 'pear', back: '배' });
    await rate(card.id, 'dont');
    await rate(elsewhere.id, 'dont');

    expect(await countDueOn(store, [deck.id, other.id], FIRST_DAY + 1)).toBe(2);
  });

  // 복습 끝 화면의 "내일 N장". 신규 카드와 밀린 카드는 세지 않는다.
  test('덱에서 복습일이 정확히 그날인 카드만 센다', async () => {
    const { store, deck, card: missed, rate } = await openWithCard();
    const unsure = await store.createCard(deck.id, { front: 'pear', back: '배' });
    const known = await store.createCard(deck.id, { front: 'plum', back: '자두' });
    await store.createCard(deck.id, { front: 'fig', back: '무화과' });
    await rate(missed.id, 'dont');
    await rate(unsure.id, 'unsure');
    await rate(known.id, 'know');

    expect(await countDueOn(store, deck.id, FIRST_DAY + 1)).toBe(1);
    expect(await countDueOn(store, deck.id, FIRST_DAY + 2)).toBe(1);
    expect(await countDueOn(store, deck.id, FIRST_DAY + 3)).toBe(1);
  });

  test('휴지통의 카드와 다른 덱의 카드는 세지 않는다', async () => {
    const { store, deck, card, rate } = await openWithCard();
    const other = await store.createDeck({ name: '다른 덱' });
    const elsewhere = await store.createCard(other.id, { front: 'pear', back: '배' });
    const trashed = await store.createCard(deck.id, { front: 'plum', back: '자두' });
    await rate(card.id, 'dont');
    await rate(elsewhere.id, 'dont');
    await rate(trashed.id, 'dont');
    await store.trashCard(trashed.id);

    expect(await countDueOn(store, deck.id, FIRST_DAY + 1)).toBe(1);
  });

  test('덱이 없거나 휴지통에 있으면 거부한다', async () => {
    const { store, deck } = await openWithCard();
    await store.trashDeck(deck.id);

    await expect(countDueOn(store, deck.id, FIRST_DAY + 1)).rejects.toThrow();
  });
});

import { createMemoryBacking, createMemoryPort } from '@/storage/memory-port';
import { createStore, type Rating } from '@/storage/store';
import { createTestClock, createTestIds } from '@/storage/testing/deps';

import { countQueue, listQueue } from '../queue';

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

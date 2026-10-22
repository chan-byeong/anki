import { createMemoryBacking, createMemoryPort } from '@/storage/memory-port';
import { createStore, type Card, type Rating } from '@/storage/store';
import { createTestClock, createTestIds } from '@/storage/testing/deps';

import { createNextCardAfterRating } from '../next-card-after-rating';
import { listQueue } from '../queue';

// 평가 뒤의 전환(ADR 0003). 어댑터는 평가까지 반영된 이력을 isInQueue에 넣어 방금 카드가 대기열에 남는지 정하고,
// nextQueue로 다음 카드와 남은 카드를 얻는다. 여기서는 실제 Store(메모리)와 rateCard를 쓴다.
// 날짜는 Jest의 고정 TZ에서 시계를 해당 날의 정오로 옮겨 만든다(ADR 0013).

const dayAt = (day: number): number => new Date(2026, 0, 1 + day, 12).getTime();

const openWithCards = async (fronts: string[]) => {
  const clock = createTestClock();
  const store = createStore(createMemoryPort(createMemoryBacking()), {
    now: clock.now,
    newId: createTestIds(),
  });
  const deck = await store.createDeck({ name: '영어 단어' });
  const cards = [];
  for (const front of fronts) {
    cards.push(await store.createCard(deck.id, { front, back: `${front}의 뜻` }));
  }
  let reviewCount = 0;

  // 카드를 평가해 저장하고, 저장된 평가를 돌려준다. 화면이 하는 순서와 같다.
  const rate = async (cardId: string, rating: Rating, { day = 0, hintUsed = false } = {}) => {
    clock.set(dayAt(day));
    reviewCount += 1;
    return store.rateCard(cardId, { id: `review-${reviewCount}`, rating, hintUsed });
  };

  return { store, deck, cards, rate };
};

describe('createNextCardAfterRating', () => {
  test('앎으로 평가하면 다음 카드가 나오고 남은 카드가 하나 준다', async () => {
    const { store, cards, rate } = await openWithCards(['apple', 'banana', 'cherry']);
    const [apple, banana] = cards;
    const nextCardAfterRating = createNextCardAfterRating(store, cards);

    const review = await rate(apple.id, 'know');

    expect(await nextCardAfterRating(review)).toEqual({ card: banana, remaining: 2 });
  });

  // 재등장 위치는 STA-122가 바꾸기 전까지 임시로 맨 뒤다. 남은 카드는 대기열에서 빠질 때만 준다.
  test('모름으로 평가하면 남은 카드는 그대로이고 그 카드는 맨 뒤에서 다시 나온다', async () => {
    const { store, cards, rate } = await openWithCards(['apple', 'banana', 'cherry']);
    const [apple, banana, cherry] = cards;
    const nextCardAfterRating = createNextCardAfterRating(store, cards);

    expect(await nextCardAfterRating(await rate(apple.id, 'dont'))).toEqual({
      card: banana,
      remaining: 3,
    });
    expect(await nextCardAfterRating(await rate(banana.id, 'know'))).toEqual({
      card: cherry,
      remaining: 2,
    });
    expect(await nextCardAfterRating(await rate(cherry.id, 'know'))).toEqual({
      card: apple,
      remaining: 1,
    });
  });

  // 평가는 화면에 보인 카드, 곧 대기열의 맨 앞 카드에만 들어온다. 다른 카드면 대기열을 건드리지 않고 던진다.
  test('맨 앞이 아닌 카드의 평가가 들어오면 던지고 대기열은 그대로다', async () => {
    const { store, cards, rate } = await openWithCards(['apple', 'banana', 'cherry']);
    const [apple, banana, cherry] = cards;
    const nextCardAfterRating = createNextCardAfterRating(store, cards);

    await expect(nextCardAfterRating(await rate(cherry.id, 'know'))).rejects.toThrow();

    expect(await nextCardAfterRating(await rate(apple.id, 'know'))).toEqual({
      card: banana,
      remaining: 2,
    });
  });

  // 한 장뿐이어도 모름은 오늘 평가가 3건이 될 때까지 다시 나오고, 세 번째에 대기열에서 빠진다(ADR 0003).
  test('한 장짜리 대기열에서 모름을 세 번 평가하면 세 번째에 복습이 끝난다', async () => {
    const { store, cards, rate } = await openWithCards(['apple']);
    const [apple] = cards;
    const nextCardAfterRating = createNextCardAfterRating(store, cards);

    expect(await nextCardAfterRating(await rate(apple.id, 'dont'))).toEqual({
      card: apple,
      remaining: 1,
    });
    expect(await nextCardAfterRating(await rate(apple.id, 'dont'))).toEqual({
      card: apple,
      remaining: 1,
    });
    expect(await nextCardAfterRating(await rate(apple.id, 'dont'))).toEqual({
      card: null,
      remaining: 0,
    });
  });

  // 복습 중의 남은 카드는 앱을 닫았다 열었을 때 listQueue가 만드는 대기열의 크기와 같다. 순서는 비교하지 않는다.
  test('평가할 때마다 남은 카드가 그 시점의 listQueue 크기와 같다', async () => {
    const { store, deck, cards, rate } = await openWithCards(['apple', 'banana', 'cherry']);
    const nextCardAfterRating = createNextCardAfterRating(store, cards);
    const ratings: Rating[] = ['dont', 'know', 'unsure', 'know', 'dont', 'dont'];

    let current: Card | null = cards[0];
    for (const rating of ratings) {
      if (current === null) throw new Error('평가가 남았는데 복습이 먼저 끝났다');
      const review = await rate(current.id, rating);
      const next = await nextCardAfterRating(review);

      const queued = await listQueue(store, deck.id, review.studyDay);
      expect(next.remaining).toBe(queued.length);
      current = next.card;
    }

    expect(current).toBeNull();
  });

  // 화면은 저장 뒤 전환이 실패하면 같은 평가로 다시 부른다. 두 번 불러도 대기열은 한 번만 진행한다.
  test('같은 평가로 다시 부르면 대기열을 또 진행하지 않고 같은 결과를 돌려준다', async () => {
    const { store, cards, rate } = await openWithCards(['apple', 'banana', 'cherry']);
    const [apple, banana, cherry] = cards;
    const nextCardAfterRating = createNextCardAfterRating(store, cards);
    const review = await rate(apple.id, 'know');

    const first = await nextCardAfterRating(review);
    const again = await nextCardAfterRating(review);

    expect(first).toEqual({ card: banana, remaining: 2 });
    expect(again).toEqual(first);
    expect(await nextCardAfterRating(await rate(banana.id, 'know'))).toEqual({
      card: cherry,
      remaining: 1,
    });
  });

  test('마지막 평가로 복습이 끝난 뒤 같은 평가로 다시 불러도 던지지 않고 같은 결과를 돌려준다', async () => {
    const { store, cards, rate } = await openWithCards(['apple']);
    const [apple] = cards;
    const nextCardAfterRating = createNextCardAfterRating(store, cards);
    const review = await rate(apple.id, 'know');

    expect(await nextCardAfterRating(review)).toEqual({ card: null, remaining: 0 });
    expect(await nextCardAfterRating(review)).toEqual({ card: null, remaining: 0 });
  });

  test('이력을 읽다 실패하면 오류를 그대로 던지고 대기열은 그대로라서 같은 평가로 다시 시도할 수 있다', async () => {
    const { store, cards, rate } = await openWithCards(['apple', 'banana']);
    const [apple, banana] = cards;
    const nextCardAfterRating = createNextCardAfterRating(store, cards);
    const review = await rate(apple.id, 'know');
    jest.spyOn(store, 'listReviewHistory').mockRejectedValueOnce(new Error('이력 읽기 실패'));

    await expect(nextCardAfterRating(review)).rejects.toThrow('이력 읽기 실패');

    expect(await nextCardAfterRating(review)).toEqual({ card: banana, remaining: 1 });
  });
});

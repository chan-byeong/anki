import { countDueOn, countQueue } from '@/features/review/queue';
import { createMemoryBacking, createMemoryPort } from '@/storage/memory-port';
import { createStore, type Rating } from '@/storage/store';
import { createTestClock, createTestIds } from '@/storage/testing/deps';

import { forecast, readForecast } from '../forecast';

// 2026-01-01의 학습일은 20454다. 시계를 그날 정오로 옮겨 평가한다.
const FIRST_DAY = 20454;
const dayAt = (day: number): number => new Date(2026, 0, 1 + day, 12).getTime();

const openStore = async () => {
  const clock = createTestClock();
  const store = createStore(createMemoryPort(createMemoryBacking()), {
    now: clock.now,
    newId: createTestIds(),
  });
  let reviewCount = 0;
  const rate = async (cardId: string, rating: Rating, day: number, hintUsed = false) => {
    clock.set(dayAt(day));
    reviewCount += 1;
    await store.rateCard(cardId, { id: `review-${reviewCount}`, rating, hintUsed });
  };
  return { store, rate };
};

describe('forecast', () => {
  test('카드가 없으면 7일 모두 0이다', () => {
    expect(forecast([], FIRST_DAY)).toEqual([0, 0, 0, 0, 0, 0, 0]);
  });

  test('오늘은 대기열 전체, 내일부터는 복습일이 그날인 카드 수다', async () => {
    const { store, rate } = await openStore();
    const english = await store.createDeck({ name: '영어 단어' });
    const japanese = await store.createDeck({ name: '일본어' });
    await store.createCard(english.id, { front: 'new', back: '신규' }); // 신규 카드는 오늘 대기열
    const overdue = await store.createCard(english.id, { front: 'old', back: '밀림' });
    const again = await store.createCard(japanese.id, { front: '猫', back: '고양이' });
    const later = await store.createCard(japanese.id, { front: '犬', back: '개' });
    const hinted = await store.createCard(japanese.id, { front: '鳥', back: '새' });

    await rate(overdue.id, 'know', 0); // 3일 뒤가 복습일, 오늘(10일)은 밀림
    await rate(again.id, 'dont', 10); // 오늘 다시 볼 카드, 복습일은 내일
    await rate(later.id, 'know', 9); // 복습일 12일
    await rate(hinted.id, 'know', 10, true); // 힌트 앎은 헷갈림: 오늘 다시 볼 카드, 복습일 12일

    const today = FIRST_DAY + 10;
    const days = await readForecast(store, today);

    expect(days).toEqual([4, 1, 2, 0, 0, 0, 0]);

    const queue = Object.values(await countQueue(store, today)).reduce((a, b) => a + b, 0);
    expect(days[0]).toBe(queue);
    for (let offset = 1; offset < 7; offset += 1) {
      expect(days[offset]).toBe(await countDueOn(store, [english.id, japanese.id], today + offset));
    }
  });

  test('휴지통에 있는 덱의 카드는 세지 않는다', async () => {
    const { store } = await openStore();
    const deck = await store.createDeck({ name: '영어 단어' });
    await store.createCard(deck.id, { front: 'apple', back: '사과' });
    await store.trashDeck(deck.id);

    expect(await readForecast(store, FIRST_DAY)).toEqual([0, 0, 0, 0, 0, 0, 0]);
  });
});

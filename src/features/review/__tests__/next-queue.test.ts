import * as fc from 'fast-check';

import type { Card } from '@/storage/store';

import { nextQueue } from '../next-queue';

// 복습 중 대기열의 다음 상태(ADR 0003). queue의 맨 앞이 방금 본 카드이고, stays는 그 카드가 대기열에 남는지다.
// 남는 판정은 isInQueue가 하고 여기서는 다루지 않는다. 남은 카드 수는 대기열에 남은 서로 다른 카드 수다.

const cardOf = (id: string): Card => ({
  id,
  deckId: 'deck-1',
  front: id,
  back: `${id}의 뒷면`,
  hint: null,
  memo: null,
  image: null,
  createdAt: 0,
});

describe('nextQueue', () => {
  test('방금 본 카드가 대기열에서 빠지면 다음 카드가 나오고 남은 카드가 하나 준다', () => {
    const [a, b, c] = ['a', 'b', 'c'].map(cardOf);

    const next = nextQueue([a, b, c], false);

    expect(next.card).toEqual(b);
    expect(next.remaining).toBe(2);
    expect(next.queue).toEqual([b, c]);
  });

  test('마지막 카드가 대기열에서 빠지면 복습이 끝난다', () => {
    const next = nextQueue([cardOf('a')], false);

    expect(next).toEqual({ queue: [], card: null, remaining: 0 });
  });

  // 재등장 위치는 STA-122가 바꾸기 전까지 임시로 맨 뒤다.
  test('방금 본 카드가 대기열에 남으면 맨 뒤로 재등장하고 남은 카드는 그대로다', () => {
    const [a, b, c] = ['a', 'b', 'c'].map(cardOf);

    const next = nextQueue([a, b, c], true);

    expect(next.card).toEqual(b);
    expect(next.remaining).toBe(3);
    expect(next.queue).toEqual([b, c, a]);
  });

  test('한 장만 남았는데 대기열에 남으면 같은 카드가 다시 나온다', () => {
    const a = cardOf('a');

    const next = nextQueue([a], true);

    expect(next.card).toEqual(a);
    expect(next.remaining).toBe(1);
    expect(next.queue).toEqual([a]);
  });

  test('빈 대기열은 남는지와 상관없이 복습이 끝난 상태다', () => {
    expect(nextQueue([], true)).toEqual({ queue: [], card: null, remaining: 0 });
    expect(nextQueue([], false)).toEqual({ queue: [], card: null, remaining: 0 });
  });

  test('입력 대기열을 바꾸지 않는다', () => {
    const [a, b, c] = ['a', 'b', 'c'].map(cardOf);
    const queue = [a, b, c];

    nextQueue(queue, true);
    nextQueue(queue, false);

    expect(queue).toEqual([a, b, c]);
  });

  describe('속성', () => {
    // 카드 id가 서로 다른 임의의 대기열
    const queueArb = fc
      .uniqueArray(fc.string({ minLength: 1, maxLength: 6 }), { maxLength: 10 })
      .map((ids) => ids.map(cardOf));
    const idsOf = (cards: Card[]) => cards.map((card) => card.id);

    test('남은 카드는 늘지 않고, 남으면 그대로 빠지면 하나 준다', () => {
      fc.assert(
        fc.property(queueArb, fc.boolean(), (queue, stays) => {
          const { remaining } = nextQueue(queue, stays);

          expect(remaining).toBeLessThanOrEqual(queue.length);
          const dropped = queue.length > 0 && !stays ? 1 : 0;
          expect(remaining).toBe(queue.length - dropped);
        }),
      );
    });

    test('남으면 카드 집합이 그대로이고, 빠지면 맨 앞 카드만 사라진다', () => {
      fc.assert(
        fc.property(queueArb, fc.boolean(), (queue, stays) => {
          const next = nextQueue(queue, stays);

          if (stays) {
            expect(idsOf(next.queue).sort()).toEqual(idsOf(queue).sort());
          } else {
            expect(next.queue).toEqual(queue.slice(1));
          }
        }),
      );
    });

    test('복습이 끝나는 건 대기열이 빌 때뿐이고, 아니면 맨 앞 카드가 나온다', () => {
      fc.assert(
        fc.property(queueArb, fc.boolean(), (queue, stays) => {
          const next = nextQueue(queue, stays);

          if (next.queue.length === 0) {
            expect(next.card).toBeNull();
          } else {
            expect(next.card).toEqual(next.queue[0]);
          }
        }),
      );
    });
  });
});

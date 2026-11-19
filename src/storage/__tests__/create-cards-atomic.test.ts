import { createMemoryBacking, createMemoryPort } from '../memory-port';
import { migrate } from '../sql/migrate';
import { migrations } from '../schema';
import { createSqlitePort } from '../sqlite-port';
import type { Port } from '../port';
import { createStore, type Store } from '../store';
import { memoryHarness, sqliteHarness, type Harness } from '../testing/harness';

// createCards는 중간에 쓰기가 실패해도 카드가 일부만 들어가지 않아야 한다(STA-166, STA-146).
// 세 번째 카드를 쓰는 순간 실패하는 포트에 Store를 올려서 앞의 두 장이 남는지 본다.
const failOnCardPut = (port: Port, failAt: number): Port => {
  let puts = 0;
  return {
    ...port,
    transaction: (fn) =>
      port.transaction((tx) =>
        fn({
          ...tx,
          cards: {
            ...tx.cards,
            put: async (row) => {
              puts += 1;
              if (puts === failAt) throw new Error('디스크 쓰기 실패');
              await tx.cards.put(row);
            },
          },
        }),
      ),
  };
};

const cases: [string, () => Harness<Store, Port>][] = [
  [
    'memory',
    memoryHarness(createMemoryBacking, (backing, deps) => {
      const port = createMemoryPort(backing);
      return { port, store: createStore(failOnCardPut(port, 3), deps) };
    }),
  ],
  [
    'sqlite',
    sqliteHarness(async (driver, deps) => {
      await migrate(driver, migrations);
      const port = createSqlitePort(driver);
      return { port, store: createStore(failOnCardPut(port, 3), deps) };
    }),
  ],
];

describe.each(cases)('createCards 원자성: %s', (_name, makeHarness) => {
  let harness: Harness<Store, Port>;

  beforeEach(() => {
    harness = makeHarness();
  });

  afterEach(async () => {
    await harness.dispose();
  });

  test('세 번째 카드를 쓰다 실패하면 앞의 두 장도 남지 않는다', async () => {
    const { store, port } = await harness.open();
    const deck = await store.createDeck({ name: '영어 단어' });

    await expect(
      store.createCards(deck.id, [
        { front: 'apple', back: '사과' },
        { front: 'pear', back: '배' },
        { front: 'plum', back: '자두' },
        { front: 'fig', back: '무화과' },
      ]),
    ).rejects.toThrow('디스크 쓰기 실패');

    expect(await port.cards.listAliveByDeck(deck.id)).toEqual([]);
    expect(await store.countCardsByDeck()).toEqual({ [deck.id]: 0 });
  });
});

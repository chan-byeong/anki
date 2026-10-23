/// <reference types="node" />
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { migrate } from '../sql/migrate';
import { openNodeDriver } from '../sql/node-driver';
import { createSqlitePort } from '../sqlite-port';
import { migrations } from '../schema';
import { createStore } from '../store';
import { describeStoreContract } from '../store-contract';
import { sqliteHarness } from '../testing/harness';

describeStoreContract(
  'sqlite',
  sqliteHarness(async (driver, deps) => {
    await migrate(driver, migrations);
    const port = createSqlitePort(driver);
    return { port, store: createStore(port, deps) };
  }),
);

test('v1 DB를 열면 v2로 올라가고 기존 카드의 힌트는 비어 있다', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'anki-migrate-'));
  const driver = openNodeDriver(join(dir, 'guest.db'));
  try {
    await migrate(driver, migrations.slice(0, 1));
    await driver.run(
      `INSERT INTO decks (id, name, language, created_at, name_ts, language_ts, deleted_at, deleted_ts, deleted_by_op)
       VALUES ('deck-1', '영어 단어', NULL, 1000, 1000, 1000, NULL, 1000, NULL)`,
    );
    await driver.run(
      `INSERT INTO cards (id, deck_id, front, back, memo, image, created_at, front_ts, back_ts, memo_ts, image_ts, deleted_at, deleted_ts, deleted_by_op)
       VALUES ('card-1', 'deck-1', 'apple', '사과', '과일', NULL, 2000, 2000, 3000, 3000, 2000, NULL, 2000, NULL)`,
    );

    await migrate(driver, migrations);

    // 새 필드의 수정 시각은 createCard처럼 카드를 만든 시각으로 채운다.
    expect(await createSqlitePort(driver).cards.get('card-1')).toMatchObject({
      memo: '과일',
      hint: null,
      hint_ts: 2000,
      memo_ts: 3000,
    });
  } finally {
    await driver.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

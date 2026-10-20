/// <reference types="node" />
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { SqlDriver } from '../driver';
import { migrate, type Migration } from '../migrate';
import { openNodeDriver } from '../node-driver';

// 배선 검증: 계약 스위트가 기대는 드라이버·마이그레이션 동작을 node:sqlite로 확인한다.

let dir: string;
let path: string;
let driver: SqlDriver;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'anki-driver-'));
  path = join(dir, 'test.db');
  driver = openNodeDriver(path);
});

afterEach(async () => {
  await driver.close();
  rmSync(dir, { recursive: true, force: true });
});

const createItems: Migration = async (tx) => {
  await tx.exec('CREATE TABLE items (id TEXT PRIMARY KEY, name TEXT NOT NULL) STRICT');
};

test('닫았다가 같은 파일을 다시 열면 자료가 남아 있다', async () => {
  await driver.exec('CREATE TABLE items (id TEXT PRIMARY KEY, name TEXT NOT NULL) STRICT');
  await driver.run('INSERT INTO items (id, name) VALUES (?, ?)', ['a', '사과']);
  await driver.close();

  driver = openNodeDriver(path);

  expect(await driver.all('SELECT id, name FROM items')).toEqual([{ id: 'a', name: '사과' }]);
});

test('외래 키가 켜져 있다', async () => {
  expect(await driver.first('PRAGMA foreign_keys')).toEqual({ foreign_keys: 1 });
});

test('없는 행은 first가 null을 돌려준다', async () => {
  await driver.exec('CREATE TABLE items (id TEXT PRIMARY KEY) STRICT');

  expect(await driver.first('SELECT id FROM items WHERE id = ?', ['x'])).toBeNull();
});

test('트랜잭션 안에서 오류가 나면 그 안의 쓰기가 모두 되돌려진다', async () => {
  await driver.exec('CREATE TABLE items (id TEXT PRIMARY KEY) STRICT');

  await expect(
    driver.transaction(async (tx) => {
      await tx.run('INSERT INTO items (id) VALUES (?)', ['a']);
      throw new Error('중간 실패');
    }),
  ).rejects.toThrow('중간 실패');

  expect(await driver.all('SELECT id FROM items')).toEqual([]);
});

test('트랜잭션 도중 들어온 다른 호출은 트랜잭션이 끝난 뒤에 실행된다', async () => {
  await driver.exec('CREATE TABLE items (id TEXT PRIMARY KEY) STRICT');
  let releaseTransaction = () => {};
  const paused = new Promise<void>((resolve) => {
    releaseTransaction = resolve;
  });

  const failing = driver.transaction(async (tx) => {
    await tx.run('INSERT INTO items (id) VALUES (?)', ['in-tx']);
    await paused;
    throw new Error('되돌리기');
  });
  const outside = driver.run('INSERT INTO items (id) VALUES (?)', ['outside']);
  releaseTransaction();

  await expect(failing).rejects.toThrow('되돌리기');
  await outside;
  // 바깥 쓰기가 트랜잭션에 섞였다면 롤백과 함께 사라졌을 것이다.
  expect(await driver.all('SELECT id FROM items')).toEqual([{ id: 'outside' }]);
});

test('마이그레이션은 아직 적용하지 않은 단계만 실행하고 버전을 올린다', async () => {
  const addColor: Migration = async (tx) => {
    await tx.exec("ALTER TABLE items ADD COLUMN color TEXT NOT NULL DEFAULT 'red'");
  };

  await migrate(driver, [createItems]);
  await driver.run('INSERT INTO items (id, name) VALUES (?, ?)', ['a', '사과']);
  await migrate(driver, [createItems, addColor]);

  expect(await driver.first('PRAGMA user_version')).toEqual({ user_version: 2 });
  expect(await driver.all('SELECT id, name, color FROM items')).toEqual([
    { id: 'a', name: '사과', color: 'red' },
  ]);
});

test('실패한 마이그레이션 단계는 버전을 올리지 않는다', async () => {
  const broken: Migration = async (tx) => {
    await tx.exec('CREATE TABLE half (id TEXT) STRICT');
    throw new Error('단계 실패');
  };

  await expect(migrate(driver, [createItems, broken])).rejects.toThrow('단계 실패');

  expect(await driver.first('PRAGMA user_version')).toEqual({ user_version: 1 });
  expect(
    await driver.first("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'half'"),
  ).toBeNull();
});

test('앱이 아는 것보다 높은 버전의 DB는 열지 않는다', async () => {
  await migrate(driver, [createItems]);

  await expect(migrate(driver, [])).rejects.toThrow('DB 버전(1)');
});

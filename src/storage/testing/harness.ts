/// <reference types="node" />
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { SqlDriver } from '../sql/driver';
import type { StoreDeps } from '../store';
import { openNodeDriver } from '../sql/node-driver';
import { createTestClock, createTestIds, type TestClock } from './deps';

// 계약 스위트의 팩토리(ADR 0012). Store와 포트의 타입은 구현하는 쪽이 정한다.
// open()은 새 저장소를, reopen()은 같은 저장소를 닫았다가 다시 연 것을 돌려준다.

export type Opened<TStore, TPort> = { store: TStore; port: TPort };

export interface Harness<TStore, TPort> {
  clock: TestClock;
  open(): Promise<Opened<TStore, TPort>>;
  reopen(): Promise<Opened<TStore, TPort>>;
  dispose(): Promise<void>;
}

// SQLite: 임시 디렉터리의 파일 DB를 연다. build는 드라이버 위에 마이그레이션, 포트, Store를 올린다.
export const sqliteHarness =
  <TStore, TPort>(build: (driver: SqlDriver, deps: StoreDeps) => Promise<Opened<TStore, TPort>>) =>
  (): Harness<TStore, TPort> => {
    const clock = createTestClock();
    const deps: StoreDeps = { now: clock.now, newId: createTestIds() };
    // Jest 워커가 병렬로 돌아도 겹치지 않게 테스트마다 새 디렉터리를 쓴다.
    const dir = mkdtempSync(join(tmpdir(), 'anki-store-'));
    const path = join(dir, 'guest.db');
    let driver: SqlDriver | undefined;

    const connect = async () => {
      await driver?.close();
      driver = openNodeDriver(path);
      return build(driver, deps);
    };

    return {
      clock,
      open: connect,
      reopen: connect,
      dispose: async () => {
        await driver?.close();
        driver = undefined;
        rmSync(dir, { recursive: true, force: true });
      },
    };
  };

// 메모리: 같은 저장 객체를 새 인스턴스에 넘기는 것으로 다시 열기를 흉내 낸다.
export const memoryHarness =
  <TStore, TPort, TBacking>(
    createBacking: () => TBacking,
    build: (backing: TBacking, deps: StoreDeps) => Opened<TStore, TPort>,
  ) =>
  (): Harness<TStore, TPort> => {
    const clock = createTestClock();
    const deps: StoreDeps = { now: clock.now, newId: createTestIds() };
    const backing = createBacking();

    return {
      clock,
      open: async () => build(backing, deps),
      reopen: async () => build(backing, deps),
      dispose: async () => undefined,
    };
  };

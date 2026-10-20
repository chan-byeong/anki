import { migrate } from '../sql/migrate';
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

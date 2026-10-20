import { createMemoryBacking, createMemoryPort } from '../memory-port';
import { createStore } from '../store';
import { describeStoreContract } from '../store-contract';
import { memoryHarness } from '../testing/harness';

describeStoreContract(
  'memory',
  memoryHarness(createMemoryBacking, (backing, deps) => {
    const port = createMemoryPort(backing);
    return { port, store: createStore(port, deps) };
  }),
);

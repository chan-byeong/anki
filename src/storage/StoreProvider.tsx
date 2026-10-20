import { createContext, useContext, type ReactNode } from 'react';

import type { Store } from './store';

const StoreContext = createContext<Store | null>(null);

interface StoreProviderProps {
  // 앱은 openAppStore()로 연 것을, 테스트는 메모리 포트 위의 Store를 넘긴다.
  store: Store;
  children: ReactNode;
}

export function StoreProvider({ store, children }: StoreProviderProps) {
  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

export function useStore(): Store {
  const store = useContext(StoreContext);
  if (!store) {
    throw new Error('useStore must be used inside StoreProvider');
  }
  return store;
}

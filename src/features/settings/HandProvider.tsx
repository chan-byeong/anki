import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import type { PreferenceStorage } from '@/theme/theme-preference';

import { readHandPreference, writeHandPreference, type Hand } from './hand-preference';

interface HandSetting {
  hand: Hand;
  setHand: (hand: Hand) => void;
}

const HandContext = createContext<HandSetting | null>(null);

interface HandProviderProps {
  // 손 선택을 읽고 쓰는 곳. 없으면 저장하지 않고 오른손에서 시작한다.
  storage?: PreferenceStorage;
  children: ReactNode;
}

export function HandProvider({ storage, children }: HandProviderProps) {
  const [hand, setHandState] = useState<Hand>(() =>
    storage ? readHandPreference(storage) : 'right',
  );
  const setHand = useCallback(
    (next: Hand) => {
      setHandState(next);
      if (storage) void writeHandPreference(storage, next);
    },
    [storage],
  );
  const value = useMemo(() => ({ hand, setHand }), [hand, setHand]);

  return <HandContext.Provider value={value}>{children}</HandContext.Provider>;
}

export function useHand(): HandSetting {
  const setting = useContext(HandContext);
  if (!setting) {
    throw new Error('useHand must be used inside HandProvider');
  }
  return setting;
}

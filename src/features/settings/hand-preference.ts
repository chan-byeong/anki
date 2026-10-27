import type { PreferenceStorage } from '@/theme/theme-preference';

// 주로 쓰는 손. 복습 화면의 카드 버튼(힌트·메모, 이후 발음)을 어느 쪽 모서리에 모을지 정한다.
// 테마처럼 기기에만 남는 화면 설정이라 Store(동기화 대상)에 넣지 않는다.
export type Hand = 'left' | 'right';

const KEY = 'hand';

const isHand = (value: unknown): value is Hand => value === 'left' || value === 'right';

/** 저장된 선택. 없거나 읽지 못하면 오른손이다. */
export const readHandPreference = (storage: PreferenceStorage): Hand => {
  try {
    const value = storage.getItemSync(KEY);
    return isHand(value) ? value : 'right';
  } catch {
    return 'right';
  }
};

export const writeHandPreference = async (
  storage: PreferenceStorage,
  hand: Hand,
): Promise<void> => {
  try {
    await storage.setItem(KEY, hand);
  } catch {
    // 화면에는 이미 반영됐다. 기록하지 못하면 다음 실행에 이전 선택으로 시작할 뿐이다.
  }
};

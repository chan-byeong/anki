import { useEffect, useRef, useState } from 'react';

import { StoreError, type Trash } from '@/storage/store';
import { useStore } from '@/storage/StoreProvider';
import { toastHold } from '@/theme/tokens';
import type { TrashedCard } from './use-trash';

export type RestoreToast = { message: string; sub?: string };

type TrashedDeck = Trash['decks'][number];

// 휴지통에서 덱과 카드를 복구한다. 끝나면 성공이든 실패든 onSettled로 목록을 다시 읽게 한다.
// 복구는 한 번에 하나만 보낸다. 두 번째는 이미 복구된 항목이라 not_trashed로 거부되기 때문이다.
// 덱이 휴지통에 있는 카드는 Store가 deck_trashed로 거부하고(ADR 0018), 그 카드를 blocked로 돌려줘 안내하게 한다.
// blocked는 안내를 닫아도 남겨서 시트가 내려가는 동안 문구가 비지 않게 한다. 열림은 blockedOpen이 정한다.
export function useRestore(onSettled: () => void): {
  restoreDeck: (deck: TrashedDeck) => Promise<void>;
  restoreCard: (card: TrashedCard) => Promise<void>;
  toast: RestoreToast | null;
  blocked: TrashedCard | null;
  blockedOpen: boolean;
  dismissBlocked: () => void;
} {
  const store = useStore();
  const restoring = useRef(false);
  const [toast, setToast] = useState<RestoreToast | null>(null);
  const [blocked, setBlocked] = useState<TrashedCard | null>(null);
  const [blockedOpen, setBlockedOpen] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(hideTimer.current), []);

  // 새 토스트는 떠 있던 것을 바로 바꿔 끼우고 머무는 시간을 다시 센다(캔버스 Motion).
  const showToast = (next: RestoreToast) => {
    clearTimeout(hideTimer.current);
    setToast(next);
    hideTimer.current = setTimeout(
      () => setToast(null),
      next.sub ? toastHold.withSub : toastHold.plain,
    );
  };

  const run = async (restore: () => Promise<void>, done: RestoreToast, card?: TrashedCard) => {
    if (restoring.current) return;
    restoring.current = true;
    try {
      await restore();
      showToast(done);
    } catch (error: unknown) {
      if (card && error instanceof StoreError && error.code === 'deck_trashed') {
        setBlocked(card);
        setBlockedOpen(true);
      } else {
        showToast({ message: '복구하지 못했어요', sub: '잠시 뒤 다시 해 주세요.' });
      }
    } finally {
      restoring.current = false;
      onSettled();
    }
  };

  return {
    restoreDeck: (deck) =>
      run(() => store.restoreDeck(deck.id), {
        message: '덱을 복구했어요',
        sub: deck.cardCount > 0 ? `카드 ${deck.cardCount}장과 함께` : undefined,
      }),
    restoreCard: (card) =>
      run(() => store.restoreCard(card.id), { message: '카드를 복구했어요' }, card),
    toast,
    blocked,
    blockedOpen,
    dismissBlocked: () => setBlockedOpen(false),
  };
}

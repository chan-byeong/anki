import { useEffect, useRef, useState } from 'react';

import { StoreError, type Trash } from '@/storage/store';
import { useStore } from '@/storage/StoreProvider';
import { toastHold } from '@/theme/tokens';
import type { TrashedCard } from './use-trash';

export type TrashToast = { message: string; sub?: string };

// done: 끝남, blocked: 덱이 휴지통에 있어 카드를 복구하지 못함, failed: 그 밖의 실패(토스트로 알림),
// busy: 다른 작업이 진행 중이라 보내지 않음.
export type TrashResult = 'done' | 'blocked' | 'failed' | 'busy';

type TrashedDeck = Trash['decks'][number];

const RETRY = '잠시 뒤 다시 해 주세요.';

// 휴지통에서 덱과 카드를 복구하거나 영구 삭제한다. 끝나면 성공이든 실패든 onSettled로 목록을 다시 읽게 한다.
// 작업은 한 번에 하나만 보낸다. 두 번째는 이미 처리된 항목이라 not_trashed나 not_found로 거부되기 때문이다.
// 덱이 휴지통에 있는 카드는 Store가 deck_trashed로 거부하고(ADR 0018), blocked를 돌려줘 화면이 안내하게 한다.
export function useTrashActions(onSettled: () => void): {
  restoreDeck: (deck: TrashedDeck) => Promise<TrashResult>;
  restoreCard: (card: TrashedCard) => Promise<TrashResult>;
  deleteDeck: (deck: TrashedDeck) => Promise<TrashResult>;
  deleteCard: (card: TrashedCard) => Promise<TrashResult>;
  emptyTrash: () => Promise<TrashResult>;
  toast: TrashToast | null;
} {
  const store = useStore();
  const running = useRef(false);
  const [toast, setToast] = useState<TrashToast | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(hideTimer.current), []);

  // 새 토스트는 떠 있던 것을 바로 바꿔 끼우고 머무는 시간을 다시 센다(캔버스 Motion).
  const showToast = (next: TrashToast) => {
    clearTimeout(hideTimer.current);
    setToast(next);
    hideTimer.current = setTimeout(
      () => setToast(null),
      next.sub ? toastHold.withSub : toastHold.plain,
    );
  };

  const run = async (
    action: () => Promise<void>,
    done: TrashToast,
    failed: TrashToast,
    // 카드 복구만 deck_trashed를 안내로 돌린다. 그 밖에는 실패 토스트다.
    blockable = false,
  ): Promise<TrashResult> => {
    if (running.current) return 'busy';
    running.current = true;
    try {
      await action();
      showToast(done);
      return 'done';
    } catch (error: unknown) {
      if (blockable && error instanceof StoreError && error.code === 'deck_trashed') {
        return 'blocked';
      }
      showToast(failed);
      return 'failed';
    } finally {
      running.current = false;
      onSettled();
    }
  };

  const restoreFailed = { message: '복구하지 못했어요', sub: RETRY };
  const deleteFailed = { message: '영구 삭제하지 못했어요', sub: RETRY };

  return {
    restoreDeck: (deck) =>
      run(
        () => store.restoreDeck(deck.id),
        {
          message: '덱을 복구했어요',
          sub: deck.cardCount > 0 ? `카드 ${deck.cardCount}장과 함께` : undefined,
        },
        restoreFailed,
      ),
    restoreCard: (card) =>
      run(() => store.restoreCard(card.id), { message: '카드를 복구했어요' }, restoreFailed, true),
    deleteDeck: (deck) =>
      run(
        () => store.deleteDeckPermanently(deck.id),
        { message: '덱을 영구 삭제했어요' },
        deleteFailed,
      ),
    deleteCard: (card) =>
      run(
        () => store.deleteCardPermanently(card.id),
        { message: '카드를 영구 삭제했어요' },
        deleteFailed,
      ),
    emptyTrash: () =>
      run(
        () => store.emptyTrash(),
        { message: '휴지통을 비웠어요' },
        { message: '휴지통을 비우지 못했어요', sub: RETRY },
      ),
    toast,
  };
}

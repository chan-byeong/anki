import { useCallback, useEffect, useState } from 'react';

import { isStorageFullError } from '@/features/storage-status/storage-status';
import { useStore } from '@/storage/StoreProvider';

import type { ImportOutcome } from './import-outcome';
import type { PickedFile } from './pick-import-file';
import { toCardInputs, type ImportReading } from './read-import-file';
import { usePickedImport } from './use-picked-import';

type FrontsState = { kind: 'loading' } | { kind: 'ready'; fronts: string[] } | { kind: 'failed' };

// 가져올 덱에 이미 있는 앞면. 덱을 바꾸면 다시 읽는다.
function useDeckFronts(deckId: string): FrontsState {
  const store = useStore();
  const [state, setState] = useState<{ deckId: string; value: FrontsState }>({
    deckId,
    value: { kind: 'loading' },
  });

  useEffect(() => {
    let active = true;
    store.listCards(deckId).then(
      (cards) =>
        active && setState({ deckId, value: { kind: 'ready', fronts: cards.map((c) => c.front) } }),
      () => active && setState({ deckId, value: { kind: 'failed' } }),
    );
    return () => {
      active = false;
    };
  }, [store, deckId]);

  return state.deckId === deckId ? state.value : { kind: 'loading' };
}

// 한 트랜잭션으로 쓰므로 실패하면 카드가 하나도 들어가지 않는다. 그 사실을 알린다.
const importFailureMessage = (error: unknown): string =>
  isStorageFullError(error)
    ? '기기 저장 공간이 부족해서 카드는 하나도 추가되지 않았어요. 공간을 정리한 뒤 다시 추가해 주세요.'
    : '카드는 하나도 추가되지 않았어요. 잠시 뒤 다시 해 주세요.';

export interface ImportFlow {
  deckId: string;
  setDeckId: (deckId: string) => void;
  file: PickedFile | null;
  /** 파일 선택기가 열려 있거나 파일을 읽는 중이다. */
  picking: boolean;
  fronts: FrontsState;
  /** 파일과 덱의 앞면을 모두 읽은 뒤의 결과. 그 전에는 null이다. */
  reading: ImportReading | null;
  /** 파일을 고른 뒤 화면이 보일 모양. 파일이 없으면 null이다. */
  outcome: ImportOutcome | null;
  saving: boolean;
  saveFailure: string | null;
  /** 파일을 새로 고른다. 고르지 않고 닫으면 false이고 이전 상태를 그대로 둔다. */
  pick: () => Promise<boolean>;
  /** 추가한 카드 수. 실패하면 null이고 saveFailure에 이유가 있다. */
  save: () => Promise<number | null>;
}

export function useImportFlow(entryDeckId: string): ImportFlow {
  const store = useStore();
  const [deckId, setDeckId] = useState(entryDeckId);
  const [saving, setSaving] = useState(false);
  const [saveFailure, setSaveFailure] = useState<string | null>(null);
  const fronts = useDeckFronts(deckId);
  const picked = usePickedImport(fronts.kind === 'ready' ? fronts.fronts : null);
  const { reading, pick: pickFile } = picked;

  const pick = useCallback(async () => {
    const ok = await pickFile();
    if (ok) setSaveFailure(null);
    return ok;
  }, [pickFile]);

  const save = useCallback(async () => {
    if (reading?.ok !== true || reading.cards.length === 0 || saving) return null;
    setSaving(true);
    setSaveFailure(null);
    try {
      const created = await store.createCards(deckId, toCardInputs(reading.cards));
      return created.length;
    } catch (error) {
      setSaveFailure(importFailureMessage(error));
      return null;
    } finally {
      setSaving(false);
    }
  }, [store, deckId, reading, saving]);

  return {
    deckId,
    setDeckId,
    file: picked.file,
    picking: picked.picking,
    fronts,
    reading,
    outcome: picked.outcome,
    saving,
    saveFailure,
    pick,
    save,
  };
}

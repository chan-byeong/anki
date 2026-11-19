import { useCallback, useMemo, useState } from 'react';

import { importOutcome, type ImportOutcome } from './import-outcome';
import { pickImportFile, type PickedFile } from './pick-import-file';
import { readImportFile, type ImportReading } from './read-import-file';

export interface PickedImport {
  file: PickedFile | null;
  /** 파일 선택기가 열려 있거나 파일을 읽는 중이다. */
  picking: boolean;
  /** 파일과 비교할 앞면을 모두 읽은 뒤의 결과. 그 전에는 null이다. */
  reading: ImportReading | null;
  /** 파일을 고른 뒤 화면이 보일 모양. 파일이 없으면 null이다. */
  outcome: ImportOutcome | null;
  /** 파일을 새로 고른다. 고르지 않고 닫으면 false이고 이전 상태를 그대로 둔다. */
  pick: () => Promise<boolean>;
  /** 고른 파일을 비운다. */
  clear: () => void;
}

/**
 * 파일을 고르고 읽는다. existingFronts는 같은 앞면을 가릴 때 쓰는 덱의 앞면이고,
 * 아직 읽는 중이면 null이다(그동안 결과도 null). 새 덱에는 빈 배열을 넘긴다.
 */
export function usePickedImport(existingFronts: readonly string[] | null): PickedImport {
  const [file, setFile] = useState<PickedFile | null>(null);
  const [picking, setPicking] = useState(false);

  const reading = useMemo(
    () =>
      file?.kind === 'bytes' && existingFronts !== null
        ? readImportFile(file.bytes, existingFronts)
        : null,
    [file, existingFronts],
  );

  const outcome = useMemo(
    () => (file === null ? null : importOutcome(file, reading)),
    [file, reading],
  );

  const pick = useCallback(async () => {
    setPicking(true);
    try {
      const picked = await pickImportFile();
      if (picked === null) return false;
      setFile(picked);
      return true;
    } finally {
      setPicking(false);
    }
  }, []);

  const clear = useCallback(() => setFile(null), []);

  return { file, picking, reading, outcome, pick, clear };
}

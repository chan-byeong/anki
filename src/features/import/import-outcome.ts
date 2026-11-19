import type { FileFailure, PickedFile } from './pick-import-file';
import {
  MAX_FILE_BYTES,
  MAX_LINES,
  type ImportCard,
  type ImportReading,
  type SkippedLine,
} from './read-import-file';

const FAILURE_TEXT: Record<FileFailure, string> = {
  'unreadable-encoding': '읽을 수 없는 파일이에요 · UTF-8이나 유니코드 텍스트로 저장해 주세요',
  'too-large': `파일이 너무 커요 · 최대 ${MAX_FILE_BYTES / 1024 / 1024} MB`,
  'too-many-lines': `줄이 너무 많아요 · 최대 ${MAX_LINES.toLocaleString('ko-KR')}줄`,
  'unsupported-type': '.md, .txt, .tsv 파일만 읽을 수 있어요',
  'open-failed': '파일을 열지 못했어요',
};

/**
 * 고른 파일을 화면이 어떻게 보여 줄지.
 * - loading: 덱의 앞면을 읽는 중이라 아직 결과가 없다.
 * - guide: 카드를 못 찾았거나 읽을 수 없다. 형식 안내와 "다른 파일 선택"을 보인다(Import-3).
 * - preview: 가져올 카드가 있다. 미리보기와 "카드 M장 추가"를 보인다(Import-2).
 */
export type ImportOutcome =
  | { kind: 'loading' }
  | { kind: 'guide'; status: string; skipped: SkippedLine[] }
  | { kind: 'preview'; status: string; cards: ImportCard[]; skipped: SkippedLine[] };

export function importOutcome(file: PickedFile, reading: ImportReading | null): ImportOutcome {
  if (file.kind === 'failed') {
    return { kind: 'guide', status: FAILURE_TEXT[file.failure], skipped: [] };
  }
  if (reading === null) return { kind: 'loading' };
  if (!reading.ok) return { kind: 'guide', status: FAILURE_TEXT[reading.failure], skipped: [] };

  const { cards, skipped } = reading;
  if (cards.length === 0) {
    const status = skipped.length === 0 ? '카드를 찾지 못했어요' : '가져올 수 있는 카드가 없어요';
    return { kind: 'guide', status, skipped };
  }
  return {
    kind: 'preview',
    status: `카드 ${cards.length + skipped.length}장을 찾았어요`,
    cards,
    skipped,
  };
}

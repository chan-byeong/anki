import type { SkippedLine, SkipReason } from './read-import-file';

export type SkipNote = { reason: SkipReason; text: string };

const SHOWN_LINES = 5;

const REASON_TEXT: Record<SkipReason, string> = {
  'duplicate-front': '이 덱에 같은 앞면이 있어서',
  'missing-back': '뒷면이 없어서',
  'missing-front': '앞면이 없어서',
};

const REASON_ORDER: SkipReason[] = ['duplicate-front', 'missing-back', 'missing-front'];

// "3장은 이 덱에 같은 앞면이 있어서 건너뛰어요 · 18, 20번째 줄". 줄이 많으면 앞의 몇 줄만 적는다.
export function skipNotes(skipped: readonly SkippedLine[]): SkipNote[] {
  return REASON_ORDER.flatMap((reason) => {
    const lines = skipped.filter((item) => item.reason === reason).map((item) => item.line);
    if (lines.length === 0) return [];
    const rest = lines.length - SHOWN_LINES;
    const where = `${lines.slice(0, SHOWN_LINES).join(', ')}번째 줄${rest > 0 ? ` 외 ${rest}줄` : ''}`;
    return [{ reason, text: `${lines.length}장은 ${REASON_TEXT[reason]} 건너뛰어요 · ${where}` }];
  });
}

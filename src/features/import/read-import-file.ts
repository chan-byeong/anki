import type { CreateCardInput } from '@/storage/store';

import { decodeText } from './decode-text';

// 탭으로 나눈 줄을 카드로 읽는 규칙(STA-166). 파일 선택·저장과 상관없이 바이트와 덱의 앞면 목록만으로 결과가 정해진다.

/** 시작 가정(STA-166). 넘으면 읽지 않고 이유를 알린다. */
export const MAX_FILE_BYTES = 2 * 1024 * 1024;
export const MAX_LINES = 5000;

export type ImportCard = {
  /** 파일 안의 줄 번호(1부터). 빈 줄과 주석 줄도 센다. */
  line: number;
  /** 앞뒤 공백만 지운 값. 같은 앞면을 가리는 비교에만 NFC를 쓰고, 저장할 글자는 바꾸지 않는다. */
  front: string;
  back: string;
  memo: string | null;
  hint: string | null;
};

/**
 * - missing-front / missing-back: 공백을 지운 뒤 앞면이나 뒷면이 비었다.
 * - duplicate-front: 덱에 있거나 파일에서 먼저 나온 카드와 앞면이 같다.
 */
export type SkipReason = 'missing-front' | 'missing-back' | 'duplicate-front';

export type SkippedLine = { line: number; reason: SkipReason };

/**
 * - unreadable-encoding: UTF-8, BOM이 있는 UTF-16이 아니다.
 * - too-large / too-many-lines: 파일 크기나 줄 수(빈 줄·주석 줄 포함)가 한도를 넘는다.
 */
export type ImportFailure = 'unreadable-encoding' | 'too-large' | 'too-many-lines';

export type ImportReading =
  { ok: true; cards: ImportCard[]; skipped: SkippedLine[] } | { ok: false; failure: ImportFailure };

const nullIfEmpty = (value: string | undefined): string | null =>
  value === undefined || value === '' ? null : value;

// 같은 앞면 판정 기준: 앞뒤 공백을 지우고 NFC로 맞춘다. 대소문자는 구분한다.
const frontKey = (front: string): string => front.trim().normalize('NFC');

export function readImportFile(
  bytes: Uint8Array,
  existingFronts: readonly string[],
): ImportReading {
  if (bytes.length > MAX_FILE_BYTES) return { ok: false, failure: 'too-large' };
  const text = decodeText(bytes);
  if (text === null) return { ok: false, failure: 'unreadable-encoding' };
  const lines = text.split(/\r?\n/);
  if (lines[lines.length - 1] === '') lines.pop();
  if (lines.length > MAX_LINES) return { ok: false, failure: 'too-many-lines' };

  const seen = new Set(existingFronts.map(frontKey));
  const cards: ImportCard[] = [];
  const skipped: SkippedLine[] = [];

  lines.forEach((raw, index) => {
    if (raw.trim() === '' || raw.startsWith('#')) return;
    const line = index + 1;
    const [front = '', back = '', memo, hint] = raw.split('\t').map((cell) => cell.trim());
    if (front === '') return void skipped.push({ line, reason: 'missing-front' });
    if (back === '') return void skipped.push({ line, reason: 'missing-back' });
    const key = frontKey(front);
    if (seen.has(key)) return void skipped.push({ line, reason: 'duplicate-front' });
    seen.add(key);
    cards.push({
      line,
      front,
      back,
      memo: nullIfEmpty(memo),
      hint: nullIfEmpty(hint),
    });
  });
  return { ok: true, cards, skipped };
}

/** 읽은 카드를 Store에 넘기는 모양으로 바꾼다(줄 번호는 저장하지 않는다). */
export const toCardInputs = (cards: readonly ImportCard[]): CreateCardInput[] =>
  cards.map(({ front, back, memo, hint }) => ({ front, back, memo, hint }));

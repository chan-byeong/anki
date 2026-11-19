import type { Card } from '@/storage/store';

// 복습 중 발음 버튼이 읽을 글자와 언어(STA-127).
// 앞면만 읽는다: 앞면이 덱의 발음 언어이고 뒷면은 모국어 뜻인 카드가 대부분이라 뒷면을 덱 언어로 읽으면 엉뚱한 소리가 난다.

export type PronunciationTarget = { text: string; language: string };

/** 덱에 발음 언어가 없거나 읽을 글자가 없으면 null이다. 그때는 버튼을 보이지 않는다. */
export const pronunciationTarget = (
  card: Pick<Card, 'front'>,
  language: string | null,
): PronunciationTarget | null =>
  language === null || card.front.trim() === '' ? null : { text: card.front, language };

/** 'ja', 'ja-JP' 같은 일본어 코드. 일본어 글은 JP 글리프 글꼴로 그린다. */
export const isJapanese = (language: string | null): boolean =>
  language === 'ja' || (language?.startsWith('ja-') ?? false);

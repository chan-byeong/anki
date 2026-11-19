import { useDeck } from './use-deck';

// 덱의 기본 발음 언어. 읽는 중이거나 덱이 없으면(휴지통 포함) null이다.
export function useDeckLanguage(deckId: string): string | null {
  const { state } = useDeck(deckId);
  return state.kind === 'ready' ? state.deck.language : null;
}

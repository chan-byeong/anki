import { useDeck } from './use-deck';

// 덱 이름. 읽는 중이거나 덱이 없으면(휴지통 포함) 빈 문자열이다.
export function useDeckName(deckId: string): string {
  const { state } = useDeck(deckId);
  return state.kind === 'ready' ? state.deck.name : '';
}

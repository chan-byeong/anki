import { useLocalSearchParams } from 'expo-router';

import { useDeckName } from '@/features/decks/use-deck-name';
import { ComingSoon } from '@/features/placeholder/ComingSoon';

// 덱 상세. STA-114에서 카드 목록으로 바꾼다.
export default function DeckScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ComingSoon title={useDeckName(id) || '덱 상세'} />;
}

import { useLocalSearchParams } from 'expo-router';

import { useDeckName } from '@/features/decks/use-deck-name';
import { ComingSoon } from '@/features/placeholder/ComingSoon';

// 복습. STA-117에서 대기열의 앞면부터 보여 주는 화면으로 바꾼다.
export default function ReviewScreen() {
  const { deckId } = useLocalSearchParams<{ deckId: string }>();
  return <ComingSoon title={useDeckName(deckId) || '복습'} />;
}

import { useLocalSearchParams } from 'expo-router';

import { DeckForm, DeckFormFrame, DeckFormUnavailable } from '@/features/decks/DeckForm';
import { useDeck } from '@/features/decks/use-deck';

export default function EditDeckScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, retry } = useDeck(id);

  if (state.kind === 'loading') return <DeckFormFrame editing>{null}</DeckFormFrame>;
  if (state.kind === 'failed') return <DeckFormUnavailable retry={retry} />;
  if (state.kind === 'missing') return <DeckFormUnavailable />;
  return <DeckForm key={state.deck.id} deck={state.deck} />;
}

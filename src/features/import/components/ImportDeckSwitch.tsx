import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type ViewInstance } from 'react-native';

import { CheckIcon, ChevronDownIcon, DeckIcon, Notice, Sheet } from '@/components';
import { useDeckName } from '@/features/decks/use-deck-name';
import type { Deck } from '@/storage/store';
import { useStore } from '@/storage/StoreProvider';
import { useTheme } from '@/theme/ThemeProvider';
import { size, space } from '@/theme/tokens';

interface ImportDeckSwitchProps {
  deckId: string;
  onChange: (deckId: string) => void;
}

// 가져올 덱. 기본은 들어온 덱이고, 누르면 덱 목록 시트에서 바꾼다(캔버스 Import-2). 시트는 캔버스에 없어 기존 Sheet(menu)로 만들었다.
// 덱 목록은 누를 때 읽는다. 읽지 못하면 시트를 열지 않고 알린다.
export function ImportDeckSwitch({ deckId, onChange }: ImportDeckSwitchProps) {
  const store = useStore();
  const { colors, text } = useTheme();
  const name = useDeckName(deckId);
  const [decks, setDecks] = useState<Deck[]>([]);
  const [open, setOpen] = useState(false);
  const [failed, setFailed] = useState(false);
  const triggerRef = useRef<ViewInstance>(null);

  const openSheet = async () => {
    try {
      setDecks(await store.listDecks());
      setFailed(false);
      setOpen(true);
    } catch {
      setFailed(true);
    }
  };

  if (name === '') return <View style={styles.placeholder} />;

  return (
    <View style={styles.wrap}>
      <Pressable
        ref={triggerRef}
        accessibilityRole="button"
        accessibilityLabel={`덱: ${name}, 바꾸기`}
        onPress={openSheet}
        style={({ pressed }) => [styles.button, { opacity: pressed ? 0.6 : 1 }]}
      >
        <Text style={[text('caption'), { color: colors.muted }]}>덱</Text>
        <Text style={text('caption', { weight: 'bold' })}>{name}</Text>
        <ChevronDownIcon color={colors.muted} size={16} />
      </Pressable>
      {failed ? <Notice tone="danger" title="덱 목록을 불러오지 못했어요" /> : null}
      <Sheet
        visible={open}
        kind="menu"
        triggerRef={triggerRef}
        onClose={() => setOpen(false)}
        actions={decks.map((deck) => ({
          label: deck.name,
          icon: deck.id === deckId ? CheckIcon : DeckIcon,
          onPress: () => onChange(deck.id),
        }))}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: space[4] },
  placeholder: { minHeight: size.touch },
  button: {
    minHeight: size.touch,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: space[2],
  },
});

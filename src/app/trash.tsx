import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ListSection, Notice, PageHeader, TopBar } from '@/components';
import { formatDeletedAgo } from '@/features/trash/format-deleted-ago';
import { TrashRow } from '@/features/trash/components/TrashRow';
import { useTrash } from '@/features/trash/use-trash';
import { useTheme } from '@/theme/ThemeProvider';
import { space } from '@/theme/tokens';
import { goBack } from '@/utils/go-back';

// 휴지통(Trash-1, Trash-4). 삭제한 덱과 카드를 보여 준다. 복구와 영구 삭제는 STA-132, STA-133에서 더한다.
export default function TrashScreen() {
  const { colors, text } = useTheme();
  const insets = useSafeAreaInsets();
  const state = useTrash();
  const empty = state.kind === 'ready' && state.decks.length === 0 && state.cards.length === 0;

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg, paddingTop: insets.top }]}>
      <TopBar leading="back" leadingLabel="설정으로" onLeadingPress={() => goBack('/settings')} />
      <PageHeader title="휴지통" caption="자동으로 비워지지 않아요. 복구하거나 직접 지워 주세요." />
      {state.kind === 'failed' ? (
        <View style={styles.notice}>
          <Notice
            tone="danger"
            title="휴지통을 불러오지 못했어요"
            body="잠시 뒤 다시 열어 주세요."
          />
        </View>
      ) : null}
      {empty ? (
        <View style={styles.empty}>
          <Text style={text('title', { weight: 'bold' })}>휴지통이 비어 있어요</Text>
          <Text style={[text('body'), { color: colors.muted }]}>
            지운 카드와 덱은 여기에 모여요.
          </Text>
        </View>
      ) : null}
      {state.kind === 'ready' && !empty ? (
        <ScrollView style={styles.fill} contentContainerStyle={styles.list}>
          {state.decks.length > 0 ? (
            <ListSection label={`덱 ${state.decks.length}`}>
              {state.decks.map((deck, index) => (
                <TrashRow
                  key={deck.id}
                  deck
                  title={deck.name}
                  sub={`덱 · 카드 ${deck.cardCount}장과 함께 · ${formatDeletedAgo(deck.deletedAt, state.now)}`}
                  last={index === state.decks.length - 1}
                />
              ))}
            </ListSection>
          ) : null}
          {state.cards.length > 0 ? (
            <ListSection label={`카드 ${state.cards.length}`}>
              {state.cards.map((card, index) => (
                <TrashRow
                  key={card.id}
                  title={card.front}
                  sub={[card.back, card.deckName, formatDeletedAgo(card.deletedAt, state.now)]
                    .filter((part) => part !== '')
                    .join(' · ')}
                  last={index === state.cards.length - 1}
                />
              ))}
            </ListSection>
          ) : null}
        </ScrollView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  fill: { flex: 1 },
  list: { paddingHorizontal: space[4] },
  notice: { padding: space[4] },
  // 캔버스: 가운데에 두 줄. 아래 114는 목록일 때 "휴지통 비우기" 버튼이 차지하는 높이와 맞춘 빈자리다.
  empty: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: space[4],
    gap: space[2],
    paddingBottom: 114,
  },
});

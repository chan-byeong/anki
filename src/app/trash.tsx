import { useState, type RefObject } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ListSection, Notice, PageHeader, Sheet, Toast, TopBar } from '@/components';
import { formatDeletedAgo } from '@/features/trash/format-deleted-ago';
import { TrashRow } from '@/features/trash/components/TrashRow';
import { useRestore } from '@/features/trash/use-restore';
import { useTrash } from '@/features/trash/use-trash';
import type { Trash } from '@/storage/store';
import { useTheme } from '@/theme/ThemeProvider';
import { space } from '@/theme/tokens';
import { goBack } from '@/utils/go-back';

type TrashedDeck = Trash['decks'][number];

// 덱 복구 전 안내(Trash-2). 함께 지운 카드만 돌아오고 따로 지운 카드는 남는다(ADR 0018).
const deckRestoreBody = (cardCount: number): string =>
  `${cardCount > 0 ? `덱과 함께 지운 카드 ${cardCount}장이 같이 돌아와요.` : '덱과 함께 지운 카드는 없어요.'} 덱을 지우기 전에 따로 지운 카드는 휴지통에 그대로 남아요.`;

// 휴지통(Trash-1, Trash-2, Trash-4). 삭제한 덱과 카드를 보여 주고 복구한다. 영구 삭제는 STA-133에서 더한다.
// 덱은 줄을 누르든 "복구"를 누르든 안내 시트를 거친다. 카드는 바로 복구한다.
export default function TrashScreen() {
  const { colors, text } = useTheme();
  const insets = useSafeAreaInsets();
  const { state, reload } = useTrash();
  const { restoreDeck, restoreCard, toast, blocked, blockedOpen, dismissBlocked } =
    useRestore(reload);
  // 시트가 닫혀도 덱과 트리거를 남긴다. 내려가는 동안 문구가 비지 않고, 닫힐 때 트리거로 포커스를 돌려준다(ADR 0007).
  const [deckSheet, setDeckSheet] = useState<{
    deck: TrashedDeck;
    trigger: RefObject<View | null>;
  } | null>(null);
  const [deckSheetOpen, setDeckSheetOpen] = useState(false);
  // 안내 시트가 닫힌 뒤 포커스를 돌려줄 카드의 "복구" 버튼.
  const [blockedTrigger, setBlockedTrigger] = useState<RefObject<View | null> | undefined>();
  const empty = state.kind === 'ready' && state.decks.length === 0 && state.cards.length === 0;

  const openDeck = (deck: TrashedDeck) => (trigger: RefObject<View | null>) => {
    setDeckSheet({ deck, trigger });
    setDeckSheetOpen(true);
  };

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
                  onOpen={openDeck(deck)}
                  onRestore={openDeck(deck)}
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
                  onRestore={(trigger) => {
                    setBlockedTrigger(trigger);
                    void restoreCard(card);
                  }}
                />
              ))}
            </ListSection>
          ) : null}
        </ScrollView>
      ) : null}
      {toast ? <Toast message={toast.message} sub={toast.sub} /> : null}
      <Sheet
        visible={deckSheetOpen}
        kind="confirm"
        title={deckSheet?.deck.name}
        body={deckSheet ? deckRestoreBody(deckSheet.deck.cardCount) : undefined}
        triggerRef={deckSheet?.trigger}
        onClose={() => setDeckSheetOpen(false)}
        actions={[
          {
            label: '복구',
            onPress: () => {
              if (deckSheet) void restoreDeck(deckSheet.deck);
            },
          },
          { label: '취소', role: 'cancel', onPress: () => {} },
        ]}
      />
      {/* 덱이 휴지통에 있는 카드를 단독 복구하려 할 때의 안내. 캔버스에 없어 Trash-2 시트의 모양을 따른다. */}
      <Sheet
        visible={blockedOpen}
        kind="confirm"
        title="덱이 휴지통에 있어요"
        body={
          blocked
            ? `이 카드를 복구하려면 먼저 ${blocked.deckName === '' ? '덱' : `${blocked.deckName} 덱`}을 복구해 주세요. 덱을 복구해도 따로 지운 이 카드는 휴지통에 남으니, 그다음에 복구하면 돼요.`
            : undefined
        }
        triggerRef={blockedTrigger}
        onClose={dismissBlocked}
        actions={[{ label: '확인', role: 'cancel', onPress: () => {} }]}
      />
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

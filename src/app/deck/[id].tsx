import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, type ViewInstance } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  Button,
  Collapsible,
  EditIcon,
  ExitingRow,
  FadeSwap,
  MoreIcon,
  Notice,
  PageHeader,
  PlusIcon,
  Sheet,
  TopBar,
  TrashIcon,
} from '@/components';
import { CardRow } from '@/features/cards/components/CardRow';
import { CardSearchField } from '@/features/cards/components/CardSearchField';
import { searchCards } from '@/features/cards/search-cards';
import { useDeckCards } from '@/features/cards/use-deck-cards';
import { useDeck } from '@/features/decks/use-deck';
import { useTrashAction } from '@/features/trash/use-trash-action';
import { useHeldValue } from '@/hooks/use-held-value';
import { useStore } from '@/storage/StoreProvider';
import { useTheme } from '@/theme/ThemeProvider';
import { space } from '@/theme/tokens';
import { goBack } from '@/utils/go-back';

// 덱 상세(Deck-1, Deck-2, Deck-4). 메뉴의 덱 삭제는 확인 없이 덱을 카드와 함께 휴지통으로 보낸다(복구할 수 있다).
export default function DeckScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, retry } = useDeck(id);
  const cards = useDeckCards(id, state.kind === 'ready');
  const loadNotice = state.kind === 'failed' || state.kind === 'missing' ? state.kind : null;
  const shownLoadNotice = useHeldValue(loadNotice);
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const store = useStore();
  const { trash: trashDeck, failed: trashFailed } = useTrashAction(
    () => store.trashDeck(id),
    () => goBack('/'),
  );
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<ViewInstance>(null);
  const [query, setQuery] = useState('');

  const addCard = () => router.push({ pathname: '/card/new', params: { deckId: id } });
  const openCard = (cardId: string) =>
    router.push({ pathname: '/card/[id]', params: { id: cardId } });
  const startReview = () => router.push({ pathname: '/review/[deckId]', params: { deckId: id } });
  // 카드를 읽기 전에는 캡션을 비워 둔다. "카드 0장"이 잠깐 보였다 사라지지 않게 하기 위해서다.
  const caption =
    cards.kind !== 'ready'
      ? undefined
      : cards.cards.length === 0
        ? '카드 0장'
        : `카드 ${cards.cards.length}장 · 오늘 ${cards.todayCount}장`;

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg, paddingTop: insets.top }]}>
      <TopBar
        leading="back"
        leadingLabel="덱 목록으로"
        onLeadingPress={() => goBack('/')}
        trailing={
          state.kind === 'ready'
            ? [
                {
                  ref: menuRef,
                  icon: MoreIcon,
                  label: '덱 메뉴',
                  pressed: menuOpen,
                  onPress: () => setMenuOpen(true),
                },
              ]
            : []
        }
      />
      <PageHeader title={state.kind === 'ready' ? state.deck.name : '덱 상세'} caption={caption} />
      {/* Notice는 높이를 열며 나타나고, 풀리면 접힌다. 접히는 동안에는 마지막 문구를 그대로 보인다. */}
      <Collapsible open={trashFailed}>
        <View style={styles.notice}>
          <Notice tone="danger" title="덱을 삭제하지 못했어요" body="잠시 뒤 다시 해 주세요." />
        </View>
      </Collapsible>
      <Collapsible open={loadNotice !== null}>
        {shownLoadNotice !== null ? (
          <View style={styles.notice}>
            <Notice
              tone={shownLoadNotice === 'failed' ? 'danger' : 'info'}
              title={
                shownLoadNotice === 'failed'
                  ? '덱을 불러오지 못했어요'
                  : '덱이 없거나 휴지통에 있어요'
              }
              action={
                shownLoadNotice === 'failed' ? { label: '다시 시도', onPress: retry } : undefined
              }
            />
          </View>
        ) : null}
      </Collapsible>
      <Collapsible open={state.kind === 'ready' && cards.kind === 'failed'}>
        <View style={styles.notice}>
          <Notice tone="danger" title="카드를 불러오지 못했어요" body="덱을 다시 열어 주세요." />
        </View>
      </Collapsible>
      {/* 처음 읽는 동안에는 비워 둔다. 빈 상태가 잠깐 보였다 사라지지 않게 하기 위해서다. */}
      {state.kind === 'ready' && cards.kind === 'ready' ? (
        <>
          {cards.cards.length === 0 ? (
            <EmptyCards />
          ) : (
            <>
              <View style={styles.search}>
                <CardSearchField value={query} onChangeText={setQuery} />
              </View>
              <CardList cards={cards.cards} query={query} onOpen={openCard} />
            </>
          )}
          <View style={[styles.footer, { paddingBottom: space[2] + insets.bottom }]}>
            {cards.cards.length === 0 ? (
              <Button label="카드 추가" onPress={addCard} />
            ) : (
              <View style={styles.actions}>
                <View style={styles.fill}>
                  {cards.todayCount > 0 ? (
                    <Button
                      label="복습 시작"
                      count={`${cards.todayCount}장`}
                      onPress={startReview}
                    />
                  ) : null}
                </View>
                <Button label="카드 추가" icon={PlusIcon} variant="secondary" onPress={addCard} />
              </View>
            )}
          </View>
        </>
      ) : null}
      <Sheet
        visible={menuOpen && state.kind === 'ready'}
        kind="menu"
        triggerRef={menuRef}
        onClose={() => setMenuOpen(false)}
        actions={[
          {
            label: '덱 편집',
            icon: EditIcon,
            onPress: () => router.push({ pathname: '/deck/[id]/edit', params: { id } }),
          },
          {
            label: '덱 삭제',
            icon: TrashIcon,
            danger: true,
            description:
              cards.kind === 'ready'
                ? `카드 ${cards.cards.length}장과 함께 휴지통으로 옮겨요. 복구할 수 있어요.`
                : '카드와 함께 휴지통으로 옮겨요. 복구할 수 있어요.',
            onPress: trashDeck,
          },
        ]}
      />
    </View>
  );
}

function EmptyCards() {
  const { colors, text } = useTheme();

  return (
    <View style={styles.empty}>
      <Text style={text('title', { weight: 'bold' })}>아직 카드가 없어요</Text>
      <Text style={[text('body'), { color: colors.muted }]}>
        {'앞면과 뒷면만 적으면 돼요.\n메모와 이미지는 나중에 더해도 돼요.'}
      </Text>
    </View>
  );
}

interface CardListProps {
  cards: { id: string; front: string; back: string; hint: string | null; memo: string | null }[];
  query: string;
  onOpen: (cardId: string) => void;
}

function CardList({ cards, query, onOpen }: CardListProps) {
  const { colors, text } = useTheme();
  const searching = query.trim() !== '';
  const shown = searchCards(cards, query);

  return (
    <>
      {searching ? (
        <Text
          role="status"
          style={[text('caption'), styles.count, { color: colors.muted }]}
        >{`${shown.length}장`}</Text>
      ) : null}
      {/* 검색 결과가 0개가 되면 빈 안내가 페이드로 들어온다. 행은 움직이지 않는다. */}
      <FadeSwap swapKey={shown.length === 0 ? 'none' : 'list'} style={styles.fill}>
        {shown.length === 0 ? (
          <View style={styles.empty}>
            <Text style={text('title', { weight: 'bold' })}>검색 결과가 없어요</Text>
            <Text style={[text('body'), { color: colors.muted }]}>다른 검색어로 찾아보세요.</Text>
          </View>
        ) : (
          <ScrollView
            style={styles.fill}
            contentContainerStyle={styles.list}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          >
            <View
              accessibilityRole="list"
              accessibilityLabel={searching ? '검색 결과' : '카드 목록'}
            >
              {/* 휴지통으로 옮긴 카드는 페이드로 빠지고 아래 행이 올라온다. 검색으로 걸러질 때는 움직이지 않는다. */}
              {shown.map((card, index) => (
                <ExitingRow key={card.id} animated={!searching}>
                  <CardRow
                    front={card.front}
                    back={card.back}
                    status="신규"
                    highlight={query}
                    onPress={() => onOpen(card.id)}
                    last={index === shown.length - 1}
                  />
                </ExitingRow>
              ))}
            </View>
          </ScrollView>
        )}
      </FadeSwap>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  fill: { flex: 1 },
  notice: { padding: space[4] },
  search: { paddingHorizontal: space[4], paddingBottom: space[2] },
  count: { paddingHorizontal: space[4], paddingTop: space[1] },
  list: { paddingHorizontal: space[4] },
  empty: { flex: 1, justifyContent: 'center', paddingHorizontal: space[4], gap: space[2] },
  footer: { paddingTop: space[3], paddingHorizontal: space[4] },
  actions: { flexDirection: 'row', gap: space[2] },
});

import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, IconButton, Notice, PlusIcon, SettingsIcon, StatsIcon } from '@/components';
import { DeckRow } from '@/features/decks/components/DeckRow';
import { useDeckList, type DeckListItem } from '@/features/decks/use-deck-list';
import { useTheme } from '@/theme/ThemeProvider';
import { size, space } from '@/theme/tokens';

const openNewDeck = () => router.push('/deck/new');

export default function HomeScreen() {
  const { colors, text } = useTheme();
  const insets = useSafeAreaInsets();
  const state = useDeckList();

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text accessibilityRole="header" style={text('display', { weight: 'bold' })}>
          덱
        </Text>
        <View style={styles.actions}>
          <IconButton icon={PlusIcon} label="덱 추가" onPress={openNewDeck} />
          <IconButton icon={StatsIcon} label="통계" onPress={() => router.push('/stats')} />
          <IconButton icon={SettingsIcon} label="설정" onPress={() => router.push('/settings')} />
        </View>
      </View>
      {/* 처음 읽는 동안에는 비워 둔다. 빈 상태가 잠깐 보였다 사라지지 않게 하기 위해서다. */}
      {state.kind === 'failed' ? (
        <View style={styles.notice}>
          <Notice tone="danger" title="덱 목록을 불러오지 못했어요" body="앱을 다시 열어 주세요." />
        </View>
      ) : null}
      {state.kind === 'ready' && state.items.length === 0 ? <EmptyDecks /> : null}
      {state.kind === 'ready' && state.items.length > 0 ? <DeckList items={state.items} /> : null}
    </View>
  );
}

function DeckList({ items }: { items: DeckListItem[] }) {
  const { text } = useTheme();
  const insets = useSafeAreaInsets();
  const allDone = items.every((item) => item.todayCount === 0);

  return (
    <>
      <ScrollView style={styles.fill} contentContainerStyle={styles.list}>
        <View accessibilityRole="list" accessibilityLabel="덱 목록">
          {items.map(({ deck, todayCount }, index) => (
            <DeckRow
              key={deck.id}
              name={deck.name}
              todayCount={todayCount}
              onStartReview={() =>
                router.push({ pathname: '/review/[deckId]', params: { deckId: deck.id } })
              }
              onOpenDeck={() => router.push({ pathname: '/deck/[id]', params: { id: deck.id } })}
              last={index === items.length - 1}
            />
          ))}
        </View>
      </ScrollView>
      {/* 다음 복습일 줄("내일 42장")은 복습일 계산이 생기는 STA-118 이후에 더한다. */}
      {allDone ? (
        <View style={[styles.footer, styles.centered, { paddingBottom: space[2] + insets.bottom }]}>
          <Text style={text('body', { weight: 'bold' })}>오늘 복습할 카드 없음</Text>
        </View>
      ) : null}
    </>
  );
}

function EmptyDecks() {
  const { colors, text } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <>
      <View style={styles.empty}>
        <Text style={text('title', { weight: 'bold' })}>아직 덱이 없어요</Text>
        <Text style={[text('body'), { color: colors.muted }]}>
          {'덱을 만들고 카드를 넣으면\n여기서 바로 복습할 수 있어요.'}
        </Text>
      </View>
      <View style={[styles.footer, { paddingBottom: space[2] + insets.bottom }]}>
        <Button label="덱 만들기" onPress={openNewDeck} />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  fill: { flex: 1 },
  header: {
    paddingTop: space[2],
    paddingLeft: space[4],
    paddingRight: size.edgeIcon,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  actions: { flexDirection: 'row' },
  notice: { padding: space[4] },
  list: { paddingTop: space[3], paddingHorizontal: space[4] },
  empty: { flex: 1, justifyContent: 'center', paddingHorizontal: space[4], gap: space[2] },
  footer: { paddingTop: space[3], paddingHorizontal: space[4] },
  centered: { alignItems: 'center' },
});

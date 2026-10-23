import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { BackHandler, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  Button,
  CloseIcon,
  IconButton,
  InboxIcon,
  Notice,
  PlusIcon,
  Sheet,
  SettingsIcon,
  StatsIcon,
} from '@/components';
import { DeckRow } from '@/features/decks/components/DeckRow';
import { useLongPressGuide } from '@/features/decks/use-long-press-guide';
import { useDeckList, type DeckListItem } from '@/features/decks/use-deck-list';
import { joinDeckIds } from '@/features/review/deck-ids';
import { useLowSpace } from '@/features/storage-status/use-low-space';
import { useTheme } from '@/theme/ThemeProvider';
import { size, space } from '@/theme/tokens';

const openNewDeck = () => router.push('/deck/new');

export default function HomeScreen() {
  const { colors, text } = useTheme();
  const insets = useSafeAreaInsets();
  const state = useDeckList();
  const lowSpace = useLowSpace();
  // 여러 덱 선택 모드. null이면 선택 모드가 아니고, 아니면 선택한 덱 ID들이다.
  const [chosen, setSelected] = useState<string[] | null>(null);
  // 선택 중에 덱이 지워지거나 오늘 복습이 끝나면 선택에서 뺀다. 개수와 합계가 어긋나지 않게 한다.
  const selected =
    chosen !== null && state.kind === 'ready'
      ? state.items
          .filter(({ deck, todayCount }) => chosen.includes(deck.id) && todayCount > 0)
          .map(({ deck }) => deck.id)
      : chosen;

  // 안드로이드 뒤로가기는 앱을 나가지 않고 선택 모드만 닫는다.
  const selecting = chosen !== null;
  useEffect(() => {
    if (!selecting) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      setSelected(null);
      return true;
    });
    return () => subscription.remove();
  }, [selecting]);

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg, paddingTop: insets.top }]}>
      {selected === null ? (
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
      ) : (
        <View style={[styles.header, styles.selectHeader]}>
          <IconButton icon={CloseIcon} label="선택 끝내기" onPress={() => setSelected(null)} />
          <Text
            accessibilityRole="header"
            accessibilityLiveRegion="polite"
            aria-live="polite"
            style={text('title', { weight: 'bold' })}
          >
            {`${selected.length}개 선택`}
          </Text>
        </View>
      )}
      {lowSpace ? (
        <View style={styles.lowSpace}>
          <Notice
            tone="danger"
            icon={InboxIcon}
            title="저장 공간이 거의 찼어요"
            body="새 카드와 이미지를 저장하지 못할 수 있어요. 기기 공간을 정리해 주세요."
          />
        </View>
      ) : null}
      {/* 처음 읽는 동안에는 비워 둔다. 빈 상태가 잠깐 보였다 사라지지 않게 하기 위해서다. */}
      {state.kind === 'failed' ? (
        <View style={styles.notice}>
          <Notice tone="danger" title="덱 목록을 불러오지 못했어요" body="앱을 다시 열어 주세요." />
        </View>
      ) : null}
      {state.kind === 'ready' && state.items.length === 0 ? <EmptyDecks /> : null}
      {state.kind === 'ready' && state.items.length > 0 ? (
        <DeckList items={state.items} selected={selected} onSelectedChange={setSelected} />
      ) : null}
    </View>
  );
}

interface DeckListProps {
  items: DeckListItem[];
  selected: string[] | null;
  onSelectedChange: (selected: string[] | null) => void;
}

function DeckList({ items, selected, onSelectedChange }: DeckListProps) {
  const { text } = useTheme();
  const insets = useSafeAreaInsets();
  const allDone = items.every((item) => item.todayCount === 0);
  const [menuDeckId, setMenuDeckId] = useState<string | null>(null);
  const guide = useLongPressGuide(!allDone);
  const selectedCount = items
    .filter(({ deck }) => selected?.includes(deck.id))
    .reduce((sum, item) => sum + item.todayCount, 0);

  const toggle = (deckId: string) => {
    if (selected === null) return;
    onSelectedChange(
      selected.includes(deckId) ? selected.filter((id) => id !== deckId) : [...selected, deckId],
    );
  };
  // 목록에 보이는 순서대로 이어서 같은 선택은 같은 경로가 된다.
  const startSelected = () => {
    const deckIds = items.map(({ deck }) => deck.id).filter((id) => selected?.includes(id));
    onSelectedChange(null);
    router.push({ pathname: '/review/[deckId]', params: { deckId: joinDeckIds(deckIds) } });
  };

  return (
    <>
      {guide.visible && selected === null ? (
        <View style={styles.guide}>
          <Notice
            line
            title="덱을 길게 누르면 여러 덱을 함께 복습할 수 있어요"
            action={{ label: '닫기', onPress: guide.dismiss }}
          />
        </View>
      ) : null}
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
              onOpenMenu={() => setMenuDeckId(deck.id)}
              onEnterSelect={() => onSelectedChange([deck.id])}
              selected={selected === null ? undefined : selected.includes(deck.id)}
              onToggleSelect={() => toggle(deck.id)}
              last={index === items.length - 1}
            />
          ))}
        </View>
      </ScrollView>
      {/* 다음 복습일 줄("내일 42장")은 복습일 계산이 생기는 STA-118 이후에 더한다. */}
      {selected !== null ? (
        <View style={[styles.footer, { paddingBottom: space[2] + insets.bottom }]}>
          <Button
            label="복습 시작"
            count={`${selectedCount}장`}
            disabled={selectedCount === 0}
            onPress={startSelected}
          />
        </View>
      ) : allDone ? (
        <View style={[styles.footer, styles.centered, { paddingBottom: space[2] + insets.bottom }]}>
          <Text style={text('body', { weight: 'bold' })}>오늘 복습할 카드 없음</Text>
        </View>
      ) : null}
      <Sheet
        visible={menuDeckId !== null}
        kind="menu"
        onClose={() => setMenuDeckId(null)}
        actions={[
          {
            label: '덱 상세',
            onPress: () =>
              router.push({ pathname: '/deck/[id]', params: { id: menuDeckId ?? '' } }),
          },
          { label: '여러 덱 선택', onPress: () => onSelectedChange([menuDeckId ?? '']) },
        ]}
      />
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
  selectHeader: { paddingLeft: size.edgeIcon, justifyContent: 'flex-start', gap: space[1] },
  notice: { padding: space[4] },
  lowSpace: { paddingTop: space[2], paddingHorizontal: space[4] },
  guide: { paddingHorizontal: space[4] },
  list: { paddingTop: space[3], paddingHorizontal: space[4] },
  empty: { flex: 1, justifyContent: 'center', paddingHorizontal: space[4], gap: space[2] },
  footer: { paddingTop: space[3], paddingHorizontal: space[4] },
  centered: { alignItems: 'center' },
});

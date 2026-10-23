import { useRef, useState, type RefObject } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, ListSection, Notice, PageHeader, Sheet, Toast, TopBar } from '@/components';
import { formatDeletedAgo } from '@/features/trash/format-deleted-ago';
import { TrashRow } from '@/features/trash/components/TrashRow';
import { useTrash, type TrashedCard } from '@/features/trash/use-trash';
import { useTrashActions, type TrashResult } from '@/features/trash/use-trash-actions';
import type { Trash } from '@/storage/store';
import { useTheme } from '@/theme/ThemeProvider';
import { space } from '@/theme/tokens';
import { goBack } from '@/utils/go-back';
import { moveFocus } from '@/utils/move-focus';

type TrashedDeck = Trash['decks'][number];
type Target = { kind: 'deck'; deck: TrashedDeck } | { kind: 'card'; card: TrashedCard };

const GONE = '그 학습 이력이 모두 사라져요. 되돌릴 수 없어요.';

// 덱 복구 전 안내(Trash-2). 함께 지운 카드만 돌아오고 따로 지운 카드는 남는다(ADR 0018).
const deckRestoreBody = (cardCount: number): string =>
  `${cardCount > 0 ? `덱과 함께 지운 카드 ${cardCount}장이 같이 돌아와요.` : '덱과 함께 지운 카드는 없어요.'} 덱을 지우기 전에 따로 지운 카드는 휴지통에 그대로 남아요.`;

// 영구 삭제 확인(Trash-3). 덱의 카드 수에는 그 덱에서 먼저 따로 지운 카드도 더한다. 함께 지워지기 때문이다(ADR 0018).
const deleteBody = (target: Target, separateCards: number): string => {
  if (target.kind === 'card') return `${target.card.front} 카드와 ${GONE}`;
  const cards = target.deck.cardCount + separateCards;
  return cards > 0
    ? `${target.deck.name} 덱과 카드 ${cards}장, ${GONE}`
    : `${target.deck.name} 덱이 사라져요. 되돌릴 수 없어요.`;
};

// 휴지통 비우기 확인. 캔버스에 없어 Trash-3의 문구를 따른다. 마지막 낱말에 맞춰 조사를 고른다.
const emptyBody = (decks: number, cards: number): string => {
  const parts = [decks > 0 ? `덱 ${decks}개` : '', cards > 0 ? `카드 ${cards}장` : ''].filter(
    (part) => part !== '',
  );
  return `${parts.join(', ')}${cards > 0 ? '과' : '와'} ${GONE}`;
};

// 휴지통(Trash-1~4). 삭제한 덱과 카드를 보여 주고 복구하거나 영구 삭제한다.
// 줄을 누르면 복구와 영구 삭제를 고르는 시트가 열린다. 덱은 "복구"를 눌러도 이 시트를 거치고, 카드는 바로 복구한다.
// 영구 삭제는 확인 시트를 한 번 더 거친다.
export default function TrashScreen() {
  const { colors, text } = useTheme();
  const insets = useSafeAreaInsets();
  const { state, reload } = useTrash();
  const actions = useTrashActions(reload);
  const headingRef = useRef<Text>(null);
  // 시트가 닫혀도 대상과 트리거를 남긴다. 내려가는 동안 문구가 비지 않고, 닫힐 때 트리거로 포커스를 돌려준다(ADR 0007).
  const [item, setItem] = useState<{ target: Target; trigger: RefObject<View | null> } | null>(
    null,
  );
  const [itemOpen, setItemOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  // 확인 문구는 열 때 정해 둔다. 지운 뒤 목록을 다시 읽어도 내려가는 시트의 숫자가 바뀌지 않는다.
  const [deleteText, setDeleteText] = useState('');
  const [emptyText, setEmptyText] = useState('');
  // 영구 삭제 확인으로 넘어갈 때는 첫 시트가 포커스를 돌려주지 않고, 다 닫힌 뒤 확인 시트를 연다.
  // 확인 시트가 닫힐 때 포커스를 돌려준다.
  const [handingOff, setHandingOff] = useState(false);
  const [emptyOpen, setEmptyOpen] = useState(false);
  const emptyRef = useRef<View>(null);
  // 덱이 휴지통에 있어 복구하지 못한 카드. 안내를 닫아도 남겨서 내려가는 동안 문구가 비지 않게 한다.
  const [blocked, setBlocked] = useState<TrashedCard | null>(null);
  const [blockedOpen, setBlockedOpen] = useState(false);
  // 안내 시트가 닫힌 뒤 포커스를 돌려줄, 카드를 복구하려고 누른 요소.
  const [blockedTrigger, setBlockedTrigger] = useState<RefObject<View | null> | undefined>();
  // 시트가 완전히 닫히면 부른다. 한 번에 시트 하나만 열리므로 하나로 충분하다.
  const sheetClosed = useRef<() => void>(() => {});
  const empty = state.kind === 'ready' && state.decks.length === 0 && state.cards.length === 0;

  const open = (target: Target) => (trigger: RefObject<View | null>) => {
    setItem({ target, trigger });
    setHandingOff(false);
    setItemOpen(true);
  };

  const untilClosed = () =>
    new Promise<void>((resolve) => {
      sheetClosed.current = resolve;
    });

  // 작업과 시트 닫힘을 모두 기다린다. 성공하면 누른 줄이나 버튼이 사라지므로 제목으로 포커스를 보낸다(ADR 0007).
  // 복구하지 못한 카드의 안내도 시트가 다 닫힌 뒤 연다. iOS는 닫히는 Modal 위에 Modal을 띄우지 못할 수 있다.
  const settle = async (
    result: Promise<TrashResult>,
    closed: Promise<void>,
    card?: TrashedCard,
  ) => {
    const [outcome] = await Promise.all([result, closed]);
    if (outcome === 'done' && headingRef.current) moveFocus(headingRef.current);
    if (outcome === 'blocked' && card) {
      setBlocked(card);
      setBlockedOpen(true);
    }
  };

  const restore = (target: Target, trigger: RefObject<View | null>, closed: Promise<void>) => {
    if (target.kind === 'deck') {
      void settle(actions.restoreDeck(target.deck), closed);
      return;
    }
    setBlockedTrigger(trigger);
    void settle(actions.restoreCard(target.card), closed, target.card);
  };

  const separateCards = (target: Target): number =>
    state.kind === 'ready' && target.kind === 'deck'
      ? state.cards.filter((card) => card.deckId === target.deck.id).length
      : 0;

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg, paddingTop: insets.top }]}>
      <TopBar leading="back" leadingLabel="설정으로" onLeadingPress={() => goBack('/settings')} />
      <PageHeader
        ref={headingRef}
        title="휴지통"
        caption="자동으로 비워지지 않아요. 복구하거나 직접 지워 주세요."
      />
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
                  onOpen={open({ kind: 'deck', deck })}
                  onRestore={open({ kind: 'deck', deck })}
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
                  onOpen={open({ kind: 'card', card })}
                  onRestore={(trigger) =>
                    restore({ kind: 'card', card }, trigger, Promise.resolve())
                  }
                />
              ))}
            </ListSection>
          ) : null}
        </ScrollView>
      ) : null}
      {state.kind === 'ready' && !empty ? (
        <View style={[styles.footer, { paddingBottom: space[2] + insets.bottom }]}>
          <Button
            ref={emptyRef}
            variant="ghost"
            dangerText
            label="휴지통 비우기"
            onPress={() => {
              setEmptyText(
                emptyBody(
                  state.decks.length,
                  state.decks.reduce((sum, deck) => sum + deck.cardCount, state.cards.length),
                ),
              );
              setEmptyOpen(true);
            }}
          />
        </View>
      ) : null}
      {actions.toast ? <Toast message={actions.toast.message} sub={actions.toast.sub} /> : null}
      {/* 덱은 Trash-2. 카드는 캔버스에 없어 같은 모양에 앞면과 뒷면, 덱 이름을 보인다. */}
      <Sheet
        visible={itemOpen}
        kind="confirm"
        title={
          item
            ? item.target.kind === 'deck'
              ? item.target.deck.name
              : item.target.card.front
            : undefined
        }
        body={
          item
            ? item.target.kind === 'deck'
              ? deckRestoreBody(item.target.deck.cardCount)
              : [item.target.card.back, item.target.card.deckName]
                  .filter((part) => part !== '')
                  .join(' · ')
            : undefined
        }
        triggerRef={handingOff ? undefined : item?.trigger}
        onClose={() => setItemOpen(false)}
        onClosed={() => {
          sheetClosed.current();
          if (handingOff) setDeleteOpen(true);
        }}
        actions={[
          {
            label: '복구',
            onPress: () => {
              if (item) restore(item.target, item.trigger, untilClosed());
            },
          },
          {
            label: '영구 삭제',
            danger: true,
            onPress: () => {
              if (!item) return;
              setDeleteText(deleteBody(item.target, separateCards(item.target)));
              setHandingOff(true);
            },
          },
          { label: '취소', role: 'cancel', onPress: () => {} },
        ]}
      />
      <Sheet
        visible={deleteOpen}
        kind="confirm"
        title="영구 삭제할까요?"
        body={deleteText}
        triggerRef={item?.trigger}
        onClose={() => setDeleteOpen(false)}
        onClosed={() => sheetClosed.current()}
        actions={[
          {
            label: '영구 삭제',
            destructive: true,
            onPress: () => {
              if (!item) return;
              void settle(
                item.target.kind === 'deck'
                  ? actions.deleteDeck(item.target.deck)
                  : actions.deleteCard(item.target.card),
                untilClosed(),
              );
            },
          },
          { label: '취소', role: 'cancel', onPress: () => {} },
        ]}
      />
      <Sheet
        visible={emptyOpen}
        kind="confirm"
        title="휴지통을 비울까요?"
        body={emptyText}
        triggerRef={emptyRef}
        onClose={() => setEmptyOpen(false)}
        onClosed={() => sheetClosed.current()}
        actions={[
          {
            label: '휴지통 비우기',
            destructive: true,
            onPress: () => void settle(actions.emptyTrash(), untilClosed()),
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
        onClose={() => setBlockedOpen(false)}
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
  // 캔버스 Trash-1: 목록 아래에 붙은 "휴지통 비우기".
  footer: { paddingTop: space[3], paddingHorizontal: space[4] },
  // 캔버스: 가운데에 두 줄. 아래 114는 목록일 때 "휴지통 비우기" 버튼이 차지하는 높이와 맞춘 빈자리다.
  empty: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: space[4],
    gap: space[2],
    paddingBottom: 114,
  },
});

import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Field, Notice, TopBar, TrashIcon } from '@/components';
import { useCard } from '@/features/cards/use-card';
import { useTrashAction } from '@/features/trash/use-trash-action';
import { useDeckName } from '@/features/decks/use-deck-name';
import type { Card } from '@/storage/store';
import { useStore } from '@/storage/StoreProvider';
import { useTheme } from '@/theme/ThemeProvider';
import { space } from '@/theme/tokens';
import { goBack } from '@/utils/go-back';

const close = () => goBack('/');

// 카드 편집(Card-2). 앞면·뒷면·메모를 고친다.
// 위쪽의 삭제 버튼은 확인 없이 카드를 휴지통으로 보낸다(복구할 수 있다). 덱 바꾸기와 이미지는 이 화면에 더하지 않았다.
export default function EditCardScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const state = useCard(id);
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const store = useStore();

  const { trash, failed: trashFailed } = useTrashAction(() => store.trashCard(id), close);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      // iOS 모달 시트는 상태 표시줄 아래에서 시작하므로 위쪽 여백이 필요 없다.
      style={[
        styles.screen,
        { backgroundColor: colors.bg, paddingTop: Platform.OS === 'ios' ? 0 : insets.top },
      ]}
    >
      <TopBar
        leading="close"
        leadingLabel="닫기"
        onLeadingPress={close}
        title="카드 편집"
        trailing={
          state.kind === 'ready'
            ? [{ icon: TrashIcon, label: '카드 삭제 (휴지통으로)', onPress: trash }]
            : []
        }
      />
      {trashFailed ? (
        <View style={styles.notice}>
          <Notice tone="danger" title="카드를 삭제하지 못했어요" body="잠시 뒤 다시 해 주세요." />
        </View>
      ) : null}
      {state.kind === 'ready' ? <EditForm card={state.card} /> : null}
      {state.kind === 'missing' || state.kind === 'failed' ? (
        <View style={styles.notice}>
          <Notice
            tone={state.kind === 'failed' ? 'danger' : 'info'}
            title={
              state.kind === 'failed' ? '카드를 불러오지 못했어요' : '카드가 없거나 휴지통에 있어요'
            }
          />
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}

interface EditFormProps {
  card: Card;
}

function EditForm({ card }: EditFormProps) {
  const store = useStore();
  const { colors, text } = useTheme();
  const insets = useSafeAreaInsets();
  const deckName = useDeckName(card.deckId);
  const [front, setFront] = useState(card.front);
  const [back, setBack] = useState(card.back);
  const [hint, setHint] = useState(card.hint ?? '');
  const [memo, setMemo] = useState(card.memo ?? '');
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  const missing = front.trim() === '' || back.trim() === '';
  const canSave = !missing && !saving;

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    setFailed(false);
    try {
      // 값이 그대로인 필드는 Store가 건너뛰므로 고친 필드의 수정 시각만 바뀐다.
      await store.updateCard(card.id, {
        front: front.trim(),
        back: back.trim(),
        hint: hint.trim() === '' ? null : hint.trim(),
        memo: memo.trim() === '' ? null : memo.trim(),
      });
      close();
    } catch {
      setFailed(true);
      setSaving(false);
    }
  };

  return (
    <>
      <ScrollView
        style={styles.fill}
        contentContainerStyle={styles.form}
        keyboardShouldPersistTaps="handled"
      >
        {deckName ? (
          <Text
            accessibilityLabel={`덱: ${deckName}`}
            style={[text('caption'), { color: colors.muted }]}
          >
            {'덱  '}
            <Text style={[text('caption', { weight: 'bold' }), { color: colors.text }]}>
              {deckName}
            </Text>
          </Text>
        ) : null}
        <Field label="앞면" size="title" first multiline value={front} onChangeText={setFront} />
        <Field label="뒷면" multiline value={back} onChangeText={setBack} />
        <Field label="힌트" optional multiline value={hint} onChangeText={setHint} />
        <Field label="메모" optional multiline value={memo} onChangeText={setMemo} />
        {failed ? (
          <Notice tone="danger" title="카드를 저장하지 못했어요" body="잠시 뒤 다시 해 주세요." />
        ) : null}
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: space[2] + insets.bottom }]}>
        <Button label="저장" onPress={save} disabled={!canSave} />
        {missing ? (
          <Text style={[text('caption'), styles.hint, { color: colors.muted }]}>
            앞면과 뒷면을 적으면 저장할 수 있어요
          </Text>
        ) : null}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  fill: { flex: 1 },
  notice: { padding: space[4] },
  form: { paddingTop: space[1], paddingHorizontal: space[4], gap: space[2] },
  footer: { paddingTop: space[3], paddingHorizontal: space[4], gap: space[2] },
  hint: { textAlign: 'center' },
});

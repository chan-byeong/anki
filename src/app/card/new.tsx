import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Field, Notice, TopBar } from '@/components';
import { useDeckName } from '@/features/decks/use-deck-name';
import { saveFailureMessage } from '@/features/storage-status/storage-status';
import { useStore } from '@/storage/StoreProvider';
import { useTheme } from '@/theme/ThemeProvider';
import { space } from '@/theme/tokens';

// 카드 추가(Card-1, Card-5). 저장하면 닫지 않고 폼을 비워 이어서 입력한다.
// 덱 바꾸기와 이미지 추가는 이 화면에 더하지 않았다(이미지는 STA-129).
export default function NewCardScreen() {
  const { deckId } = useLocalSearchParams<{ deckId: string }>();
  const store = useStore();
  const { colors, text } = useTheme();
  const insets = useSafeAreaInsets();
  const deckName = useDeckName(deckId);
  const [front, setFront] = useState('');
  const [back, setBack] = useState('');
  const [hint, setHint] = useState('');
  const [memo, setMemo] = useState('');
  const [added, setAdded] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  // 저장할 때마다 바꿔서 입력창을 새로 만든다. multiline 입력창은 값을 비워도 긴 글로 커진 높이가 남는다.
  const [formKey, setFormKey] = useState(0);
  const canSave = front.trim() !== '' && back.trim() !== '' && !saving;

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    setFailure(null);
    try {
      const card = await store.createCard(deckId, {
        front: front.trim(),
        back: back.trim(),
        hint: hint.trim() === '' ? undefined : hint.trim(),
        memo: memo.trim() === '' ? undefined : memo.trim(),
      });
      setAdded(card.front);
      setFront('');
      setBack('');
      setHint('');
      setMemo('');
      setFormKey((key) => key + 1);
    } catch (error) {
      setFailure(saveFailureMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      // iOS 모달 시트는 상태 표시줄 아래에서 시작하므로 위쪽 여백이 필요 없다.
      style={[
        styles.screen,
        { backgroundColor: colors.bg, paddingTop: Platform.OS === 'ios' ? 0 : insets.top },
      ]}
    >
      <TopBar leading="close" leadingLabel="닫기" onLeadingPress={router.back} title="카드 추가" />
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
        {added !== null ? (
          <Text accessibilityRole="alert" style={[text('caption'), { color: colors.muted }]}>
            {`방금 추가 · ${added}`}
          </Text>
        ) : null}
        <Field
          key={`front-${formKey}`}
          label="앞면"
          size="title"
          first
          autoFocus
          multiline
          placeholder="단어나 질문"
          value={front}
          onChangeText={setFront}
        />
        <Field
          key={`back-${formKey}`}
          label="뒷면"
          multiline
          placeholder="뜻이나 답"
          value={back}
          onChangeText={setBack}
        />
        {/* 캔버스(Card-1, Card-5)에는 힌트 칸이 없어 메모 칸과 같은 모양으로 둔다(ADR 0017). */}
        <Field
          key={`hint-${formKey}`}
          label="힌트"
          optional
          multiline
          placeholder="정답을 떠올릴 단서"
          value={hint}
          onChangeText={setHint}
        />
        <Field
          key={`memo-${formKey}`}
          label="메모"
          optional
          multiline
          placeholder="예문, 설명"
          value={memo}
          onChangeText={setMemo}
        />
        {failure ? <Notice tone="danger" title="카드를 저장하지 못했어요" body={failure} /> : null}
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: space[2] + insets.bottom }]}>
        <Button label="저장" onPress={save} disabled={!canSave} />
        {front.trim() === '' || back.trim() === '' ? (
          <Text style={[text('caption'), styles.hint, { color: colors.muted }]}>
            앞면과 뒷면을 적으면 저장할 수 있어요
          </Text>
        ) : null}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  fill: { flex: 1 },
  form: { paddingTop: space[1], paddingHorizontal: space[4], gap: space[2] },
  footer: { paddingTop: space[3], paddingHorizontal: space[4], gap: space[2] },
  hint: { textAlign: 'center' },
});

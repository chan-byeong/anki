import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Field, Notice, TopBar } from '@/components';
import { useStore } from '@/storage/StoreProvider';
import { useTheme } from '@/theme/ThemeProvider';
import { space } from '@/theme/tokens';

// 덱 만들기(DeckForm-1). 기본 발음 언어 선택과 빈 이름 안내는 덱 편집(STA-113)에서 더한다.
export default function NewDeckScreen() {
  const store = useStore();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  const canSave = name.trim() !== '' && !saving;

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    setFailed(false);
    try {
      await store.createDeck({ name: name.trim() });
      router.back();
    } catch {
      setFailed(true);
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
      <TopBar leading="close" leadingLabel="닫기" onLeadingPress={router.back} title="덱 만들기" />
      <ScrollView
        style={styles.fill}
        contentContainerStyle={styles.form}
        keyboardShouldPersistTaps="handled"
      >
        <Field
          label="이름"
          size="title"
          first
          autoFocus
          value={name}
          onChangeText={setName}
          returnKeyType="done"
          onSubmitEditing={save}
        />
        {failed ? (
          <Notice tone="danger" title="덱을 만들지 못했어요" body="잠시 뒤 다시 해 주세요." />
        ) : null}
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: space[2] + insets.bottom }]}>
        <Button label="만들기" onPress={save} disabled={!canSave} />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  fill: { flex: 1 },
  form: { paddingTop: space[3], paddingHorizontal: space[4], gap: space[3] },
  footer: { paddingTop: space[2], paddingHorizontal: space[4] },
});

import { router, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState, type ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, CheckIcon, Field, Notice, TopBar } from '@/components';
import { StoreError, type Deck } from '@/storage/store';
import { saveFailureBody } from '@/features/storage-status/storage-status';
import { useStore } from '@/storage/StoreProvider';
import { useTheme } from '@/theme/ThemeProvider';
import { size, space } from '@/theme/tokens';

// DeckForm-1/2. 발음 미리듣기·기기 음성 확인과 추가 언어는 후속 작업에서 연결한다.
const languages = [
  { value: null, label: '없음' },
  { value: 'ja', label: '일본어' },
  { value: 'en', label: '영어' },
  { value: 'ko', label: '한국어' },
] as const;

// 직접 연 경로에도 닫기/돌아가기 목적지를 제공한다.
export const closeDeckForm = () => {
  if (router.canGoBack()) router.back();
  else router.replace('/');
};

export function DeckFormFrame({
  editing,
  children,
  footer,
}: {
  editing: boolean;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      // iOS 모달은 상태 표시줄 아래에서 시작한다.
      style={[
        styles.screen,
        { backgroundColor: colors.bg, paddingTop: Platform.OS === 'ios' ? 0 : insets.top },
      ]}
    >
      <TopBar
        leading="close"
        leadingLabel="닫기"
        onLeadingPress={closeDeckForm}
        title={editing ? '덱 편집' : '덱 만들기'}
      />
      <ScrollView
        style={styles.fill}
        contentContainerStyle={styles.form}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>
      {footer ? (
        <View style={[styles.footer, { paddingBottom: space[2] + insets.bottom }]}>{footer}</View>
      ) : null}
    </KeyboardAvoidingView>
  );
}

// 조회가 끝나고 마운트할 때 저장된 값으로 한 번만 초기화한다.
export function DeckForm({ deck }: { deck?: Deck }) {
  const store = useStore();
  const { colors, text } = useTheme();
  const [name, setName] = useState(deck?.name ?? '');
  const [language, setLanguage] = useState(deck?.language ?? null);
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [missing, setMissing] = useState(false);
  const submitting = useRef(false);
  const active = useRef(true);
  const editing = deck !== undefined;
  const empty = name.trim() === '';

  useFocusEffect(
    useCallback(() => {
      active.current = true;
      return () => {
        active.current = false;
      };
    }, []),
  );

  const save = async () => {
    // state 반영 전 완료 키/버튼이 연달아 들어와도 한 번만 저장한다.
    if (empty || submitting.current) return;
    submitting.current = true;
    setSaving(true);
    setFailure(null);
    try {
      const input = { name: name.trim(), language };
      if (deck) await store.updateDeck(deck.id, input);
      else await store.createDeck(input);
      // 저장 도중 닫았다면 뒤에 있는 화면까지 되돌리지 않는다.
      if (active.current) closeDeckForm();
    } catch (error) {
      if (!active.current) return;
      if (error instanceof StoreError && (error.code === 'not_found' || error.code === 'trashed')) {
        setMissing(true);
      } else {
        setFailure(saveFailureBody(error));
      }
      submitting.current = false;
      setSaving(false);
    }
  };

  if (missing) return <DeckFormUnavailable />;

  return (
    <DeckFormFrame
      editing={editing}
      footer={
        <>
          <Button
            label={saving ? '저장 중…' : editing ? '저장' : '만들기'}
            onPress={save}
            disabled={empty || saving}
          />
          {empty ? (
            <Text
              accessibilityLiveRegion="polite"
              style={[text('caption'), styles.hint, { color: colors.muted }]}
            >
              {editing ? '이름을 적으면 저장할 수 있어요' : '이름을 적으면 만들 수 있어요'}
            </Text>
          ) : null}
        </>
      }
    >
      <Field
        label="이름"
        size="title"
        first
        autoFocus={!editing}
        editable={!saving}
        value={name}
        onChangeText={setName}
        returnKeyType="done"
        onSubmitEditing={save}
        accessibilityHint={empty ? '이름을 입력해 주세요.' : undefined}
      />
      <View accessibilityRole="radiogroup" accessibilityLabel="발음 언어" style={styles.languages}>
        <Text style={[text('caption'), { color: colors.muted }]}>발음 언어</Text>
        <Text style={[text('caption'), styles.description, { color: colors.muted }]}>
          이 덱의 카드를 이 언어로 읽어요.
        </Text>
        {languages.map((option) => {
          const checked = option.value === language;
          return (
            <Pressable
              key={option.value ?? 'none'}
              accessibilityRole="radio"
              accessibilityLabel={option.label}
              aria-checked={checked}
              accessibilityState={{ checked, disabled: saving }}
              disabled={saving}
              onPress={() => setLanguage(option.value)}
              style={({ pressed }) => [
                styles.language,
                { borderBottomColor: colors.line, opacity: pressed ? 0.6 : 1 },
              ]}
            >
              <Text style={text('body', { weight: checked ? 'bold' : 'regular' })}>
                {option.label}
              </Text>
              {checked ? <CheckIcon color={colors.text} size={20} /> : null}
            </Pressable>
          );
        })}
        {/* 외부에서 저장한 언어도 다른 항목을 고르기 전까지 그대로 보존한다. */}
        {language !== null && !languages.some((option) => option.value === language) ? (
          <Text style={[text('caption'), styles.description, { color: colors.muted }]}>
            현재 발음 언어: {language}
          </Text>
        ) : null}
      </View>
      {failure ? (
        <Notice
          tone="danger"
          title={editing ? '덱을 저장하지 못했어요' : '덱을 만들지 못했어요'}
          body={failure}
        />
      ) : null}
    </DeckFormFrame>
  );
}

export function DeckFormUnavailable({ retry }: { retry?: () => void }) {
  return (
    <DeckFormFrame editing footer={<Button label="돌아가기" onPress={closeDeckForm} />}>
      <Notice
        tone={retry ? 'danger' : 'info'}
        title={retry ? '덱을 불러오지 못했어요' : '편집할 덱이 없어요'}
        body={retry ? '잠시 뒤 다시 해 주세요.' : '덱이 없거나 휴지통에 있어요.'}
        action={retry ? { label: '다시 시도', onPress: retry } : undefined}
      />
    </DeckFormFrame>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  fill: { flex: 1 },
  form: { paddingTop: space[3], paddingHorizontal: space[4], paddingBottom: space[3] },
  languages: { paddingTop: space[4] },
  description: { paddingBottom: space[2] },
  language: {
    minHeight: size.button,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space[3],
    borderBottomWidth: 1,
  },
  footer: { paddingTop: space[3], paddingHorizontal: space[4] },
  hint: { textAlign: 'center', paddingTop: space[2] },
});

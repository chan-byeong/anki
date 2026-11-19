import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { useEffect } from 'react';
import { FlatList, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Collapsible, Notice, TopBar } from '@/components';
import { ImportDeckSwitch } from '@/features/import/components/ImportDeckSwitch';
import { ImportFileSummary } from '@/features/import/components/ImportFileSummary';
import { ImportFormatGuide } from '@/features/import/components/ImportFormatGuide';
import { ImportPreviewRow } from '@/features/import/components/ImportPreviewRow';
import { SkipNotes } from '@/features/import/components/SkipNotes';
import type { ImportOutcome } from '@/features/import/import-outcome';
import { useImportFlow, type ImportFlow } from '@/features/import/use-import-flow';
import { useHeldValue } from '@/hooks/use-held-value';
import { useTheme } from '@/theme/ThemeProvider';
import { space } from '@/theme/tokens';
import { goBack } from '@/utils/go-back';

// 네이티브 스택이 화면 전환이 끝날 때 보내는 이벤트. 기본 타입에는 없어서 쓰는 모양만 적는다.
interface TransitionNavigation {
  addListener: (
    type: 'transitionEnd',
    listener: (event: { data: { closing: boolean } }) => void,
  ) => () => void;
}

// 파일로 가져오기(Import-2 미리보기, Import-3 카드 없음). 들어오면 바로 파일 선택기를 연다(Import-1은 덱 상세의 시트).
// 끝나면 덱 상세로 돌아가 토스트를 띄운다(Import-4). 캔버스에 없는 상태(파일을 못 읽음, 너무 큼, 저장 실패, 덱 바꾸기)는
// 기존 Notice·Sheet로 만들었다.
export default function ImportScreen() {
  const { deckId: entryDeckId } = useLocalSearchParams<{ deckId: string }>();
  const flow = useImportFlow(entryDeckId);
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const shownSaveFailure = useHeldValue(flow.saveFailure);
  const { pick } = flow;

  // 화면이 다 올라온 뒤에 파일 선택기를 연다. iOS는 전환 중인 화면 위에 선택기를 못 띄우고 취소로 돌려준다.
  // 전환 이벤트가 오지 않는 경우(움직임 줄이기 등)를 위해 시간이 지나면 연다. 고르지 않고 닫아도 화면은 남기고,
  // "파일 고르기" 버튼으로 다시 연다.
  const navigation = useNavigation() as unknown as TransitionNavigation;
  useEffect(() => {
    let done = false;
    const open = () => {
      if (done) return;
      done = true;
      void pick();
    };
    const unsubscribe = navigation.addListener('transitionEnd', (event) => {
      if (!event.data.closing) open();
    });
    const fallback = setTimeout(open, 800);
    return () => {
      done = true;
      unsubscribe();
      clearTimeout(fallback);
    };
  }, [navigation, pick]);

  const finish = async () => {
    const count = await flow.save();
    if (count === null) return;
    const params = { id: flow.deckId, imported: String(count) };
    if (flow.deckId === entryDeckId) {
      router.dismissTo({ pathname: '/deck/[id]', params });
    } else {
      // 들어온 덱이 아니면 스택에 없으므로, 목록으로 돌아간 뒤 그 덱을 연다.
      router.dismissTo('/');
      router.push({ pathname: '/deck/[id]', params });
    }
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <TopBar
        leading="close"
        leadingLabel="닫기"
        onLeadingPress={() => goBack('/')}
        title="파일로 가져오기"
      />
      {flow.file !== null && flow.outcome !== null ? (
        <ImportBody flow={flow} fileName={flow.file.name} outcome={flow.outcome} />
      ) : (
        <NoFile />
      )}
      <Collapsible open={flow.saveFailure !== null}>
        <View style={styles.notice}>
          <Notice tone="danger" title="카드를 추가하지 못했어요" body={shownSaveFailure ?? ''} />
        </View>
      </Collapsible>
      <View style={[styles.footer, { paddingBottom: space[2] + insets.bottom }]}>
        <ImportAction flow={flow} outcome={flow.outcome} onAdd={finish} />
      </View>
    </View>
  );
}

// 아직 파일을 고르지 않았거나 고르지 않고 닫았을 때. 버튼은 아래 "파일 고르기"다.
function NoFile() {
  const { colors, text } = useTheme();

  return (
    <View style={styles.noFile}>
      <Text style={[text('body'), { color: colors.muted }]}>
        한 줄에 카드 한 장, 칸은 탭으로 나눈 파일을 읽을 수 있어요.
      </Text>
    </View>
  );
}

interface ImportBodyProps {
  flow: ImportFlow;
  fileName: string;
  outcome: ImportOutcome;
}

// 파일을 고른 뒤의 본문: 덱, 파일 요약, 건너뛰는 카드, 미리보기 또는 형식 안내.
function ImportBody({ flow, fileName, outcome }: ImportBodyProps) {
  const failed = flow.fronts.kind === 'failed';

  return (
    <View style={styles.fill}>
      <ImportDeckSwitch deckId={flow.deckId} onChange={flow.setDeckId} />
      {failed ? (
        <View style={styles.notice}>
          <Notice tone="danger" title="덱의 카드를 불러오지 못했어요" body="다시 열어 주세요." />
        </View>
      ) : outcome.kind === 'loading' ? null : (
        <>
          <ImportFileSummary
            name={fileName}
            status={outcome.status}
            danger={outcome.kind === 'guide'}
            onPickAnother={flow.pick}
          />
          <SkipNotes skipped={outcome.skipped} />
          {outcome.kind === 'guide' ? (
            <ScrollView style={styles.fill}>
              <ImportFormatGuide />
            </ScrollView>
          ) : (
            <Preview cards={outcome.cards} />
          )}
        </>
      )}
    </View>
  );
}

function Preview({ cards }: { cards: Extract<ImportOutcome, { kind: 'preview' }>['cards'] }) {
  const { colors, text } = useTheme();

  return (
    <>
      <Text
        accessibilityRole="header"
        style={[text('caption'), styles.listHeader, { color: colors.muted }]}
      >{`미리보기 · ${cards.length}장`}</Text>
      <FlatList
        style={styles.fill}
        contentContainerStyle={styles.listContent}
        accessibilityLabel="가져올 카드"
        data={cards}
        keyExtractor={(card) => String(card.line)}
        renderItem={({ item, index }) => (
          <ImportPreviewRow card={item} last={index === cards.length - 1} />
        )}
      />
    </>
  );
}

interface ImportActionProps {
  flow: ImportFlow;
  outcome: ImportOutcome | null;
  onAdd: () => void;
}

// 아래 버튼: 카드를 못 찾았거나 읽을 수 없으면 "다른 파일 선택", 미리보기가 있으면 "카드 M장 추가".
function ImportAction({ flow, outcome, onAdd }: ImportActionProps) {
  if (outcome === null) {
    return <Button label="파일 고르기" onPress={flow.pick} disabled={flow.picking} />;
  }
  if (outcome.kind === 'loading' || flow.fronts.kind === 'failed') return null;
  if (outcome.kind === 'guide') {
    return <Button label="다른 파일 선택" onPress={flow.pick} disabled={flow.picking} />;
  }
  return (
    <Button
      label={`카드 ${outcome.cards.length}장 추가`}
      onPress={onAdd}
      disabled={flow.saving || flow.picking}
    />
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  fill: { flex: 1 },
  noFile: { flex: 1, paddingTop: space[4], paddingHorizontal: space[4] },
  notice: { paddingHorizontal: space[4], paddingBottom: space[2] },
  listHeader: { marginHorizontal: space[4], marginTop: space[3] },
  listContent: { paddingHorizontal: space[4] },
  footer: { paddingTop: space[3], paddingHorizontal: space[4] },
});

import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef } from 'react';
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

  // 처음 한 번만 파일 선택기를 연다. 고르지 않고 닫으면 이 화면도 닫는다.
  const opened = useRef(false);
  useEffect(() => {
    if (opened.current) return;
    opened.current = true;
    void pick().then((picked) => {
      if (!picked) goBack('/');
    });
  }, [pick]);

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
        <View style={styles.fill} />
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
  if (outcome === null || outcome.kind === 'loading' || flow.fronts.kind === 'failed') return null;
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
  notice: { paddingHorizontal: space[4], paddingBottom: space[2] },
  listHeader: { marginHorizontal: space[4], marginTop: space[3] },
  listContent: { paddingHorizontal: space[4] },
  footer: { paddingTop: space[3], paddingHorizontal: space[4] },
});

import { useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  Button,
  Field,
  IconButton,
  ListRow,
  ListSection,
  MonitorIcon,
  Notice,
  PageHeader,
  PlusIcon,
  RatingMark,
  Segmented,
  Sheet,
  StatusDot,
  Toast,
  TopBar,
} from '@/components';
import { useTheme } from '@/theme/ThemeProvider';
import { space } from '@/theme/tokens';

// 토큰·테마·공통 컴포넌트 확인용 임시 화면. 실제 홈 화면 작업에서 대체한다.
export default function HomeScreen() {
  const { colors, text } = useTheme();
  const [mode, setMode] = useState<'system' | 'light' | 'dark'>('system');
  const [sheet, setSheet] = useState<'menu' | 'confirm' | null>(null);
  // menu에서 이어지는 confirm도 같은 트리거로 돌아온다(ADR 0006, 0007).
  const sheetTrigger = useRef<View>(null);
  return (
    <>
      <ScrollView
        style={[styles.screen, { backgroundColor: colors.bg }]}
        contentContainerStyle={styles.content}
      >
        <TopBar leading="back" leadingLabel="뒤로" onLeadingPress={() => {}} title="단어장" />
        <PageHeader title="단어 복습" caption="오늘 복습할 카드가 없어요" />

        <Text style={text('title', { weight: 'bold' })}>글꼴</Text>
        <Text style={[text('body'), { color: colors.muted }]}>오늘 복습할 카드가 없어요</Text>
        <Text style={text('body', { ja: true })}>直す · 辛い · 日本語の漢字</Text>

        <Button label="복습 시작" count="50장" />
        <Button label="취소" variant="secondary" size="sm" />
        <Button label="삭제" variant="danger" size="sm" />
        <IconButton icon={PlusIcon} label="카드 추가" />
        <Button
          ref={sheetTrigger}
          label="덱 메뉴"
          variant="secondary"
          size="sm"
          onPress={() => setSheet('menu')}
        />

        <ListSection label="단어장">
          <ListRow
            title="JLPT N3"
            sub="50장 · 오늘 12장"
            trailing={{ kind: 'due', label: '오늘 12' }}
            onPress={() => {}}
          />
          <ListRow title="설정" trailing={{ kind: 'chevron' }} onPress={() => {}} last />
        </ListSection>

        <Segmented
          label="테마"
          width={208}
          value={mode}
          onChange={setMode}
          options={[
            { value: 'system', label: '시스템' },
            { value: 'light', label: '라이트' },
            { value: 'dark', label: '다크' },
          ]}
        />
        <Field label="앞면" size="title" ja placeholder="懐かしい" first />
        <Field label="메모" optional placeholder="힌트, 예문" />
        <View style={styles.row}>
          <RatingMark kind="forgot" size={28} />
          <RatingMark kind="unsure" size={28} />
          <RatingMark kind="knew" size={28} />
        </View>
        <StatusDot state="synced" label="동기화됨" />
        <StatusDot state="pending" label="동기화 대기 3" />
        <StatusDot state="failed" label="동기화하지 못했어요" />
        <Notice
          tone="warn"
          icon={MonitorIcon}
          title="이 브라우저에만 있는 변경 12개"
          body="연결되면 바로 올라가요."
          action={{ label: '지금 동기화', onPress: () => {} }}
        />
        <Notice tone="danger" title="로그인하지 못했어요" body="잠시 뒤 다시 해 주세요." />
        <Notice
          tone="warn"
          line
          title="이 기기에 일본어 음성이 없어요"
          body="기기 설정에서 받을 수 있어요."
        />
      </ScrollView>
      <Sheet
        visible={sheet === 'menu'}
        kind="menu"
        // confirm으로 넘어가며 닫힐 때는 포커스를 돌려주지 않는다. confirm이 닫힐 때 돌려준다.
        triggerRef={sheet === 'confirm' ? undefined : sheetTrigger}
        onClose={() => setSheet(null)}
        actions={[
          { label: '덱 편집', onPress: () => {} },
          { label: '덱 삭제', destructive: true, onPress: () => setSheet('confirm') },
        ]}
      />
      <Sheet
        visible={sheet === 'confirm'}
        kind="confirm"
        title="영구 삭제할까요?"
        body="되돌릴 수 없어요."
        triggerRef={sheetTrigger}
        onClose={() => setSheet(null)}
        actions={[
          { label: '영구 삭제', destructive: true, onPress: () => {} },
          { label: '취소', role: 'cancel', onPress: () => {} },
        ]}
      />
      <Toast message="카드 120장을 추가했어요" sub="이 기기에 일본어 음성이 없어요" />
    </>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: space[3] },
  screen: { flex: 1 },
  content: { padding: space[4], gap: space[3] },
});

import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MoreIcon, Notice, PageHeader, Sheet, TopBar } from '@/components';
import { useDeck } from '@/features/decks/use-deck';
import { useTheme } from '@/theme/ThemeProvider';
import { space } from '@/theme/tokens';

// 덱 상세의 편집 진입만 연결한다. 카드 목록과 나머지 메뉴 동작은 STA-114 범위다.
export default function DeckScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, retry } = useDeck(id);
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<View>(null);

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg, paddingTop: insets.top }]}>
      <TopBar
        leading="back"
        leadingLabel="덱 목록으로"
        onLeadingPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
        trailing={
          state.kind === 'ready'
            ? [
                {
                  ref: menuRef,
                  icon: MoreIcon,
                  label: '덱 메뉴',
                  pressed: menuOpen,
                  onPress: () => setMenuOpen(true),
                },
              ]
            : []
        }
      />
      <PageHeader
        title={state.kind === 'ready' ? state.deck.name : '덱 상세'}
        caption="준비 중이에요"
      />
      {state.kind === 'failed' || state.kind === 'missing' ? (
        <View style={styles.notice}>
          <Notice
            tone={state.kind === 'failed' ? 'danger' : 'info'}
            title={
              state.kind === 'failed' ? '덱을 불러오지 못했어요' : '덱이 없거나 휴지통에 있어요'
            }
            action={state.kind === 'failed' ? { label: '다시 시도', onPress: retry } : undefined}
          />
        </View>
      ) : null}
      <Sheet
        visible={menuOpen && state.kind === 'ready'}
        kind="menu"
        triggerRef={menuRef}
        onClose={() => setMenuOpen(false)}
        actions={[
          {
            label: '덱 편집',
            onPress: () => router.push({ pathname: '/deck/[id]/edit', params: { id } }),
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  notice: { padding: space[4] },
});

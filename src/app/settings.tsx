import { router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ListRow, ListSection, PageHeader, TopBar } from '@/components';
import { useTrash } from '@/features/trash/use-trash';
import { useTheme } from '@/theme/ThemeProvider';
import { space } from '@/theme/tokens';

const back = () => (router.canGoBack() ? router.back() : router.replace('/'));

// 설정(Settings-1). 지금은 자료의 휴지통 행만 있다. 계정, 동기화, 화면 설정은 각 티켓에서 더한다.
export default function SettingsScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const trash = useTrash();
  // 개수를 읽기 전에는 숫자 없이 행만 보인다. "0"이 잠깐 보였다 바뀌지 않게 하기 위해서다.
  const count =
    trash.kind === 'ready' ? String(trash.decks.length + trash.cards.length) : undefined;

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg, paddingTop: insets.top }]}>
      <TopBar leading="back" leadingLabel="덱 목록으로" onLeadingPress={back} />
      <PageHeader title="설정" />
      <ScrollView style={styles.fill} contentContainerStyle={styles.content}>
        <ListSection label="자료" dense>
          <ListRow
            compact
            last
            title="휴지통"
            accessibilityLabel={count === undefined ? '휴지통' : `휴지통, ${count}개`}
            trailing={{ kind: 'value', value: count ?? '' }}
            onPress={() => router.push('/trash')}
          />
        </ListSection>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  fill: { flex: 1 },
  content: { paddingHorizontal: space[4] },
});

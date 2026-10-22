import { router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ListRow, ListSection, PageHeader, TopBar } from '@/components';
import { useTrashCount } from '@/features/trash/use-trash-count';
import { useTheme } from '@/theme/ThemeProvider';
import { space } from '@/theme/tokens';
import { goBack } from '@/utils/go-back';

// 설정(Settings-1). 지금은 자료의 휴지통 행만 있다. 계정, 동기화, 화면 설정은 각 티켓에서 더한다.
export default function SettingsScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const trashCount = useTrashCount();
  // 개수를 읽기 전에는 숫자 없이 행만 보인다. "0"이 잠깐 보였다 바뀌지 않게 하기 위해서다.
  const count = trashCount === undefined ? undefined : String(trashCount);

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg, paddingTop: insets.top }]}>
      <TopBar leading="back" leadingLabel="덱 목록으로" onLeadingPress={() => goBack('/')} />
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

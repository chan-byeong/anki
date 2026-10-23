import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ListRow, ListSection, PageHeader, Segmented, TopBar } from '@/components';
import { useTrashCount } from '@/features/trash/use-trash-count';
import { useTheme } from '@/theme/ThemeProvider';
import type { ThemePreference } from '@/theme/theme-preference';
import { size, space } from '@/theme/tokens';
import { goBack } from '@/utils/go-back';

const THEME_OPTIONS: readonly { value: ThemePreference; label: string }[] = [
  { value: 'system', label: '시스템' },
  { value: 'light', label: '라이트' },
  { value: 'dark', label: '다크' },
];

// 설정(Settings-1). 화면의 테마와 자료의 휴지통이 있다. 계정, 동기화, 주로 쓰는 손은 각 티켓에서 더한다.
export default function SettingsScreen() {
  const { colors, text, preference, setPreference } = useTheme();
  const insets = useSafeAreaInsets();
  const trashCount = useTrashCount();
  // 개수를 읽기 전에는 숫자 없이 행만 보인다. "0"이 잠깐 보였다 바뀌지 않게 하기 위해서다.
  const count = trashCount === undefined ? undefined : String(trashCount);

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg, paddingTop: insets.top }]}>
      <TopBar leading="back" leadingLabel="덱 목록으로" onLeadingPress={() => goBack('/')} />
      <PageHeader title="설정" />
      <ScrollView style={styles.fill} contentContainerStyle={styles.content}>
        <ListSection label="화면" dense>
          <View style={styles.setting}>
            <Text style={text('body')}>테마</Text>
            <Segmented
              label="테마"
              width={208}
              options={THEME_OPTIONS}
              value={preference}
              onChange={setPreference}
            />
          </View>
        </ListSection>
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
  // 캔버스: 이름과 Segmented를 한 줄에 양 끝으로, 줄 높이는 size-button.
  setting: {
    minHeight: size.button,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space[3],
  },
});

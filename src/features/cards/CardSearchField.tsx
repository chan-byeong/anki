import { StyleSheet, TextInput, View } from 'react-native';

import { ClearCircleIcon, IconButton, SearchIcon } from '@/components';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, size, space } from '@/theme/tokens';

// 덱 상세의 카드 검색칸(Deck-1, Deck-3). 캔버스에서 공통 컴포넌트로 묶지 않아 화면 전용 조각으로 둔다.
interface CardSearchFieldProps {
  value: string;
  onChangeText: (value: string) => void;
}

export function CardSearchField({ value, onChangeText }: CardSearchFieldProps) {
  const { colors, text } = useTheme();

  return (
    <View
      accessibilityRole="search"
      style={[styles.box, { backgroundColor: colors.surface }, value !== '' && styles.withClear]}
    >
      <SearchIcon color={colors.muted} />
      <TextInput
        accessibilityLabel="카드 검색"
        placeholder="카드 검색"
        placeholderTextColor={colors.muted}
        cursorColor={colors.text}
        returnKeyType="search"
        autoCorrect={false}
        autoCapitalize="none"
        value={value}
        onChangeText={onChangeText}
        style={[text('body'), styles.input, { color: colors.text }]}
      />
      {value !== '' ? (
        <IconButton
          icon={ClearCircleIcon}
          tone="muted"
          iconSize={18}
          label="검색어 지우기"
          onPress={() => onChangeText('')}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    height: size.touch,
    borderRadius: radius.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    paddingHorizontal: space[3],
  },
  // 지우기 버튼이 있으면 그 터치 영역이 오른쪽 안쪽 여백을 대신한다.
  withClear: { paddingRight: space[1] },
  input: { flex: 1, padding: 0 },
});

import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { size, space } from '@/theme/tokens';

// 덱 상세의 카드 한 줄. 캔버스에서 공통 컴포넌트로 묶지 않은 "카드 행"이라 화면 전용 조각으로 둔다.
// 긴 앞면·뒷면이 잘리지 않도록 줄 수를 제한하지 않는다(ListRow는 한 줄로 자른다).
// 줄을 누르면 카드를 열어 편집한다.
interface CardRowProps {
  front: string;
  back: string;
  // 복습 이력이 없는 카드의 표시. 복습일 표기는 STA-118에서 더한다.
  status: string;
  // 검색어. 앞면·뒷면에서 일치하는 부분에 밑줄을 긋는다.
  highlight?: string;
  onPress: () => void;
  last?: boolean;
}

// 검색어와 일치하는 부분(대소문자 무시)만 밑줄로 구분한다. 접근성 라벨은 줄 전체를 읽으므로 글자는 그대로 둔다.
function marked(value: string, query: string) {
  const needle = query.trim().toLowerCase();
  if (needle === '') return value;
  const lower = value.toLowerCase();
  // toLowerCase가 길이를 바꾸는 글자(İ 등)가 있으면 위치가 어긋나므로 표시하지 않는다.
  if (lower.length !== value.length) return value;
  const parts: React.ReactNode[] = [];
  let from = 0;
  for (let at = lower.indexOf(needle); at !== -1; at = lower.indexOf(needle, from)) {
    if (at > from) parts.push(value.slice(from, at));
    from = at + needle.length;
    parts.push(
      <Text key={at} style={styles.mark}>
        {value.slice(at, from)}
      </Text>,
    );
  }
  parts.push(value.slice(from));
  return parts;
}

export function CardRow({
  front,
  back,
  status,
  highlight = '',
  onPress,
  last = false,
}: CardRowProps) {
  const { colors, text } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${front}, ${back}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        {
          borderBottomColor: colors.line,
          borderBottomWidth: last ? 0 : 1,
          opacity: pressed ? 0.6 : 1,
        },
      ]}
    >
      <View style={styles.texts}>
        <Text style={text('body', { weight: 'bold' })}>{marked(front, highlight)}</Text>
        <Text style={[text('caption'), { color: colors.muted }]}>{marked(back, highlight)}</Text>
      </View>
      <Text style={[text('caption'), { color: colors.muted }]}>{status}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: size.row,
    paddingVertical: space[2],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space[3],
  },
  texts: { flex: 1, gap: space[1] },
  mark: { textDecorationLine: 'underline' },
});

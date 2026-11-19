import { StyleSheet, Text, View } from 'react-native';

import { fonts, radius, size, space, typography } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeProvider';

const EXAMPLE = [
  ['食べる', '먹다', '朝ごはんを食べる。'],
  ['飲む', '마시다'],
  ['寒い', '춥다', '寒い朝。'],
];

const RULES = [
  ['한 줄', '카드 한 장'],
  ['⇥', '탭으로 칸을 나눠요'],
  ['순서', '앞면 ⇥ 뒷면 ⇥ 메모 ⇥ 힌트'],
  ['필수', '앞면과 뒷면. 메모와 힌트는 없어도 돼요'],
  ['엑셀', '다른 이름으로 저장 → 유니코드 텍스트(.txt)'],
];

// 카드를 찾지 못했을 때 보이는 형식 안내(캔버스 Import-3). 캔버스의 칸 셋을 힌트까지 넷으로 맞췄고
// 엑셀 저장 방법 한 줄을 더했다(STA-166 결정).
export function ImportFormatGuide() {
  const { colors, text } = useTheme();

  return (
    <View style={styles.guide}>
      <Text style={text('body')}>한 줄에 카드 한 장, 칸은 탭으로 나눈 파일을 읽을 수 있어요.</Text>
      <View style={[styles.example, { backgroundColor: colors.surface }]}>
        {EXAMPLE.map((cells) => (
          <Text
            key={cells[0]}
            accessibilityLabel={cells.join(', 탭, ')}
            style={[text('caption', { ja: true }), styles.code, { fontFamily: fonts.mono }]}
          >
            {cells.map((cell, index) => (
              <Text key={index}>
                {index > 0 ? <Text style={{ color: colors.muted }}>{'  ⇥  '}</Text> : null}
                {cell}
              </Text>
            ))}
          </Text>
        ))}
      </View>
      <View style={styles.rules}>
        {RULES.map(([label, value]) => (
          <View key={label} style={styles.rule}>
            <Text style={[text('caption', { weight: 'bold' }), styles.ruleLabel]}>{label}</Text>
            <Text style={[text('caption'), styles.ruleValue, { color: colors.muted }]}>
              {value}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  guide: { paddingTop: space[4], paddingHorizontal: space[4], gap: space[3] },
  example: { padding: space[3], borderRadius: radius.sm },
  code: { lineHeight: typography.body.lineHeight },
  rules: { gap: space[2] },
  rule: { flexDirection: 'row', gap: space[3] },
  ruleLabel: { width: size.touch },
  ruleValue: { flex: 1 },
});

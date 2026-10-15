import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { size, space } from '../theme/tokens';
import { useTheme } from '../theme/ThemeProvider';
import { Button } from './Button';
import { ChevronRightIcon } from './icons';

// 오른쪽 끝에 놓이는 것. value·chevron·due는 행 안, button은 행과 따로 눌린다.
export type ListRowTrailing =
  | { kind: 'value'; value: string }
  | { kind: 'due'; label: string }
  | { kind: 'chevron' }
  | { kind: 'button'; label: string; accessibilityLabel?: string; onPress: () => void };

interface ListRowProps {
  title: string;
  sub?: string;
  // 일본어(lang="ja") 제목은 JP 글리프 글꼴을 쓴다.
  ja?: boolean;
  leading?: ReactNode;
  trailing?: ListRowTrailing;
  onPress?: () => void;
  // 한 줄짜리 설정 목록: 최소 높이 56.
  compact?: boolean;
  // 목록의 마지막 행은 아래 선이 없다.
  last?: boolean;
}

export function ListRow({
  title,
  sub,
  ja = false,
  leading,
  trailing,
  onPress,
  compact = false,
  last = false,
}: ListRowProps) {
  const { colors, text } = useTheme();
  const minHeight = compact ? size.button : size.row;

  const body = (
    <>
      {leading}
      <View style={styles.text}>
        <Text style={text('body', { weight: 'bold', ja })} numberOfLines={1}>
          {title}
        </Text>
        {sub ? (
          <Text style={[text('caption'), { color: colors.muted }]} numberOfLines={1}>
            {sub}
          </Text>
        ) : null}
      </View>
      {trailing?.kind === 'value' ? (
        <View style={styles.value}>
          <Text style={[text('body'), { color: colors.muted }]}>{trailing.value}</Text>
          <ChevronRightIcon color={colors.muted} size={18} />
        </View>
      ) : null}
      {trailing?.kind === 'due' ? (
        <Text style={text('caption', { weight: 'bold' })}>{trailing.label}</Text>
      ) : null}
      {trailing?.kind === 'chevron' ? <ChevronRightIcon color={colors.muted} size={18} /> : null}
    </>
  );

  return (
    <View
      style={[
        styles.row,
        { minHeight, borderBottomColor: colors.line, borderBottomWidth: last ? 0 : 1 },
      ]}
    >
      {onPress ? (
        <Pressable
          accessibilityRole="button"
          onPress={onPress}
          style={({ pressed }) => [styles.main, { minHeight, opacity: pressed ? 0.6 : 1 }]}
        >
          {body}
        </Pressable>
      ) : (
        <View style={[styles.main, { minHeight }]}>{body}</View>
      )}
      {trailing?.kind === 'button' ? (
        <Button
          variant="secondary"
          size="sm"
          label={trailing.label}
          accessibilityLabel={trailing.accessibilityLabel}
          onPress={trailing.onPress}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  main: {
    flex: 1,
    paddingVertical: space[2],
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
  },
  text: { flex: 1 },
  value: { flexDirection: 'row', alignItems: 'center', gap: space[1] },
});

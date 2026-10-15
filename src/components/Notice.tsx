import { useEffect } from 'react';
import { AccessibilityInfo, Pressable, StyleSheet, Text, View } from 'react-native';

import { radius, size, space } from '../theme/tokens';
import { useTheme } from '../theme/ThemeProvider';
import { AlertCircleIcon, type IconComponent } from './icons';

export type NoticeTone = 'info' | 'warn' | 'danger';

interface NoticeProps {
  tone?: NoticeTone;
  title: string;
  body?: string;
  // 행동은 하나까지.
  action?: { label: string; onPress: () => void };
  // 기본은 상자, line은 상자 없는 줄형.
  line?: boolean;
  // 상태를 색과 별개로 알리는 아이콘. 없으면 느낌표 원.
  icon?: IconComponent;
}

export function Notice({
  tone = 'info',
  title,
  body,
  action,
  line = false,
  icon: Icon = AlertCircleIcon,
}: NoticeProps) {
  const { colors, text } = useTheme();
  const spoken = body ? `${title}. ${body}` : title;
  // 오류는 나타나는 즉시 읽어 준다. accessibilityLiveRegion은 Android 전용이다.
  useEffect(() => {
    if (tone === 'danger') AccessibilityInfo.announceForAccessibility(spoken);
  }, [tone, spoken]);
  const iconColor = { info: colors.muted, warn: colors.warn, danger: colors.danger }[tone];

  return (
    <View
      style={[
        styles.base,
        line
          ? [styles.line, { borderBottomColor: colors.line }]
          : { backgroundColor: colors.surface, borderRadius: radius.sm, padding: space[3] },
      ]}
    >
      <View aria-hidden style={styles.icon}>
        <Icon color={iconColor} size={18} />
      </View>
      {/* 글자 덩어리만 하나로 읽히게 묶어, 옆의 행동 버튼은 따로 눌린다. */}
      <View
        accessible
        accessibilityRole={tone === 'danger' ? 'alert' : undefined}
        accessibilityLiveRegion={tone === 'danger' ? 'assertive' : 'polite'}
        accessibilityLabel={spoken}
        style={styles.text}
      >
        <Text style={text('body', { weight: line ? 'regular' : 'bold' })}>{title}</Text>
        {body ? <Text style={[text('caption'), { color: colors.muted }]}>{body}</Text> : null}
      </View>
      {action ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={action.label}
          onPress={action.onPress}
          style={styles.action}
        >
          <Text style={[text('caption', { weight: 'bold' }), styles.actionText]}>
            {action.label}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  base: { flexDirection: 'row', alignItems: 'flex-start', gap: space[2] },
  line: { paddingVertical: space[3], borderBottomWidth: 1 },
  icon: { paddingTop: 3 },
  text: { flex: 1, minWidth: 0, gap: space[1] },
  action: { minHeight: size.touch, justifyContent: 'center' },
  actionText: { textDecorationLine: 'underline' },
});

import { StyleSheet, Text, View } from 'react-native';

import { size } from '../theme/tokens';
import { useTheme } from '../theme/ThemeProvider';
import { IconButton, type IconButtonProps } from './IconButton';
import { ChevronLeftIcon, CloseIcon } from './icons';

interface TopBarProps {
  leading: 'back' | 'close';
  // 뒤로 버튼 이름은 가는 곳으로 적는다("설정으로").
  leadingLabel: string;
  onLeadingPress: () => void;
  // 있으면 가운데에 놓는다(모달 화면). 없으면 아래에 PageHeader를 둔다.
  title?: string;
  trailing?: IconButtonProps[];
}

export function TopBar({
  leading,
  leadingLabel,
  onLeadingPress,
  title,
  trailing = [],
}: TopBarProps) {
  const { text } = useTheme();
  const titled = title !== undefined;

  return (
    <View style={[styles.bar, !titled && styles.spread]}>
      <View style={[styles.side, titled && styles.slot]}>
        <IconButton
          icon={leading === 'back' ? ChevronLeftIcon : CloseIcon}
          label={leadingLabel}
          onPress={onLeadingPress}
        />
      </View>
      {titled ? (
        <Text
          accessibilityRole="header"
          numberOfLines={1}
          style={[text('body', { weight: 'bold' }), styles.title]}
        >
          {title}
        </Text>
      ) : null}
      <View style={[styles.side, titled && styles.slot]}>
        {trailing.map((item) => (
          <IconButton key={item.label} {...item} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    height: size.button,
    paddingHorizontal: size.edgeIcon,
    flexDirection: 'row',
    alignItems: 'center',
  },
  spread: { justifyContent: 'space-between' },
  side: { flexDirection: 'row', alignItems: 'center' },
  // 제목이 있으면 양옆 칸을 터치 크기로 고정해 제목이 정확히 가운데 온다.
  slot: { width: size.touch },
  title: { flex: 1, textAlign: 'center' },
});

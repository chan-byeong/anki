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

  return (
    <View style={styles.bar}>
      <View style={styles.side}>
        <IconButton
          icon={leading === 'back' ? ChevronLeftIcon : CloseIcon}
          label={leadingLabel}
          onPress={onLeadingPress}
        />
      </View>
      {title ? (
        <Text
          accessibilityRole="header"
          numberOfLines={1}
          style={[text('body', { weight: 'bold' }), styles.title]}
        >
          {title}
        </Text>
      ) : null}
      <View style={[styles.side, styles.trailing]}>
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
  side: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  trailing: { justifyContent: 'flex-end' },
  title: { flexShrink: 1, textAlign: 'center' },
});

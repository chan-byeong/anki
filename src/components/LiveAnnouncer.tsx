import { useEffect, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

interface LiveAnnouncerProps {
  message: string;
  // 오류처럼 지금 읽어야 하는 알림.
  assertive?: boolean;
}

// 웹은 AccessibilityInfo.announceForAccessibility가 빈 함수라 라이브 영역으로 읽어 준다.
// 영역은 먼저 빈 채로 붙고, 그다음 렌더에서 내용이 들어와야 스크린 리더가 읽는다.
// 네이티브는 announceForAccessibility와 accessibilityLiveRegion이 이미 읽으므로 그리지 않는다.
export function LiveAnnouncer({ message, assertive = false }: LiveAnnouncerProps) {
  const [spoken, setSpoken] = useState('');
  const isWeb = Platform.OS === 'web';
  useEffect(() => {
    if (!isWeb) return;
    // 영역이 붙은 다음 틱에 내용을 넣는다. 같은 렌더에 넣으면 "나타난 내용"이라 읽히지 않을 수 있다.
    const timer = setTimeout(() => setSpoken(message), 0);
    return () => clearTimeout(timer);
  }, [isWeb, message]);

  if (!isWeb) return null;
  return (
    <View
      testID="live-announcer"
      aria-live={assertive ? 'assertive' : 'polite'}
      style={styles.hidden}
    >
      {spoken ? <Text>{spoken}</Text> : null}
    </View>
  );
}

// 화면에는 보이지 않고 스크린 리더에는 읽히는 자리.
const styles = StyleSheet.create({
  hidden: { position: 'absolute', width: 1, height: 1, overflow: 'hidden', opacity: 0 },
});

import { AccessibilityInfo, Platform, type Text, type View } from 'react-native';

// 스크린리더 포커스를 옮긴다(ADR 0007).
// react-native-web의 AccessibilityInfo에는 sendAccessibilityEvent가 없다. 웹의 ref는 DOM 요소라 focus()로 옮긴다.
export function moveFocus(target: View | Text): void {
  if (Platform.OS === 'web') {
    (target as unknown as { focus?: () => void }).focus?.();
    return;
  }
  AccessibilityInfo.sendAccessibilityEvent(target, 'focus');
}

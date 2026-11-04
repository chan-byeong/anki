import {
  AndroidHaptics,
  ImpactFeedbackStyle,
  impactAsync,
  performAndroidHapticsAsync,
  selectionAsync,
} from 'expo-haptics';
import { Platform } from 'react-native';

// 햅틱 이름(ADR 0021). 화면은 강도가 아니라 의미로 부르고, 어떤 진동으로 낼지는 여기서만 정한다.
// 화면 움직임이 아니므로 동작 줄이기(useMotion)와 무관하다. 진동을 꺼 둔 기기에서는 시스템이 알아서 울리지 않는다.
//
// iOS·웹: impact / selection. Android: Expo 문서가 Vibrator 기반 호출 대신 권하는 performAndroidHapticsAsync.

// 진동은 부가 효과라서 실패(미지원 기기, 진동 꺼짐)가 화면 동작을 막으면 안 된다.
// 반환값 없이 던지지도 않으므로 onPress에 그대로 넘기고 await 하지 않는다.
function fire(play: () => Promise<void>): void {
  try {
    play().catch(() => {});
  } catch {
    // 동기로 던지는 경우도 같다.
  }
}

export const haptic = {
  // 평가 버튼을 눌렀을 때. 가볍게 한 번.
  rate: (): void =>
    fire(() =>
      Platform.OS === 'android'
        ? performAndroidHapticsAsync(AndroidHaptics.Confirm)
        : impactAsync(ImpactFeedbackStyle.Light),
    ),
  // 길게 눌러 선택이 잡혔을 때.
  select: (): void =>
    fire(() =>
      Platform.OS === 'android'
        ? performAndroidHapticsAsync(AndroidHaptics.Long_Press)
        : selectionAsync(),
    ),
  // 제스처가 문턱을 넘었을 때. 평가보다 또렷하게.
  threshold: (): void =>
    fire(() =>
      Platform.OS === 'android'
        ? performAndroidHapticsAsync(AndroidHaptics.Gesture_Start)
        : impactAsync(ImpactFeedbackStyle.Medium),
    ),
};

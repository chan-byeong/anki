import type { NativeStackNavigationOptions } from 'expo-router';

import { motion } from '@/theme/tokens';

// 화면 이동의 모양(명세 "화면 전환 네 가지"). 이동 방향이 뜻을 말하게 한다.
// - push: 들어가기. 오른쪽에서 밀려 들어오고 뒤로는 왼쪽 끝을 밀어 돌아간다. 플랫폼 기본 시간.
// - modal: 따로 하는 일. 아래에서 올라와 덮는다. Android도 아래에서 올라오게 명시한다.
// - replace: 바꿔 끼우기. 돌아갈 수 없는 이동(router.replace)은 160ms 페이드로 바꾼다.
export type ScreenTransition = 'push' | 'modal' | 'replace';

// 바꿔 끼우기와 동작 줄이기는 이동 없는 160ms 페이드다. iOS 모달은 시간을 바꿀 수 없어 시스템 페이드를 쓴다.
const FADE: NativeStackNavigationOptions = { animation: 'fade', animationDuration: motion };

export function screenTransition(
  kind: ScreenTransition,
  reduced: boolean,
): NativeStackNavigationOptions {
  const presentation = kind === 'modal' ? ({ presentation: 'modal' } as const) : {};
  if (reduced || kind === 'replace') return { ...presentation, ...FADE };
  return {
    ...presentation,
    animation: kind === 'modal' ? 'slide_from_bottom' : 'slide_from_right',
  };
}

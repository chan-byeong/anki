import type { AccessibilityProps } from 'react-native';

// 공통 컴포넌트가 호출부에서 받는 접근성 프롭 묶음과, 컴포넌트가 정해서 막는 이름들.
// aria-* 별칭은 RN이 같은 뜻의 accessibility*보다 먼저 쓰므로(Pressable: ariaLabel ?? accessibilityLabel,
// role은 accessibilityRole보다 우선) 고정하는 값은 별칭까지 함께 뺀다.

export type A11yRoleProps = 'accessibilityRole' | 'role';
export type A11yLabelProps =
  'accessibilityLabel' | 'aria-label' | 'accessibilityLabelledBy' | 'aria-labelledby';
export type A11yStateProps =
  | 'accessibilityState'
  | 'aria-busy'
  | 'aria-checked'
  | 'aria-disabled'
  | 'aria-expanded'
  | 'aria-selected';
export type A11yLiveProps = 'accessibilityLiveRegion' | 'aria-live';

// Fixed: 컴포넌트가 정하거나 직접 가공해서 호출부가 넘길 수 없는 이름.
export type InheritedA11yProps<Fixed extends keyof AccessibilityProps = never> = Omit<
  AccessibilityProps,
  Fixed
>;

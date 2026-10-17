import { useEffect, useId, useRef, type RefObject } from 'react';
import {
  AccessibilityInfo,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { useTheme } from '../theme/ThemeProvider';
import { radius, size, space } from '../theme/tokens';
import { Button } from './Button';
import type { IconComponent } from './icons';

export type SheetKind = 'menu' | 'confirm';

export interface SheetAction {
  label: string;
  onPress: () => void;
  // 되돌릴 수 없는 동작. 힌트로 알리고 danger 색으로 그린다.
  destructive?: boolean;
  // confirm의 취소 항목 표시. confirm에 없으면 개발 모드에서 경고한다(ADR 0008).
  role?: 'cancel';
  // menu 항목 앞의 아이콘.
  icon?: IconComponent;
}

interface SheetProps {
  visible: boolean;
  kind: SheetKind;
  title?: string;
  body?: string;
  actions: SheetAction[];
  // 가림막(menu), 뒤로가기, iOS escape, 액션을 누른 뒤에 호출된다.
  onClose: () => void;
  // 닫힌 뒤 포커스를 돌려줄 요소(ADR 0006, 0007). 닫힐 때의 값을 쓰므로, 연쇄 흐름에서는 다음 시트로
  // 넘어가는 시트에 undefined를 주고 마지막 시트에 같은 ref를 넘긴다.
  triggerRef?: RefObject<View | null>;
}

const DESTRUCTIVE_HINT = '되돌릴 수 없는 동작입니다';

// 제목이 없을 때 첫 포커스: destructive가 아닌 첫 액션, 모두 destructive면 첫 액션(ADR 0007).
function initialFocusIndex(actions: readonly SheetAction[]): number {
  const index = actions.findIndex((action) => !action.destructive);
  return index === -1 ? 0 : index;
}

// react-native-web의 AccessibilityInfo에는 sendAccessibilityEvent가 없다. 웹의 ref는 DOM 요소라 focus()로 옮긴다.
function moveFocus(target: View | Text): void {
  if (Platform.OS === 'web') {
    (target as unknown as { focus?: () => void }).focus?.();
    return;
  }
  AccessibilityInfo.sendAccessibilityEvent(target, 'focus');
}

function devWarning(kind: SheetKind, actions: readonly SheetAction[]): string | null {
  if (actions.some((action) => action.label.trim() === '')) {
    return 'Sheet: every action needs a non-empty label for screen readers.';
  }
  if (kind === 'confirm' && !actions.some((action) => action.role === 'cancel')) {
    return "Sheet: confirm needs a cancel action marked with role: 'cancel'.";
  }
  return null;
}

// 경고 문구에만 의존해서, 호출부가 actions를 매번 새 배열로 넘겨도 한 번 열릴 때 한 번만 경고한다.
function useDevWarnings(visible: boolean, kind: SheetKind, actions: readonly SheetAction[]): void {
  const warning = __DEV__ && visible ? devWarning(kind, actions) : null;
  useEffect(() => {
    if (warning) console.warn(warning);
  }, [warning]);
}

// 닫힌 뒤 트리거로 포커스를 돌려준다. Modal이 완전히 사라진 뒤 부르는 onDismiss는 iOS와 웹에만 있어서,
// Android는 visible이 true에서 false로 바뀔 때 보낸다.
function useReturnFocus(visible: boolean, triggerRef?: RefObject<View | null>): () => void {
  const wasVisible = useRef(visible);
  const returnFocus = () => {
    const trigger = triggerRef?.current;
    if (trigger) moveFocus(trigger);
  };

  useEffect(() => {
    const closed = wasVisible.current && !visible;
    wasVisible.current = visible;
    if (closed && Platform.OS === 'android') returnFocus();
  });

  return returnFocus;
}

export function Sheet({
  visible,
  kind,
  title,
  body,
  actions,
  onClose,
  triggerRef,
}: SheetProps): React.JSX.Element {
  const { colors, text } = useTheme();
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  const titleId = useId();
  const titleRef = useRef<Text>(null);
  const firstActionRef = useRef<View>(null);
  const returnFocus = useReturnFocus(visible, triggerRef);
  useDevWarnings(visible, kind, actions);

  const confirm = kind === 'confirm';
  const focusIndex = title ? -1 : initialFocusIndex(actions);

  // 열기 애니메이션이 끝난 뒤 시트 안으로 포커스를 보낸다(ADR 0007).
  const focusInside = () => {
    const target = titleRef.current ?? firstActionRef.current;
    if (target) moveFocus(target);
  };

  // 먼저 닫고 액션을 부른다. 액션이 다음 시트를 여는 연쇄 흐름에서 닫기가 그 상태를 덮지 않는다.
  const press = (action: SheetAction) => {
    onClose();
    action.onPress();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType={reducedMotion ? 'none' : 'slide'}
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onClose}
      onShow={focusInside}
      onDismiss={returnFocus}
    >
      {/* 가림막과 패널을 함께 감싼다. aria-modal은 형제를 VoiceOver에서 가리므로 패널에만 달면
          "메뉴 닫기" 가림막까지 가려진다. 자식 항목이 하나로 합쳐지지 않게 accessible은 주지 않고,
          escape는 시스템이 계층을 올라가며 찾으므로 가림막에 포커스가 있어도 여기서 받는다. */}
      <View
        testID="sheet"
        role={confirm ? 'alertdialog' : 'dialog'}
        aria-modal
        // aria-labelledby는 Android 전용이다. iOS는 열자마자 제목으로 포커스가 가서 이름을 읽는다.
        aria-labelledby={title ? titleId : undefined}
        onAccessibilityEscape={onClose}
        style={styles.root}
      >
        {/* menu는 가림막이 "메뉴 닫기" 버튼이고, confirm은 눌러도 닫히지 않는 장식이다(ADR 0008). */}
        {confirm ? (
          <View
            testID="sheet-scrim"
            aria-hidden
            style={[StyleSheet.absoluteFill, { backgroundColor: colors.dim }]}
          />
        ) : (
          <Pressable
            testID="sheet-scrim"
            accessibilityRole="button"
            accessibilityLabel="메뉴 닫기"
            onPress={onClose}
            style={[StyleSheet.absoluteFill, { backgroundColor: colors.dim }]}
          />
        )}
        <View
          style={[
            styles.panel,
            confirm ? styles.confirm : null,
            { backgroundColor: colors.bg, paddingBottom: space[2] + insets.bottom },
          ]}
        >
          <View
            testID="sheet-handle"
            aria-hidden
            style={[styles.handle, { backgroundColor: colors.line }]}
          />
          {title ? (
            <Text
              ref={titleRef}
              nativeID={titleId}
              accessibilityRole="header"
              style={text('title', { weight: 'bold' })}
            >
              {title}
            </Text>
          ) : null}
          {body ? (
            <Text style={[text('body'), styles.body, { color: colors.muted }]}>{body}</Text>
          ) : null}
          {actions.map((action, index) => {
            const ref = index === focusIndex ? firstActionRef : undefined;
            const hint = action.destructive ? DESTRUCTIVE_HINT : undefined;
            return confirm ? (
              <Button
                key={`${index}-${action.label}`}
                ref={ref}
                label={action.label}
                variant={
                  action.destructive ? 'danger' : action.role === 'cancel' ? 'ghost' : 'secondary'
                }
                accessibilityHint={hint}
                onPress={() => press(action)}
              />
            ) : (
              <SheetItem
                key={`${index}-${action.label}`}
                ref={ref}
                action={action}
                hint={hint}
                first={index === 0}
                onPress={() => press(action)}
              />
            );
          })}
        </View>
      </View>
    </Modal>
  );
}

interface SheetItemProps {
  ref?: RefObject<View | null>;
  action: SheetAction;
  hint?: string;
  first: boolean;
  onPress: () => void;
}

// 캔버스 .sheet-item: 아이콘과 글자 한 줄, 두 번째 항목부터 위에 선과 행 높이.
function SheetItem({ ref, action, hint, first, onPress }: SheetItemProps): React.JSX.Element {
  const { colors, text } = useTheme();
  const color = action.destructive ? colors.danger : colors.text;
  const Icon = action.icon;

  return (
    <Pressable
      ref={ref}
      accessibilityRole="button"
      accessibilityLabel={action.label}
      accessibilityHint={hint}
      onPress={onPress}
      style={({ pressed }) => [
        styles.item,
        first ? null : [styles.itemNext, { borderTopColor: colors.line }],
        { opacity: pressed ? 0.6 : 1 },
      ]}
    >
      {Icon ? (
        <View aria-hidden>
          <Icon color={color} size={20} />
        </View>
      ) : null}
      <Text style={[text('body'), { color }]}>{action.label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  panel: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingTop: space[2],
    paddingHorizontal: space[4],
  },
  // menu 항목은 붙어 있고 confirm 요소는 space-2씩 띄운다.
  confirm: { gap: space[2] },
  handle: {
    alignSelf: 'center',
    width: size.touch - space[2],
    height: 4,
    borderRadius: radius.full,
    marginBottom: space[3],
  },
  body: { marginBottom: space[3] },
  item: {
    minHeight: size.button,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
  },
  itemNext: { minHeight: size.row, borderTopWidth: 1 },
});

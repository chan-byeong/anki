import { useEffect, useEffectEvent, useId, useRef, useState, type RefObject } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type LayoutChangeEvent,
  type TextInstance,
  type ViewInstance,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { useMotion } from '@/hooks/use-motion';
import { moveFocus } from '@/utils/move-focus';
import { useTheme } from '../theme/ThemeProvider';
import { easeIn, easeOut, radius, size, space } from '../theme/tokens';
import { Button, type ButtonVariant } from './Button';
import type { IconComponent } from './icons';

export type SheetKind = 'menu' | 'confirm';

export interface SheetAction {
  label: string;
  onPress: () => void;
  // 되돌릴 수 없는 동작. 힌트로 알리고 danger 색으로 그린다.
  destructive?: boolean;
  // 복구할 수 있지만 조심해야 하는 동작("덱 삭제"). danger 색으로만 그리고 되돌릴 수 없다고 알리지 않는다.
  danger?: boolean;
  // menu 항목 이름 아래 한 줄 설명. 접근성 힌트로도 읽힌다.
  description?: string;
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
  triggerRef?: RefObject<ViewInstance | null>;
  // 완전히 닫힌 뒤(포커스를 돌려준 다음) 불린다. 다음 시트는 여기서 연다. iOS는 닫히는 Modal 위에
  // 다른 Modal을 띄우지 못할 수 있다. 트리거가 사라져 돌아갈 곳이 없을 때 포커스를 보낼 곳도 여기서 정한다(ADR 0007).
  onClosed?: () => void;
}

const DESTRUCTIVE_HINT = '되돌릴 수 없는 동작입니다';

// 제목이 없을 때 첫 포커스: destructive가 아닌 첫 액션, 모두 destructive면 첫 액션(ADR 0007).
function initialFocusIndex(actions: readonly SheetAction[]): number {
  const index = actions.findIndex((action) => !action.destructive);
  return index === -1 ? 0 : index;
}

function confirmVariant(action: SheetAction): ButtonVariant {
  if (action.destructive) return 'danger';
  return action.role === 'cancel' || action.danger ? 'ghost' : 'primary';
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

// 닫힌 뒤 트리거로 포커스를 돌려주고 onClosed를 부른다. Modal이 완전히 사라진 뒤 부르는 onDismiss는
// iOS와 웹에만 있어서, Android는 Modal을 내리는 순간(shown이 true에서 false로 바뀔 때) 보낸다.
function useAfterClose(
  shown: boolean,
  triggerRef?: RefObject<ViewInstance | null>,
  onClosed?: () => void,
): () => void {
  const wasShown = useRef(shown);
  const afterClose = () => {
    const trigger = triggerRef?.current;
    if (trigger) moveFocus(trigger);
    onClosed?.();
  };

  useEffect(() => {
    const closed = wasShown.current && !shown;
    wasShown.current = shown;
    if (closed && Platform.OS === 'android') afterClose();
  });

  return afterClose;
}

const EASE_OUT = Easing.bezier(...easeOut);
const EASE_IN = Easing.bezier(...easeIn);

// 열고 닫는 움직임(ADR 0005). 가림막은 페이드, 패널은 아래에서 올라온다(열림 enter·easeOut,
// 닫힘 motion·easeIn). 동작 줄이기에서는 패널도 움직이지 않고 페이드만 한다. Modal은 닫힘
// 애니메이션이 끝난 뒤에 내려가므로 shown이 visible보다 늦게 false가 된다.
function useSheetMotion(visible: boolean, onOpened: () => void) {
  const { reduced, motion, enter } = useMotion();
  const [shown, setShown] = useState(visible);
  if (visible && !shown) setShown(true);
  const progress = useSharedValue(0);
  // 패널 높이를 재기 전에는 화면 높이만큼 아래에 둔다.
  const panelHeight = useSharedValue(useWindowDimensions().height);

  const opened = useEffectEvent(onOpened);
  // 닫히는 사이 다시 열렸으면 내리지 않는다.
  const closed = useEffectEvent(() => {
    if (!visible) setShown(false);
  });

  useEffect(() => {
    progress.value = visible
      ? withTiming(1, { duration: enter, easing: EASE_OUT }, (finished) => {
          if (finished) scheduleOnRN(opened);
        })
      : withTiming(0, { duration: motion, easing: EASE_IN }, (finished) => {
          if (finished) scheduleOnRN(closed);
        });
  }, [visible, enter, motion, progress]);

  const dimStyle = useAnimatedStyle(() => ({ opacity: progress.value }));
  const panelStyle = useAnimatedStyle(
    () =>
      reduced
        ? { opacity: progress.value, transform: [{ translateY: 0 }] }
        : { opacity: 1, transform: [{ translateY: (1 - progress.value) * panelHeight.value }] },
    [reduced],
  );

  const onPanelLayout = (event: LayoutChangeEvent) => {
    panelHeight.value = event.nativeEvent.layout.height;
  };

  return { shown, dimStyle, panelStyle, onPanelLayout };
}

export function Sheet({
  visible,
  kind,
  title,
  body,
  actions,
  onClose,
  triggerRef,
  onClosed,
}: SheetProps): React.JSX.Element {
  const { colors, text } = useTheme();
  const insets = useSafeAreaInsets();
  const titleId = useId();
  const titleRef = useRef<TextInstance>(null);
  const firstActionRef = useRef<ViewInstance>(null);
  useDevWarnings(visible, kind, actions);

  const confirm = kind === 'confirm';
  const focusIndex = title ? -1 : initialFocusIndex(actions);

  // 열기 애니메이션이 끝난 뒤 시트 안으로 포커스를 보낸다(ADR 0007).
  const focusInside = () => {
    const target = titleRef.current ?? firstActionRef.current;
    if (target) moveFocus(target);
  };
  const { shown, dimStyle, panelStyle, onPanelLayout } = useSheetMotion(visible, focusInside);
  const afterClose = useAfterClose(shown, triggerRef, onClosed);

  // 먼저 닫고 액션을 부른다. 액션이 다음 시트를 여는 연쇄 흐름에서 닫기가 그 상태를 덮지 않는다.
  const press = (action: SheetAction) => {
    onClose();
    action.onPress();
  };

  return (
    <Modal
      visible={shown}
      transparent
      animationType="none"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onClose}
      onDismiss={afterClose}
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
        // 닫히는 동안에는 눌리지 않게 해서 같은 액션이 두 번 불리지 않는다.
        pointerEvents={visible ? 'auto' : 'none'}
        style={styles.root}
      >
        <Animated.View
          testID="sheet-dim"
          aria-hidden
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, { backgroundColor: colors.dim }, dimStyle]}
        />
        {/* menu는 가림막이 "메뉴 닫기" 버튼이고, confirm은 눌러도 닫히지 않는 장식이다(ADR 0008). */}
        {confirm ? (
          <View testID="sheet-scrim" aria-hidden style={StyleSheet.absoluteFill} />
        ) : (
          <Pressable
            testID="sheet-scrim"
            accessibilityRole="button"
            accessibilityLabel="메뉴 닫기"
            onPress={onClose}
            style={StyleSheet.absoluteFill}
          />
        )}
        <Animated.View
          testID="sheet-panel"
          onLayout={onPanelLayout}
          style={[
            styles.panel,
            confirm ? styles.confirm : null,
            { backgroundColor: colors.bg, paddingBottom: space[2] + insets.bottom },
            panelStyle,
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
            // confirm의 주 동작은 primary, 되돌릴 수 없으면 danger, 취소는 ghost(캔버스 Settings-3, Trash-2, Trash-3).
            // danger는 ghost에 글자만 danger 색이다(Trash-2의 "영구 삭제").
            return confirm ? (
              <Button
                key={`${index}-${action.label}`}
                ref={ref}
                label={action.label}
                variant={confirmVariant(action)}
                dangerText={!action.destructive && action.danger}
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
        </Animated.View>
      </View>
    </Modal>
  );
}

interface SheetItemProps {
  ref?: RefObject<ViewInstance | null>;
  action: SheetAction;
  hint?: string;
  first: boolean;
  onPress: () => void;
}

// 캔버스 .sheet-item: 아이콘과 글자 한 줄, 두 번째 항목부터 위에 선과 행 높이.
function SheetItem({ ref, action, hint, first, onPress }: SheetItemProps): React.JSX.Element {
  const { colors, text } = useTheme();
  const color = action.destructive || action.danger ? colors.danger : colors.text;
  const Icon = action.icon;
  const spokenHint = [action.description, hint].filter(Boolean).join('. ') || undefined;

  return (
    <Pressable
      ref={ref}
      accessibilityRole="button"
      accessibilityLabel={action.label}
      accessibilityHint={spokenHint}
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
      <View style={styles.itemText}>
        <Text style={[text('body'), { color }]}>{action.label}</Text>
        {action.description ? (
          <Text style={[text('caption'), { color: colors.muted }]}>{action.description}</Text>
        ) : null}
      </View>
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
  itemText: { flex: 1 },
  itemNext: { minHeight: size.row, borderTopWidth: 1 },
});

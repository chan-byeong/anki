import { Sheet } from '@/components';
import { ThemeProvider } from '@/theme/ThemeProvider';
import {
  act,
  isHiddenFromAccessibility,
  render,
  screen,
  userEvent,
} from '@testing-library/react-native';
import React from 'react';
import { AccessibilityInfo, Platform, type ViewInstance } from 'react-native';

// Modal이 받은 props를 가로채서 onRequestClose·onShow·animationType을 테스트에서 직접 호출/검증한다.
// (RNTL 쿼리로는 Modal의 props에 닿을 수 없다. 변수 이름이 mock으로 시작해야 jest.mock 안에서 쓸 수 있다.)
const mockModalProps: {
  current?: {
    onRequestClose?: () => void;
    onShow?: () => void;
    onDismiss?: () => void;
    animationType?: string;
  };
} = {};
jest.mock('react-native/Libraries/Modal/Modal', () => {
  const ReactActual = jest.requireActual('react');
  const Actual = jest.requireActual('react-native/Libraries/Modal/Modal');
  const RealModal = Actual.default ?? Actual;
  const SpyModal = (props: object) => {
    mockModalProps.current = props;
    return ReactActual.createElement(RealModal, props);
  };
  return { __esModule: true, default: SpyModal };
});

// 하단 안전 영역은 라이브러리가 제공하는 목으로 채운다(insets 0).
jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual('react-native-safe-area-context/jest/mock').default,
);

// 모션 줄이기는 공통 훅이 구독하므로 Sheet 테스트에서는 훅의 반환값만 바꾼다.
// (훅 경로·이름은 ADR 0005를 따른다: src/hooks/use-reduced-motion.ts의 named export)
const mockReducedMotion = { current: false };
jest.mock('@/hooks/use-reduced-motion', () => ({
  useReducedMotion: () => mockReducedMotion.current,
}));

const renderSheet = async (props: React.ComponentProps<typeof Sheet>) => {
  return await render(
    <ThemeProvider>
      <Sheet {...props} />
    </ThemeProvider>,
  );
};

const actions = [
  {
    label: '삭제',
    destructive: true,
    onPress: jest.fn(),
  },
  { label: '공유', onPress: jest.fn() },
];

const sheetDefaultProps = {
  visible: true,
  onClose: jest.fn(),
};

// 컨테이너는 자식 항목이 하나로 합쳐지지 않도록 accessible이 아니라서(ADR 0008) role 쿼리에 잡히지 않는다.
// testID로 찾고 role은 prop으로 확인한다.
const getContainer = () => screen.getByTestId('sheet');

describe('접근성 이름과 role', () => {
  it('모든 액션이 접근 가능한 이름을 가진다.', async () => {
    await renderSheet({ kind: 'confirm', actions: actions, ...sheetDefaultProps });

    // confirm의 가림막은 버튼이 아니므로 버튼은 액션 수와 같다.
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(actions.length);

    for (const action of actions) {
      expect(screen.getByRole('button', { name: action.label })).toBeTruthy();
    }
  });

  it('kind가 confirm이면 컨테이너 role이 alertdialog다.', async () => {
    await renderSheet({ kind: 'confirm', actions: actions, ...sheetDefaultProps });
    expect(getContainer()).toHaveProp('role', 'alertdialog');
  });

  it('kind가 menu이면 컨테이너 role이 dialog다(캔버스 그대로).', async () => {
    await renderSheet({ kind: 'menu', actions: actions, ...sheetDefaultProps });

    expect(getContainer()).toHaveProp('role', 'dialog');
  });

  // aria-labelledby는 Android 전용이라 이 검사는 Android의 이름만 보장한다. iOS는 제목으로 가는 첫 포커스가 맡는다.
  it('제목이 있으면 컨테이너 이름이 제목과 연결된다.', async () => {
    await renderSheet({ title: 'Test', kind: 'confirm', actions: actions, ...sheetDefaultProps });

    expect(getContainer()).toHaveAccessibleName('Test');
  });

  it('시트는 뒤 화면을 가리는 모달로 표시된다.', async () => {
    await renderSheet({ title: 'Test', kind: 'menu', actions, ...sheetDefaultProps });

    expect(getContainer()).toHaveProp('aria-modal', true);
  });

  it('컨테이너는 자식 항목을 하나로 합치지 않는다.', async () => {
    await renderSheet({ title: 'Test', kind: 'menu', actions, ...sheetDefaultProps });

    expect(getContainer().props.accessible).toBeFalsy();
    expect(screen.getByRole('button', { name: '공유' })).toBeTruthy();
  });
});

describe('액션 동작', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('액션을 누르면 해당 onPress가 호출된다', async () => {
    await renderSheet({ title: 'Test', kind: 'confirm', actions: actions, ...sheetDefaultProps });

    await userEvent.press(screen.getByRole('button', { name: '삭제' }));

    expect(actions[0].onPress).toHaveBeenCalledTimes(1);
    expect(actions[1].onPress).not.toHaveBeenCalled();
  });

  it('액션을 누른 뒤 시트가 스스로 닫히는지, 호출부가 닫는지', async () => {
    await renderSheet({ title: 'Test', kind: 'menu', actions: actions, ...sheetDefaultProps });

    await userEvent.press(screen.getByRole('button', { name: '삭제' }));

    expect(actions[0].onPress).toHaveBeenCalledTimes(1);
    expect(sheetDefaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('닫기를 액션보다 먼저 불러서 액션이 연 다음 시트를 덮지 않는다', async () => {
    const calls: string[] = [];
    await renderSheet({
      kind: 'menu',
      actions: [{ label: '덱 삭제', onPress: () => calls.push('action') }],
      visible: true,
      onClose: () => calls.push('close'),
    });

    await userEvent.press(screen.getByRole('button', { name: '덱 삭제' }));

    expect(calls).toEqual(['close', 'action']);
  });

  it('파괴 표시가 있는 액션의 접근성 이름/상태가 다른 액션과 구분되는지', async () => {
    await renderSheet({ title: 'Test', kind: 'confirm', actions: actions, ...sheetDefaultProps });

    const del = screen.getByRole('button', { name: '삭제' });
    expect(del).toHaveProp('accessibilityHint', '되돌릴 수 없는 동작입니다'); // 또는 hint 쿼리
    expect(screen.getByRole('button', { name: '공유' }).props.accessibilityHint).toBeUndefined();
  });

  it('menu의 파괴 동작도 같은 힌트로 구분된다.', async () => {
    await renderSheet({ kind: 'menu', actions, ...sheetDefaultProps });

    expect(screen.getByRole('button', { name: '삭제' })).toHaveProp(
      'accessibilityHint',
      '되돌릴 수 없는 동작입니다',
    );
  });
});

describe('렌더와 속성', () => {
  it('visible이 false면 아무것도 그려지지 않는다.', async () => {
    await renderSheet({
      title: 'Test',
      kind: 'menu',
      actions,
      ...sheetDefaultProps,
      visible: false,
    });

    expect(screen.queryAllByRole('button')).toHaveLength(0);
    expect(screen.queryByText('Test')).toBeNull();
  });

  it('title과 body가 있으면 그려진다.', async () => {
    await renderSheet({
      title: 'Test',
      body: '삭제한 카드는 휴지통에서 복구할 수 있습니다.',
      kind: 'confirm',
      actions,
      ...sheetDefaultProps,
    });

    expect(screen.getByText('Test')).toBeTruthy();
    expect(screen.getByText('삭제한 카드는 휴지통에서 복구할 수 있습니다.')).toBeTruthy();
  });

  it('menu는 title이 없어도 그려진다.', async () => {
    await renderSheet({ kind: 'menu', actions, ...sheetDefaultProps });

    expect(getContainer()).toHaveProp('role', 'dialog');
    expect(screen.getByRole('button', { name: '삭제' })).toBeTruthy();
  });
});

describe('접근성 이름과 role (이어서)', () => {
  it('장식 요소(손잡이)는 접근성 트리에서 숨겨진다.', async () => {
    await renderSheet({ kind: 'menu', actions, ...sheetDefaultProps });

    const handle = screen.getByTestId('sheet-handle', { hidden: true });
    expect(isHiddenFromAccessibility(handle)).toBe(true);
  });
});

describe('닫기 경로 (ADR 0008)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it.each(['menu', 'confirm'] as const)(
    '%s: Android 뒤로가기(onRequestClose)가 onClose를 호출한다.',
    async (kind) => {
      await renderSheet({ title: 'Test', kind, actions, ...sheetDefaultProps });

      await act(() => mockModalProps.current?.onRequestClose?.());

      expect(sheetDefaultProps.onClose).toHaveBeenCalledTimes(1);
    },
  );

  it.each(['menu', 'confirm'] as const)(
    '%s: iOS escape(onAccessibilityEscape)가 onClose를 호출한다.',
    async (kind) => {
      await renderSheet({ title: 'Test', kind, actions, ...sheetDefaultProps });

      const container = getContainer();
      expect(container).toHaveProp('onAccessibilityEscape');
      await act(() => container.props.onAccessibilityEscape());

      expect(sheetDefaultProps.onClose).toHaveBeenCalledTimes(1);
    },
  );

  it('menu: 가림막은 "메뉴 닫기" 버튼으로 노출되고 누르면 닫힌다.', async () => {
    await renderSheet({ kind: 'menu', actions, ...sheetDefaultProps });

    await userEvent.press(screen.getByRole('button', { name: '메뉴 닫기' }));

    expect(sheetDefaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('confirm: 가림막은 닫기 버튼으로 노출되지 않는다.', async () => {
    await renderSheet({ title: 'Test', kind: 'confirm', actions, ...sheetDefaultProps });

    // 먼저 시트가 그려졌는지 확인해서 빈 화면에서 통과하지 않게 한다
    expect(getContainer()).toBeTruthy();
    expect(screen.queryByRole('button', { name: '메뉴 닫기' })).toBeNull();
    expect(isHiddenFromAccessibility(screen.getByTestId('sheet-scrim', { hidden: true }))).toBe(
      true,
    );
  });

  it('confirm: 가림막을 눌러도 닫히지 않는다.', async () => {
    await renderSheet({ title: 'Test', kind: 'confirm', actions, ...sheetDefaultProps });

    // confirm 가림막은 접근성 트리에서 숨겨져 있으므로 hidden 요소까지 찾는다.
    await userEvent.press(screen.getByTestId('sheet-scrim', { hidden: true }));

    expect(sheetDefaultProps.onClose).not.toHaveBeenCalled();
  });

  it('iOS 스와이프 닫기(allowSwipeDismissal)를 켜지 않는다.', async () => {
    await renderSheet({ title: 'Test', kind: 'menu', actions, ...sheetDefaultProps });

    const modalProps = mockModalProps.current as { allowSwipeDismissal?: boolean } | undefined;
    expect(modalProps?.allowSwipeDismissal).toBeFalsy();
  });
});

describe('초기 포커스 (ADR 0007)', () => {
  let sendEvent: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    sendEvent = jest.spyOn(AccessibilityInfo, 'sendAccessibilityEvent').mockImplementation();
  });

  afterEach(() => {
    sendEvent.mockRestore();
  });

  // 열기 애니메이션이 끝난 뒤(onShow) 포커스를 보낸다.
  const showSheet = () => act(() => mockModalProps.current?.onShow?.());

  it('열리기 전에는 포커스를 보내지 않는다.', async () => {
    await renderSheet({ title: 'Test', kind: 'confirm', actions, ...sheetDefaultProps });

    expect(sendEvent).not.toHaveBeenCalled();
  });

  it('제목이 있으면 열린 뒤 포커스를 한 번 보낸다.', async () => {
    await renderSheet({ title: 'Test', kind: 'confirm', actions, ...sheetDefaultProps });

    await showSheet();

    expect(sendEvent).toHaveBeenCalledTimes(1);
    expect(sendEvent).toHaveBeenCalledWith(expect.anything(), 'focus');
  });

  it('제목이 없으면(menu) 열린 뒤 포커스를 한 번 보낸다.', async () => {
    await renderSheet({ kind: 'menu', actions, ...sheetDefaultProps });

    await showSheet();

    expect(sendEvent).toHaveBeenCalledTimes(1);
    expect(sendEvent).toHaveBeenCalledWith(expect.anything(), 'focus');
  });

  it('같은 열림 동안 다시 렌더돼도 포커스를 다시 보내지 않는다.', async () => {
    await renderSheet({ title: 'Test', kind: 'confirm', actions, ...sheetDefaultProps });
    await showSheet();

    await screen.rerender(
      <ThemeProvider>
        <Sheet title="Test" kind="confirm" actions={actions} {...sheetDefaultProps} />
      </ThemeProvider>,
    );

    expect(sendEvent).toHaveBeenCalledTimes(1);
  });

  // sendAccessibilityEvent가 받는 ref는 RN 목(mock)의 컴포넌트 인스턴스라 RNTL 요소와 같은 객체가 아니다.
  // 그래서 대상은 인스턴스 props의 접근성 이름(없으면 글자)으로 식별한다.
  const focusedName = () => {
    const target = sendEvent.mock.calls[0]?.[0] as
      { props: { accessibilityLabel?: string; children?: unknown } } | undefined;
    return target?.props.accessibilityLabel ?? target?.props.children;
  };
  const noop = () => {};

  it('제목이 있으면 포커스 대상은 제목이다', async () => {
    await renderSheet({ title: 'Test', kind: 'confirm', actions, ...sheetDefaultProps });
    await showSheet();

    expect(focusedName()).toBe('Test');
  });

  it('제목이 없으면 destructive가 아닌 첫 액션이 포커스 대상이다', async () => {
    await renderSheet({ kind: 'menu', actions, ...sheetDefaultProps });
    await showSheet();

    expect(focusedName()).toBe('공유');
  });

  it('destructive가 아닌 액션이 여럿이면 그중 첫 번째가 포커스 대상이다', async () => {
    await renderSheet({
      kind: 'menu',
      actions: [
        { label: '삭제', destructive: true, onPress: noop },
        { label: '편집', onPress: noop },
        { label: '공유', onPress: noop },
      ],
      ...sheetDefaultProps,
    });
    await showSheet();

    expect(focusedName()).toBe('편집');
  });

  it('모든 액션이 destructive면 첫 액션이 포커스 대상이다', async () => {
    await renderSheet({
      kind: 'menu',
      actions: [
        { label: '삭제', destructive: true, onPress: noop },
        { label: '비우기', destructive: true, onPress: noop },
      ],
      ...sheetDefaultProps,
    });
    await showSheet();

    expect(focusedName()).toBe('삭제');
  });
});

describe('포커스 복귀 (ADR 0006, 0007)', () => {
  let sendEvent: jest.SpyInstance;
  const trigger = { label: 'trigger' } as unknown as ViewInstance;
  const triggerRef = { current: trigger };

  beforeEach(() => {
    sendEvent = jest.spyOn(AccessibilityInfo, 'sendAccessibilityEvent').mockImplementation();
  });

  // Platform.OS 교체도 함께 되돌려서, 검사가 실패해도 다음 테스트로 새지 않게 한다.
  // restoreAllMocks만으로는 spy가 되돌아가지 않아 호출 기록이 다음 테스트에 남았으므로 spy를 직접 되돌린다.
  afterEach(() => {
    sendEvent.mockRestore();
    jest.restoreAllMocks();
  });

  const sheet = (props: Partial<React.ComponentProps<typeof Sheet>>) => (
    <ThemeProvider>
      <Sheet
        kind="menu"
        actions={actions}
        {...sheetDefaultProps}
        triggerRef={triggerRef}
        {...props}
      />
    </ThemeProvider>
  );

  // iOS와 웹은 Modal이 완전히 닫힌 뒤(onDismiss) 보낸다. RN 네이티브의 onDismiss는 iOS에서만 호출된다.
  it('iOS: 닫히고 Modal이 사라진 뒤 트리거 ref로 포커스를 보낸다', async () => {
    const view = await render(sheet({}));
    await view.rerender(sheet({ visible: false }));
    expect(sendEvent).not.toHaveBeenCalled();

    await act(() => mockModalProps.current?.onDismiss?.());

    expect(sendEvent).toHaveBeenCalledTimes(1);
    expect(sendEvent).toHaveBeenCalledWith(trigger, 'focus');
  });

  it('Android: 닫히는 순간 트리거 ref로 포커스를 보낸다', async () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    const view = await render(sheet({}));

    await view.rerender(sheet({ visible: false }));

    expect(sendEvent).toHaveBeenCalledTimes(1);
    expect(sendEvent).toHaveBeenCalledWith(trigger, 'focus');
  });

  it('웹: sendAccessibilityEvent 없이 트리거 요소의 focus()로 한 번 옮긴다', async () => {
    // react-native-web의 AccessibilityInfo에는 sendAccessibilityEvent가 없고, Modal은 onDismiss를 부른다.
    jest.replaceProperty(Platform, 'OS', 'web');
    const focus = jest.fn();
    const webTrigger = { current: { focus } as unknown as ViewInstance };
    const view = await render(sheet({ triggerRef: webTrigger }));
    await view.rerender(sheet({ triggerRef: webTrigger, visible: false }));

    await act(() => mockModalProps.current?.onDismiss?.());

    expect(focus).toHaveBeenCalledTimes(1);
    expect(sendEvent).not.toHaveBeenCalled();
  });

  it('다음 시트로 넘어가며 triggerRef를 비우면 포커스를 돌려주지 않는다', async () => {
    // 연쇄 흐름에서 menu는 닫힐 때 triggerRef가 없어서, 열리는 confirm의 포커스를 빼앗지 않는다.
    jest.replaceProperty(Platform, 'OS', 'android');
    const view = await render(sheet({}));

    await view.rerender(sheet({ triggerRef: undefined, visible: false }));

    expect(sendEvent).not.toHaveBeenCalled();
  });

  it('열린 적 없이 닫힌 상태로 그려지면 포커스를 보내지 않는다', async () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    const view = await render(sheet({ visible: false }));
    await view.rerender(sheet({ visible: false }));

    expect(sendEvent).not.toHaveBeenCalled();
  });

  it('트리거 ref가 비어 있어도 오류 없이 닫힌다', async () => {
    const view = await render(sheet({ triggerRef: { current: null } }));
    await view.rerender(sheet({ triggerRef: { current: null }, visible: false }));

    await act(() => mockModalProps.current?.onDismiss?.());

    expect(sendEvent).not.toHaveBeenCalled();
  });

  it('연쇄 흐름(menu→confirm)에서 confirm이 닫힐 때도 같은 트리거 ref로 보낸다', async () => {
    // 호출부가 마지막 시트에 처음 트리거 ref를 넘기는 구성이 전제다(ADR 0006).
    const view = await render(sheet({ kind: 'confirm', title: '삭제할까요?' }));
    await view.rerender(sheet({ kind: 'confirm', title: '삭제할까요?', visible: false }));

    await act(() => mockModalProps.current?.onDismiss?.());

    expect(sendEvent).toHaveBeenLastCalledWith(trigger, 'focus');
  });
});

describe('모션 줄이기 (ADR 0005)', () => {
  // 구독은 훅(useReducedMotion)의 일이라 훅 테스트에서 다룬다. 여기서는 훅의 값만 따른다.
  afterEach(() => {
    mockReducedMotion.current = false;
  });

  it('모션 줄이기가 켜져 있으면 전환 애니메이션이 없다.', async () => {
    mockReducedMotion.current = true;

    await renderSheet({ title: 'Test', kind: 'menu', actions, ...sheetDefaultProps });

    expect(mockModalProps.current?.animationType).toBe('none');
  });

  it('모션 줄이기가 꺼져 있으면 전환 애니메이션이 있다.', async () => {
    await renderSheet({ title: 'Test', kind: 'menu', actions, ...sheetDefaultProps });

    expect(mockModalProps.current?.animationType).not.toBe('none');
  });

  it('열려 있는 동안 설정이 바뀌면 다시 그릴 때 반영된다.', async () => {
    const view = await renderSheet({ title: 'Test', kind: 'menu', actions, ...sheetDefaultProps });
    expect(mockModalProps.current?.animationType).not.toBe('none');

    mockReducedMotion.current = true;
    await view.rerender(
      <ThemeProvider>
        <Sheet title="Test" kind="menu" actions={actions} {...sheetDefaultProps} />
      </ThemeProvider>,
    );

    expect(mockModalProps.current?.animationType).toBe('none');
  });
});

describe('개발 모드 경고 (ADR 0008)', () => {
  let warn: jest.SpyInstance;
  const confirmActions = [
    { label: '삭제', destructive: true, onPress: jest.fn() },
    { label: '취소', role: 'cancel' as const, onPress: jest.fn() },
  ];

  beforeEach(() => {
    warn = jest.spyOn(console, 'warn').mockImplementation();
  });

  afterEach(() => {
    warn.mockRestore();
  });

  it('confirm에 취소 표시가 없으면 __DEV__에서 경고한다', async () => {
    await renderSheet({ title: 'Test', kind: 'confirm', actions, ...sheetDefaultProps });

    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toMatch(/cancel/);
  });

  it('confirm에 취소 표시가 있으면 경고하지 않는다', async () => {
    await renderSheet({
      title: 'Test',
      kind: 'confirm',
      actions: confirmActions,
      ...sheetDefaultProps,
    });

    expect(warn).not.toHaveBeenCalled();
  });

  it('menu는 취소 항목이 없어도 경고하지 않는다', async () => {
    await renderSheet({ kind: 'menu', actions, ...sheetDefaultProps });

    expect(warn).not.toHaveBeenCalled();
  });

  it('레이블이 비어 있는 액션이 있으면 경고한다', async () => {
    // 빈 문자열은 타입으로 막을 수 없어 개발 모드 경고로 알린다.
    await renderSheet({
      kind: 'menu',
      actions: [{ label: '', onPress: jest.fn() }, ...actions],
      ...sheetDefaultProps,
    });

    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toMatch(/label/);
  });

  it('열린 채 다시 그려져도 같은 경고를 반복하지 않는다', async () => {
    const props = { title: 'Test', kind: 'confirm' as const, ...sheetDefaultProps };
    const view = await renderSheet({ ...props, actions: [...actions] });

    // 호출부가 actions를 매 렌더 새 배열로 넘기는 경우
    await view.rerender(
      <ThemeProvider>
        <Sheet {...props} actions={[...actions]} />
      </ThemeProvider>,
    );

    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('닫혀 있을 때는 경고하지 않는다', async () => {
    await renderSheet({
      title: 'Test',
      kind: 'confirm',
      actions,
      ...sheetDefaultProps,
      visible: false,
    });

    expect(warn).not.toHaveBeenCalled();
  });
});

import {
  AndroidHaptics,
  ImpactFeedbackStyle,
  impactAsync,
  performAndroidHapticsAsync,
  selectionAsync,
} from 'expo-haptics';
import { Platform } from 'react-native';

import { haptic } from '@/utils/haptics';

// 햅틱(ADR 0021): 화면은 의미 이름(rate 평가, select 길게 눌러 선택, threshold 제스처 문턱)으로 부르고,
// 어떤 진동으로 낼지는 haptics.ts 한 곳에서 정한다. 시스템의 진동 설정은 시스템이 따르므로 여기서 보지 않는다.
// 움직임이 아니므로 동작 줄이기와 무관하다. useMotion을 쓰지 않는다.
// 진동은 부가 효과라서 부르는 쪽이 await 하거나 예외를 감싸지 않아도 되게, 반환값 없이 던지지도 않아야 한다.

// 진짜 진동은 울리지 않고 어떤 호출이 갔는지만 본다. 열거형 값은 실제 모듈 것을 그대로 쓴다.
jest.mock('expo-haptics', () => ({
  ...jest.requireActual('expo-haptics'),
  impactAsync: jest.fn(() => Promise.resolve()),
  selectionAsync: jest.fn(() => Promise.resolve()),
  performAndroidHapticsAsync: jest.fn(() => Promise.resolve()),
}));

const NAMES = ['rate', 'select', 'threshold'] as const;

const setPlatform = (os: 'ios' | 'android' | 'web') => {
  jest.replaceProperty(Platform, 'OS', os);
};

// 아무 진동도 가지 않았다.
const expectSilent = () => {
  expect(impactAsync).not.toHaveBeenCalled();
  expect(selectionAsync).not.toHaveBeenCalled();
  expect(performAndroidHapticsAsync).not.toHaveBeenCalled();
};

beforeEach(() => {
  jest.clearAllMocks();
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('haptic: 이름', () => {
  it('이름은 rate, select, threshold 셋뿐이다', () => {
    expect(Object.keys(haptic).sort()).toEqual([...NAMES]);
  });

  it('부르지 않으면 진동도 가지 않는다', () => {
    expectSilent();
  });
});

describe.each(['ios', 'web'] as const)('haptic: %s', (os) => {
  beforeEach(() => setPlatform(os));

  it('rate는 가벼운 충격 한 번이다', () => {
    haptic.rate();

    expect(impactAsync).toHaveBeenCalledTimes(1);
    expect(impactAsync).toHaveBeenCalledWith(ImpactFeedbackStyle.Light);
    expect(selectionAsync).not.toHaveBeenCalled();
    expect(performAndroidHapticsAsync).not.toHaveBeenCalled();
  });

  it('select는 선택 틱 한 번이다', () => {
    haptic.select();

    expect(selectionAsync).toHaveBeenCalledTimes(1);
    expect(impactAsync).not.toHaveBeenCalled();
    expect(performAndroidHapticsAsync).not.toHaveBeenCalled();
  });

  it('threshold는 rate보다 센 보통 충격 한 번이다', () => {
    haptic.threshold();

    expect(impactAsync).toHaveBeenCalledTimes(1);
    expect(impactAsync).toHaveBeenCalledWith(ImpactFeedbackStyle.Medium);
    expect(selectionAsync).not.toHaveBeenCalled();
    expect(performAndroidHapticsAsync).not.toHaveBeenCalled();
  });
});

describe('haptic: android', () => {
  // Expo 문서는 Android에서 Vibrator 기반인 impactAsync·selectionAsync 대신 performAndroidHapticsAsync를 권한다.
  beforeEach(() => setPlatform('android'));

  it.each([
    ['rate', AndroidHaptics.Confirm],
    ['select', AndroidHaptics.Long_Press],
    ['threshold', AndroidHaptics.Gesture_Start],
  ] as const)('%s는 기기의 햅틱 엔진으로 한 번 울린다', (name, type) => {
    haptic[name]();

    expect(performAndroidHapticsAsync).toHaveBeenCalledTimes(1);
    expect(performAndroidHapticsAsync).toHaveBeenCalledWith(type);
    expect(impactAsync).not.toHaveBeenCalled();
    expect(selectionAsync).not.toHaveBeenCalled();
  });
});

describe.each(['ios', 'android', 'web'] as const)('haptic: 부르는 모양 (%s)', (os) => {
  beforeEach(() => setPlatform(os));

  it.each(NAMES)('%s는 아무것도 돌려주지 않는다(Promise도 아니다)', (name) => {
    expect(haptic[name]()).toBeUndefined();
  });

  it('this 없이 떼어 내서 불러도 된다(onPress에 그대로 넘길 수 있다)', () => {
    const { rate, select, threshold } = haptic;

    expect(() => {
      rate();
      select();
      threshold();
    }).not.toThrow();
  });

  it.each(NAMES)('%s: 진동이 동기로 던져도 화면 동작을 막지 않는다', (name) => {
    const boom = () => {
      throw new Error('지원하지 않는 기기');
    };
    jest.mocked(impactAsync).mockImplementation(boom);
    jest.mocked(selectionAsync).mockImplementation(boom);
    jest.mocked(performAndroidHapticsAsync).mockImplementation(boom);

    expect(() => haptic[name]()).not.toThrow();
  });

  it.each(NAMES)('%s: 진동이 거절돼도 처리되지 않은 거절을 남기지 않는다', async (name) => {
    const rejected = () => Promise.reject(new Error('진동 꺼짐'));
    jest.mocked(impactAsync).mockImplementation(rejected);
    jest.mocked(selectionAsync).mockImplementation(rejected);
    jest.mocked(performAndroidHapticsAsync).mockImplementation(rejected);
    const unhandled = jest.fn();
    process.on('unhandledRejection', unhandled);

    haptic[name]();
    await new Promise((resolve) => setTimeout(resolve, 0));

    process.off('unhandledRejection', unhandled);
    expect(unhandled).not.toHaveBeenCalled();
  });
});

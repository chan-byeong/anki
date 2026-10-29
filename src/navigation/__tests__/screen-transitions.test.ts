import { screenTransition } from '@/navigation/screen-transitions';
import { motion } from '@/theme/tokens';

describe('화면 전환 모양', () => {
  test('들어가기는 오른쪽에서 밀려 들어온다', () => {
    expect(screenTransition('push', false)).toEqual({ animation: 'slide_from_right' });
  });

  test('따로 하는 일은 모달로, Android에서도 아래에서 올라온다', () => {
    expect(screenTransition('modal', false)).toEqual({
      presentation: 'modal',
      animation: 'slide_from_bottom',
    });
  });

  test('바꿔 끼우기는 160ms 페이드다', () => {
    expect(screenTransition('replace', false)).toEqual({
      animation: 'fade',
      animationDuration: motion,
    });
  });

  test.each(['push', 'modal', 'replace'] as const)(
    '동작 줄이기가 켜지면 %s도 이동 없이 160ms 페이드만 한다',
    (kind) => {
      expect(screenTransition(kind, true)).toMatchObject({
        animation: 'fade',
        animationDuration: motion,
      });
    },
  );

  test('동작 줄이기에서도 모달은 모달로 띄운다', () => {
    expect(screenTransition('modal', true).presentation).toBe('modal');
    expect(screenTransition('push', true).presentation).toBeUndefined();
  });
});

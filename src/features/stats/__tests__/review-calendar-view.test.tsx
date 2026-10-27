import { fireEvent, render, screen, userEvent } from '@testing-library/react-native';

import { ThemeProvider } from '@/theme/ThemeProvider';
import { studyDayOf } from '@/utils/study-day';

import { ReviewCalendar } from '../components/ReviewCalendar';
import { calendarWeeks } from '../review-calendar';

// 2026-10-27(화)
const TODAY = studyDayOf(new Date(2026, 9, 27).getTime());

const renderCalendar = () =>
  render(
    <ThemeProvider override="light">
      <ReviewCalendar
        weeks={calendarWeeks(
          [
            { studyDay: TODAY - 1, count: 24 },
            { studyDay: TODAY, count: 3 },
          ],
          TODAY,
        )}
        today={TODAY}
      />
    </ThemeProvider>,
  );

const calendar = () => screen.getByRole('adjustable');

describe('ReviewCalendar', () => {
  test('처음에는 오늘을 골라 그날 평가한 카드 수를 글자로 보여 준다', async () => {
    await renderCalendar();

    expect(screen.getByText('오늘 · 3장')).toBeOnTheScreen();
    expect(calendar()).toHaveAccessibleName(
      '최근 18주 중 2일 복습. 많이 복습한 날일수록 진하게 표시',
    );
    expect(calendar()).toHaveAccessibilityValue({ text: '10월 27일 오늘 3장' });
  });

  test('이전 날 버튼으로 날을 옮기고, 오늘에서는 다음 날 버튼이 막혀 있다', async () => {
    const user = userEvent.setup();
    await renderCalendar();

    expect(screen.getByRole('button', { name: '다음 날' })).toBeDisabled();

    await user.press(screen.getByRole('button', { name: '이전 날' }));

    expect(screen.getByText('10월 26일 · 24장')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: '다음 날' })).toBeEnabled();
  });

  test('스크린 리더에서 위아래로 쓸면 날을 옮기며 값을 읽는다', async () => {
    await renderCalendar();

    await fireEvent(calendar(), 'accessibilityAction', {
      nativeEvent: { actionName: 'decrement' },
    });
    expect(calendar()).toHaveAccessibilityValue({ text: '10월 26일 24장' });

    await fireEvent(calendar(), 'accessibilityAction', {
      nativeEvent: { actionName: 'decrement' },
    });
    expect(calendar()).toHaveAccessibilityValue({ text: '10월 25일 0장' });

    await fireEvent(calendar(), 'accessibilityAction', {
      nativeEvent: { actionName: 'increment' },
    });
    expect(calendar()).toHaveAccessibilityValue({ text: '10월 26일 24장' });
  });

  test('달력의 첫 날보다 앞으로는 가지 않는다', async () => {
    const user = userEvent.setup();
    await renderCalendar();

    for (let i = 0; i < 18 * 7; i += 1) {
      await fireEvent(calendar(), 'accessibilityAction', {
        nativeEvent: { actionName: 'decrement' },
      });
    }

    expect(calendar()).toHaveAccessibilityValue({ text: '6월 28일 0장' });
    expect(screen.getByRole('button', { name: '이전 날' })).toBeDisabled();
    await user.press(screen.getByRole('button', { name: '다음 날' }));
    expect(screen.getByText('6월 29일 · 0장')).toBeOnTheScreen();
  });

  test('달력을 누르면 누른 자리의 날을 고른다', async () => {
    await renderCalendar();
    // 18열이 폭 300에 퍼진다. 첫 열 첫 칸의 가운데를 누른다.
    await fireEvent(calendar(), 'layout', { nativeEvent: { layout: { width: 300, height: 120 } } });
    await fireEvent.press(calendar(), { nativeEvent: { locationX: 6, locationY: 6 } });

    expect(screen.getByText('6월 28일 · 0장')).toBeOnTheScreen();
  });
});

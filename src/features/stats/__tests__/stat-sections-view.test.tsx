import { render, screen, within } from '@testing-library/react-native';
import type { ReactElement } from 'react';

import { ThemeProvider } from '@/theme/ThemeProvider';
import { studyDayOf } from '@/utils/study-day';

import { RatingDistribution } from '../components/RatingDistribution';
import { ReviewForecast } from '../components/ReviewForecast';
import { ratingShare } from '../rating-share';

// 2026-10-27(화)
const TODAY = studyDayOf(new Date(2026, 9, 27).getTime());

const renderIn = (element: ReactElement) =>
  render(<ThemeProvider override="light">{element}</ThemeProvider>);

describe('RatingDistribution', () => {
  test('평가마다 모양, 비율, 횟수를 함께 보여 준다', async () => {
    await renderIn(
      <RatingDistribution
        {...ratingShare([
          { rating: 'dont', hintUsed: false, count: 148 },
          { rating: 'unsure', hintUsed: false, count: 259 },
          { rating: 'know', hintUsed: false, count: 826 },
        ])}
      />,
    );

    expect(screen.getByRole('image', { name: '모름 12%, 헷갈림 21%, 앎 67%' })).toBeOnTheScreen();
    const forgot = screen.getByLabelText('모름 12%, 148장');
    expect(within(forgot).getByText('모름')).toBeOnTheScreen();
    expect(screen.getByLabelText('헷갈림 21%, 259장')).toBeOnTheScreen();
    expect(screen.getByLabelText('앎 67%, 826장')).toBeOnTheScreen();
  });

  test('평가가 없으면 빈 상태를 보여 준다', async () => {
    await renderIn(<RatingDistribution {...ratingShare([])} />);

    expect(screen.getByText('아직 평가한 기록이 없어요')).toBeOnTheScreen();
    expect(screen.queryByRole('image')).toBeNull();
  });
});

describe('ReviewForecast', () => {
  test('오늘부터 7일의 날짜별 복습 카드 수를 요일과 함께 보여 준다', async () => {
    await renderIn(<ReviewForecast days={[50, 42, 31, 18, 24, 37, 29]} today={TODAY} />);

    const list = screen.getByLabelText('앞으로 7일 복습할 카드 수');
    expect(within(list).getByLabelText('오늘 50장')).toBeOnTheScreen();
    expect(within(list).getByLabelText('수요일 42장')).toBeOnTheScreen();
    expect(within(list).getByLabelText('월요일 29장')).toBeOnTheScreen();
    expect(screen.getByText('오늘')).toBeOnTheScreen();
    expect(screen.getByText('수')).toBeOnTheScreen();
  });

  test('7일 모두 복습할 카드가 없으면 빈 상태를 보여 준다', async () => {
    await renderIn(<ReviewForecast days={[0, 0, 0, 0, 0, 0, 0]} today={TODAY} />);

    expect(screen.getByText('앞으로 7일 동안 복습할 카드가 없어요')).toBeOnTheScreen();
  });
});

import { render, screen } from '@testing-library/react-native';
import { Platform } from 'react-native';

import { LiveAnnouncer } from '@/components/LiveAnnouncer';

// 웹은 AccessibilityInfo.announceForAccessibility가 빈 함수라 라이브 영역으로 읽힌다.
// 라이브 영역은 내용 없이 먼저 붙고, 그다음 내용이 들어와야 읽힌다.
describe('LiveAnnouncer', () => {
  afterEach(() => jest.restoreAllMocks());

  test('웹에서는 빈 라이브 영역으로 먼저 붙은 뒤 메시지가 들어온다', async () => {
    jest.replaceProperty(Platform, 'OS', 'web');
    await render(<LiveAnnouncer message="저장했어요" />);

    const region = screen.getByTestId('live-announcer');
    expect(region.props['aria-live']).toBe('polite');
    expect(region).toBeEmptyElement();
    expect(await screen.findByText('저장했어요')).toBeOnTheScreen();
  });

  test('assertive를 요청하면 assertive 라이브 영역이다', async () => {
    jest.replaceProperty(Platform, 'OS', 'web');
    await render(<LiveAnnouncer message="오류가 났어요" assertive />);

    expect(screen.getByTestId('live-announcer').props['aria-live']).toBe('assertive');
  });

  test('메시지가 바뀌면 같은 영역에 새 메시지가 들어간다', async () => {
    jest.replaceProperty(Platform, 'OS', 'web');
    await render(<LiveAnnouncer message="하나" />);
    const region = screen.getByTestId('live-announcer');

    await screen.rerender(<LiveAnnouncer message="둘" />);

    expect(screen.getByTestId('live-announcer')).toBe(region);
    expect(await screen.findByText('둘')).toBeOnTheScreen();
  });

  test('네이티브에서는 아무것도 그리지 않아 이중으로 읽히지 않는다', async () => {
    jest.replaceProperty(Platform, 'OS', 'ios');
    await render(<LiveAnnouncer message="저장했어요" />);

    expect(screen.queryByTestId('live-announcer')).toBeNull();
  });
});

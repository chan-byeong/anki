import { colors, type ColorTokens, type ThemeName } from '../tokens';

// 색 대비 기준(STA-141): 일반 텍스트 4.5:1. 글자에 쓰는 토큰은 bg와 surface 위 모두에서 넘어야 한다.
// 컨트롤 경계(line)와 통계 그래프의 연한 단계는 캔버스 토큰부터 바꿔야 해서 후속 티켓에서 다룬다.

const luminance = (hex: string): number => {
  const [r, g, b] = [1, 3, 5].map((start) => {
    const channel = parseInt(hex.slice(start, start + 2), 16) / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const contrast = (a: string, b: string): number => {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
};

const TEXT: (keyof ColorTokens)[] = ['text', 'muted', 'danger', 'warn', 'success'];
const BACKGROUNDS: (keyof ColorTokens)[] = ['bg', 'surface'];
const THEMES: ThemeName[] = ['light', 'dark'];

describe('색 대비', () => {
  test('contrast는 WCAG 공식대로 계산한다', () => {
    expect(contrast('#000000', '#FFFFFF')).toBeCloseTo(21);
    expect(contrast('#777777', '#FFFFFF')).toBeCloseTo(4.48, 2);
  });

  describe.each(THEMES)('%s', (theme) => {
    const palette = colors[theme];

    test.each(TEXT.flatMap((fg) => BACKGROUNDS.map((bg) => [fg, bg] as const)))(
      '%s 글자는 %s 위에서 4.5:1 이상이다',
      (fg, bg) => {
        expect(contrast(palette[fg], palette[bg])).toBeGreaterThanOrEqual(4.5);
      },
    );

    test('채운 버튼의 글자(inverse)는 text 바탕 위에서 4.5:1 이상이다', () => {
      expect(contrast(palette.inverse, palette.text)).toBeGreaterThanOrEqual(4.5);
    });
  });
});

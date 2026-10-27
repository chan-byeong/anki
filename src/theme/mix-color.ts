const channels = (hex: string): number[] =>
  [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16));

const toHex = (value: number): string => Math.round(value).toString(16).padStart(2, '0');

/**
 * 캔버스의 `color-mix(in srgb, fg ratio, bg)`. React Native에는 color-mix가 없어서 토큰 색끼리 직접 섞는다.
 * 두 색 모두 `#RRGGBB`여야 한다. ratio는 0(바탕색)~1(앞색)이다.
 */
export const mixColor = (fg: string, bg: string, ratio: number): string => {
  const front = channels(fg);
  const back = channels(bg);
  return `#${front.map((value, i) => toHex(value * ratio + back[i] * (1 - ratio))).join('')}`.toUpperCase();
};

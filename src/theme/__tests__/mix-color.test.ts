import { mixColor } from '../mix-color';

describe('mixColor', () => {
  test('비율이 0이면 바탕색, 1이면 앞색이다', () => {
    expect(mixColor('#111113', '#F4F4F5', 0)).toBe('#F4F4F5');
    expect(mixColor('#111113', '#F4F4F5', 1)).toBe('#111113');
  });

  test('채널마다 비율대로 섞고 반올림한다', () => {
    // CSS color-mix(in srgb, #000000 45%, #FFFFFF) = rgb(140.25, …)
    expect(mixColor('#000000', '#FFFFFF', 0.45)).toBe('#8C8C8C');
  });
});

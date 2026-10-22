import { formatCount } from '../format-count';

describe('formatCount', () => {
  test('세 자리마다 쉼표를 찍는다', () => {
    expect(formatCount(1233)).toBe('1,233');
    expect(formatCount(1234567)).toBe('1,234,567');
  });

  test('세 자리 이하는 그대로다', () => {
    expect(formatCount(0)).toBe('0');
    expect(formatCount(999)).toBe('999');
  });
});

import { joinDeckIds, parseDeckIds } from '../deck-ids';

// 복습 경로의 deckId는 선택한 덱 ID를 쉼표로 이은 값이다. 덱 하나면 지금과 같은 경로다.
describe('deck-ids', () => {
  test('덱 하나는 그 ID 그대로다', () => {
    expect(joinDeckIds(['deck-1'])).toBe('deck-1');
    expect(parseDeckIds('deck-1')).toEqual(['deck-1']);
  });

  test('여러 덱을 이었다가 되돌린다', () => {
    expect(parseDeckIds(joinDeckIds(['a', 'b', 'c']))).toEqual(['a', 'b', 'c']);
  });

  test('빈 조각과 겹친 ID는 버린다', () => {
    expect(parseDeckIds('a,,b,a,')).toEqual(['a', 'b']);
  });
});

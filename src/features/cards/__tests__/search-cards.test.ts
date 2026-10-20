import { searchCards } from '../search-cards';

const cards = [
  { id: '1', front: 'Apple', back: '사과', memo: '과일' },
  { id: '2', front: 'pear', back: '배', memo: null },
  { id: '3', front: '食べる', back: '먹다', memo: '朝ごはんを食べる' },
];

const idsOf = (query: string) => searchCards(cards, query).map((card) => card.id);

describe('searchCards', () => {
  test('앞면·뒷면·메모 중 하나에 일치하는 카드만 남긴다', () => {
    expect(idsOf('pear')).toEqual(['2']);
    expect(idsOf('사과')).toEqual(['1']);
    expect(idsOf('朝')).toEqual(['3']);
  });

  test('여러 면에 일치해도 한 번만 나오고 순서는 유지된다', () => {
    expect(idsOf('食')).toEqual(['3']);
    expect(idsOf('e')).toEqual(['1', '2']);
  });

  test('대소문자를 구분하지 않는다', () => {
    expect(idsOf('apple')).toEqual(['1']);
    expect(idsOf('PEAR')).toEqual(['2']);
  });

  test('앞뒤 공백은 무시하고, 비었거나 공백뿐이면 전부 돌려준다', () => {
    expect(idsOf('  pear ')).toEqual(['2']);
    expect(idsOf('')).toEqual(['1', '2', '3']);
    expect(idsOf('   ')).toEqual(['1', '2', '3']);
  });

  test('일치하는 카드가 없으면 빈 목록이다', () => {
    expect(idsOf('zzz')).toEqual([]);
  });

  test('메모가 없는 카드도 오류 없이 검색된다', () => {
    expect(idsOf('과일')).toEqual(['1']);
  });

  test('조합형과 완성형 한글을 같은 글자로 본다', () => {
    expect(idsOf('사과'.normalize('NFD'))).toEqual(['1']);
  });
});

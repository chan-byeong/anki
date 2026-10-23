import { searchCards, splitMatches } from '../search-cards';

const cards = [
  { id: '1', front: 'Apple', back: '사과', hint: null, memo: '과일' },
  { id: '2', front: 'pear', back: '배', hint: null, memo: null },
  { id: '3', front: '食べる', back: '먹다', hint: null, memo: '朝ごはんを食べる' },
  { id: '4', front: 'grape', back: '포도', hint: '보라색 송이', memo: null },
];

const idsOf = (query: string) => searchCards(cards, query).map((card) => card.id);

describe('searchCards', () => {
  test('앞면·뒷면·힌트·메모 중 하나에 일치하는 카드만 남긴다', () => {
    expect(idsOf('pear')).toEqual(['2']);
    expect(idsOf('사과')).toEqual(['1']);
    expect(idsOf('송이')).toEqual(['4']);
    expect(idsOf('朝')).toEqual(['3']);
  });

  test('여러 면에 일치해도 한 번만 나오고 순서는 유지된다', () => {
    expect(idsOf('食')).toEqual(['3']);
    expect(idsOf('e')).toEqual(['1', '2', '4']);
  });

  test('대소문자를 구분하지 않는다', () => {
    expect(idsOf('apple')).toEqual(['1']);
    expect(idsOf('PEAR')).toEqual(['2']);
  });

  test('앞뒤 공백은 무시하고, 비었거나 공백뿐이면 전부 돌려준다', () => {
    expect(idsOf('  pear ')).toEqual(['2']);
    expect(idsOf('')).toEqual(['1', '2', '3', '4']);
    expect(idsOf('   ')).toEqual(['1', '2', '3', '4']);
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

describe('splitMatches', () => {
  test('검색어와 일치하는 부분을 대소문자 구분 없이 나눈다', () => {
    expect(splitMatches('Apple pie, apple', 'APPLE')).toEqual([
      { text: 'Apple', match: true },
      { text: ' pie, ', match: false },
      { text: 'apple', match: true },
    ]);
  });

  test('검색어가 비었거나 일치하는 곳이 없으면 통째로 돌려준다', () => {
    expect(splitMatches('apple', '  ')).toEqual([{ text: 'apple', match: false }]);
    expect(splitMatches('apple', 'zzz')).toEqual([{ text: 'apple', match: false }]);
  });

  test('조합형 한글도 일치하는 부분을 찾는다', () => {
    expect(splitMatches('사과 주스'.normalize('NFD'), '사과')).toEqual([
      { text: '사과', match: true },
      { text: ' 주스', match: false },
    ]);
  });
});

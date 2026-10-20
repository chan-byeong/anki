interface Searchable {
  front: string;
  back: string;
  memo: string | null;
}

// 조합형·완성형 한글과 대소문자를 같게 본다.
export const normalizeQuery = (value: string): string => value.normalize('NFC').toLowerCase();

// 앞면·뒷면·메모 중 하나에 검색어가 들어 있는 카드만, 받은 순서 그대로 돌려준다.
// 앞뒤 공백은 무시하고, 비었으면 전부 돌려준다.
export function searchCards<T extends Searchable>(cards: readonly T[], query: string): T[] {
  const needle = normalizeQuery(query.trim());
  if (needle === '') return [...cards];
  return cards.filter((card) =>
    [card.front, card.back, card.memo ?? ''].some((field) =>
      normalizeQuery(field).includes(needle),
    ),
  );
}

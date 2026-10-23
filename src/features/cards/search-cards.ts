interface Searchable {
  front: string;
  back: string;
  hint: string | null;
  memo: string | null;
}

// 조합형·완성형 한글과 대소문자를 같게 본다.
const normalizeQuery = (value: string): string => value.normalize('NFC').toLowerCase();

// 앞면·뒷면·힌트·메모 중 하나에 검색어가 들어 있는 카드만, 받은 순서 그대로 돌려준다.
// 앞뒤 공백은 무시하고, 비었으면 전부 돌려준다.
export function searchCards<T extends Searchable>(cards: readonly T[], query: string): T[] {
  const needle = normalizeQuery(query.trim());
  if (needle === '') return [...cards];
  return cards.filter((card) =>
    [card.front, card.back, card.hint ?? '', card.memo ?? ''].some((field) =>
      normalizeQuery(field).includes(needle),
    ),
  );
}

export interface TextPart {
  text: string;
  match: boolean;
}

// 검색어와 일치하는 부분을 표시할 수 있게 글자를 나눈다. 일치 기준은 searchCards와 같다.
// 글자는 완성형(NFC)으로 돌려준다. 소문자로 바꾸면 길이가 달라지는 글자(İ 등)가 있으면 나누지 않는다.
export function splitMatches(value: string, query: string): TextPart[] {
  const text = value.normalize('NFC');
  const needle = normalizeQuery(query.trim());
  const lower = text.toLowerCase();
  if (needle === '' || lower.length !== text.length) return [{ text, match: false }];
  const parts: TextPart[] = [];
  let from = 0;
  for (let at = lower.indexOf(needle); at !== -1; at = lower.indexOf(needle, from)) {
    if (at > from) parts.push({ text: text.slice(from, at), match: false });
    from = at + needle.length;
    parts.push({ text: text.slice(at, from), match: true });
  }
  if (from < text.length || parts.length === 0)
    parts.push({ text: text.slice(from), match: false });
  return parts;
}

// 복습 경로(/review/[deckId])의 deckId는 선택한 덱 ID를 쉼표로 이은 값이다. 덱 하나면 그 ID 그대로다.
export const joinDeckIds = (deckIds: string[]): string => deckIds.join(',');

export const parseDeckIds = (param: string): string[] => [
  ...new Set(param.split(',').filter((id) => id !== '')),
];

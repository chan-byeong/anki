// 개수를 세 자리마다 쉼표로 끊어 적는다(1233 → "1,233"). 로케일 API에 기대지 않는다.
export const formatCount = (count: number): string =>
  String(count).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

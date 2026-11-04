// 밀어서 휴지통(한장 인터랙션 명세 · 덱 상세): 카드 행을 왼쪽으로 민다.
// 76px(버튼 72 + 행과의 간격 4) 넘기면 휴지통 버튼이 열린 채 멈추고, 행 너비의 60%를 넘겨 놓으면 바로 휴지통으로 간다.
export const TRASH_OPEN_WIDTH = 76;
export const TRASH_COMMIT_RATIO = 0.6;

// 민 정도가 어느 구간인지. 구간이 바뀔 때 햅틱이 울리고, 손을 떼면 구간대로 정해진다.
export type TrashSwipeZone = 'close' | 'open' | 'commit';

// offset은 왼쪽으로 밀수록 작아지는 음수다.
// 제스처(UI 스레드)에서 바로 부르므로 worklet으로 표시한다. 표시하지 않으면 부르는 순간 던지고 앱이 종료된다.
export const trashSwipeZone = (offset: number, rowWidth: number): TrashSwipeZone => {
  'worklet';
  const pulled = -offset;
  if (rowWidth > 0 && pulled > rowWidth * TRASH_COMMIT_RATIO) return 'commit';
  return pulled >= TRASH_OPEN_WIDTH ? 'open' : 'close';
};

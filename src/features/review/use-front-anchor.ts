import { useState } from 'react';
import type { LayoutChangeEvent } from 'react-native';

interface FrontAnchor {
  onViewportLayout: (event: LayoutChangeEvent) => void;
  onFrontLayout: (event: LayoutChangeEvent) => void;
  // 잰 뒤 앞면 위에 둘 여백. 재기 전에는 null이고, 그동안은 가운데 정렬로 같은 자리에 둔다.
  offset: number | null;
}

// 앞면을 카드 가운데에 두되, 정답이 열리거나 패널 여백이 늘어도 그 자리에 고정한다(STA-152).
// 가운데 정렬은 내용이 늘 때마다 다시 계산돼 앞면이 위로 밀리므로, 첫 배치에서 잰 자리를 여백으로 굳힌다.
// inset은 스크롤 영역의 위아래 기본 여백 합이다. 가운데는 그 여백을 뺀 높이에서 잡는다.
export function useFrontAnchor(inset: number): FrontAnchor {
  const [viewport, setViewport] = useState<number | null>(null);
  const [front, setFront] = useState<number | null>(null);

  const offset =
    viewport === null || front === null ? null : Math.max(0, (viewport - inset - front) / 2);

  return {
    onViewportLayout: (event) => setViewport(event.nativeEvent.layout.height),
    onFrontLayout: (event) => setFront(event.nativeEvent.layout.height),
    offset,
  };
}

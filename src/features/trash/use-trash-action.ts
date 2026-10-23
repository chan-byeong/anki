import { useRef, useState } from 'react';

// 휴지통으로 보내는 동작(카드 삭제, 덱 삭제)의 공통 틀. 두 번 눌러도 한 번만 보낸다.
// 두 번째는 이미 지워진 항목이라 거부되어 오류가 뜨기 때문이다. 실패하면 failed를 켜고 다시 누를 수 있게 한다.
export function useTrashAction(
  run: () => Promise<void>,
  onDone: () => void,
): { trash: () => Promise<void>; failed: boolean } {
  const trashing = useRef(false);
  const [failed, setFailed] = useState(false);

  const trash = async () => {
    if (trashing.current) return;
    trashing.current = true;
    setFailed(false);
    try {
      await run();
      onDone();
    } catch {
      setFailed(true);
      trashing.current = false;
    }
  };

  return { trash, failed };
}

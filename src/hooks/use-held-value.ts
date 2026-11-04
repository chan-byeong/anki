import { useState } from 'react';

// 값이 null이 되어도 마지막 값을 쥐고 있는다. Collapsible이 접히는 동안 사라진 내용(오류 문구 등)을 그대로 그리게 한다.
export const useHeldValue = <T>(value: T | null): T | null => {
  const [held, setHeld] = useState(value);
  if (value !== null && value !== held) setHeld(value);
  return held;
};

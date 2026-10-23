import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { useStore } from '@/storage/StoreProvider';

// 설정의 "휴지통 N". 화면에 들어올 때마다 다시 센다. 읽기 전이나 실패하면 undefined라서 숫자를 숨긴다.
export function useTrashCount(): number | undefined {
  const store = useStore();
  const [count, setCount] = useState<number | undefined>(undefined);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      store.countTrash().then(
        (value) => {
          if (active) setCount(value);
        },
        () => {},
      );
      return () => {
        active = false;
      };
    }, [store]),
  );

  return count;
}

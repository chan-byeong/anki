import Storage from 'expo-sqlite/kv-store';
import { useEffect, useState } from 'react';

import { createLongPressGuide } from './long-press-guide';

const guide = createLongPressGuide(Storage);

// 덱 목록에 들어올 때 안내를 보일지 정한다. enabled가 되면(보여 줄 만한 목록이 생기면) 한 번 센다.
export function useLongPressGuide(enabled: boolean): { visible: boolean; dismiss: () => void } {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    guide.visit().then((show) => {
      if (active) setVisible(show);
    });
    return () => {
      active = false;
    };
  }, [enabled]);

  const dismiss = () => {
    setVisible(false);
    void guide.dismiss();
  };

  return { visible, dismiss };
}

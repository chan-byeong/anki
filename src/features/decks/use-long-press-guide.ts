import { useEffect, useRef, useState } from 'react';

import { kvStore } from '@/storage/kv-store';

import { createLongPressGuide } from './long-press-guide';

const guide = createLongPressGuide(kvStore);

// 덱 목록에 들어올 때 안내를 보일지 정한다. enabled가 되면(보여 줄 만한 목록이 생기면) 화면당 한 번만 센다.
// 목록을 다시 읽어 enabled가 오르내려도 다시 세지 않는다.
export function useLongPressGuide(enabled: boolean): { visible: boolean; dismiss: () => void } {
  const [visible, setVisible] = useState(false);
  const counted = useRef(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!enabled || counted.current) return;
    counted.current = true;
    guide.visit().then((show) => {
      if (mounted.current) setVisible(show);
    });
  }, [enabled]);

  const dismiss = () => {
    setVisible(false);
    void guide.dismiss();
  };

  return { visible, dismiss };
}

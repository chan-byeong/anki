import { useEffect, useEffectEvent, useState } from 'react';

import { slow } from '@/theme/tokens';

export const useDelayedPending = (pending: boolean): boolean => {
  const [shownAt, setShownAt] = useState<null | number>(null);

  const readShownAt = useEffectEvent(() => shownAt);

  useEffect(() => {
    const shown = readShownAt();
    if (pending === false) {
      if (shown === null) return;

      const remaining = slow.min - (performance.now() - shown);

      const timeoutId = setTimeout(
        () => {
          setShownAt(null);
        },
        Math.max(remaining, 0),
      );

      return () => clearTimeout(timeoutId);
    }

    if (shown !== null) return;

    const timeoutId = setTimeout(() => {
      setShownAt(performance.now());
    }, slow.after);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [pending]);

  return shownAt !== null;
};

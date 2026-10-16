import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

export const useReducedMotion = (): boolean => {
  const [isReduced, setIsReduced] = useState(false);

  useEffect(() => {
    let disposed = false;
    let receivedChange = false;

    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (!disposed && !receivedChange) setIsReduced(enabled);
      })
      .catch(() => {
        // 조회 실패 시 현재 값 유지
      });

    const handleReduceMotion = (enabled: boolean) => {
      receivedChange = true;
      setIsReduced(enabled);
    };
    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      handleReduceMotion,
    );

    return () => {
      disposed = true;
      subscription?.remove();
    };
  }, []);

  return isReduced;
};

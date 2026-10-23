import { Paths } from 'expo-file-system';
import { useState } from 'react';
import { Platform } from 'react-native';

import { isLowSpace } from './storage-status';

// 남은 용량은 화면에 들어올 때 한 번 읽는다. 웹에는 읽을 방법이 없어 경고하지 않는다.
export function useLowSpace(): boolean {
  const [low] = useState(() => {
    if (Platform.OS === 'web') return false;
    try {
      return isLowSpace(Paths.availableDiskSpace);
    } catch {
      return false;
    }
  });
  return low;
}

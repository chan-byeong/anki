import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

import { languageName } from '@/features/decks/languages';
import { toastHold } from '@/theme/tokens';

// 복습 중 발음 안내 토스트(STA-128, 캔버스 State-5).
// 한 번의 복습에서 같은 안내를 되풀이하지 않는다: 같은 언어의 음성 없음은 한 번, 무음 모드 안내도 한 번.
// 안내 문구에는 설정 메뉴 이름을 적지 않는다(기기·OS 버전마다 이름이 다르다).

export type VoiceNotice = { message: string; sub?: string };

export function useVoiceNotice(): {
  notice: VoiceNotice | null;
  voiceMissing: (language: string) => void;
  spoke: () => void;
} {
  const [notice, setNotice] = useState<VoiceNotice | null>(null);
  const missingShown = useRef(new Set<string>());
  const silentShown = useRef(false);

  useEffect(() => {
    if (notice === null) return;
    const timer = setTimeout(
      () => setNotice(null),
      notice.sub ? toastHold.withSub : toastHold.plain,
    );
    return () => clearTimeout(timer);
  }, [notice]);

  const voiceMissing = useCallback((language: string) => {
    if (missingShown.current.has(language)) return;
    missingShown.current.add(language);
    setNotice({
      message: `이 기기에 ${languageName(language)} 음성이 없어요`,
      sub: '기기 설정에서 음성을 받으면 바로 들을 수 있어요.',
    });
  }, []);

  // iOS는 무음 모드에서 읽기 소리가 나지 않는다. 무음인지는 알 수 없어서 처음 누를 때 한 번만 알린다.
  const spoke = useCallback(() => {
    if (Platform.OS !== 'ios' || silentShown.current) return;
    silentShown.current = true;
    setNotice({ message: '무음 모드에서는 발음이 들리지 않을 수 있어요' });
  }, []);

  return { notice, voiceMissing, spoke };
}

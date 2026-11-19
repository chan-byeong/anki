import { useEffect, useState } from 'react';

import { speech } from '@/utils/speech';

export type VoiceStatus = 'checking' | 'available' | 'missing';

// 기기에 그 언어의 음성이 있는가(STA-128). 언어가 없거나 아직 확인 중이면 checking이다.
// 확인 중에는 버튼을 켜 둔다. 눌렀을 때 읽기 쪽에서 한 번 더 확인하므로 음성이 없으면 읽지 않는다.
export function useVoiceStatus(language: string | null): VoiceStatus {
  const [result, setResult] = useState<{ language: string; available: boolean } | null>(null);

  useEffect(() => {
    if (language === null) return;
    let active = true;
    void speech.hasVoice(language).then((available) => {
      if (active) setResult({ language, available });
    });
    return () => {
      active = false;
    };
  }, [language]);

  if (language === null || result?.language !== language) return 'checking';
  return result.available ? 'available' : 'missing';
}

import * as Speech from 'expo-speech';

import { hasVoice } from './has-voice';

// 기기 내장 TTS(STA-127, STA-128). 화면은 읽을 글자와 언어만 넘기고, 어떻게 읽는지는 여기서만 안다.
// 읽기는 부가 기능이라서 실패(미지원 기기, 음성 없음)가 복습을 막으면 안 된다. 던지지도, 거부된 약속을 남기지도 않는다.
// 기기에 그 언어 음성이 없으면 읽지 않는다. 언어만 지정하면 기기 기본 음성이 대신 읽어 엉뚱한 소리가 나기 때문이다.

// 음성 목록을 기다리는 사이에 카드가 넘어가거나 다시 눌렀을 때, 늦게 온 요청이 소리를 내지 않게 한다.
let latestRequest = 0;

const stopSpeaking = (): void => {
  try {
    Speech.stop().catch(() => {});
  } catch {
    // 소리가 안 나는 것으로 충분하다.
  }
};

/** 음성 목록을 읽지 못하면 있는지 알 수 없으므로 있다고 본다(읽기를 막지 않는다). */
const deviceHasVoice = async (language: string): Promise<boolean> => {
  try {
    return hasVoice(await Speech.getAvailableVoicesAsync(), language);
  } catch {
    return true;
  }
};

export const speech = {
  hasVoice: deviceHasVoice,
  /** 읽던 소리가 있으면 끊고 처음부터 읽는다. 연달아 눌러도 소리가 줄줄이 쌓이지 않는다. */
  speak: (text: string, language: string): void => {
    latestRequest += 1;
    const request = latestRequest;
    stopSpeaking();
    void (async () => {
      if (!(await deviceHasVoice(language)) || request !== latestRequest) return;
      try {
        Speech.speak(text, { language });
      } catch {
        // 위와 같다.
      }
    })();
  },
  stop: (): void => {
    latestRequest += 1;
    stopSpeaking();
  },
};

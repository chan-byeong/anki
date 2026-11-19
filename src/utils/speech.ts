import * as Speech from 'expo-speech';

import { pickVoice } from './pick-voice';

// 기기 내장 TTS(STA-127). 화면은 읽을 글자와 언어만 넘기고, 어떻게 읽는지는 여기서만 안다.
// 읽기는 부가 기능이라서 실패(미지원 기기, 음성 없음)가 복습을 막으면 안 된다. 던지지도, 거부된 약속을 남기지도 않는다.
// 기기에 그 언어 음성이 없으면 읽지 않는다. 다른 언어 음성으로 대신 읽지 않는다. 이유를 알리는 일은 STA-128이 맡는다.

// 음성 목록을 기다리는 사이에 카드가 넘어가거나 다시 눌렀을 때, 늦게 온 요청이 소리를 내지 않게 한다.
let latest = 0;

const stopSpeaking = (): void => {
  try {
    Speech.stop().catch(() => {});
  } catch {
    // 소리가 안 나는 것으로 충분하다.
  }
};

export const speech = {
  /** 읽던 소리가 있으면 끊고 처음부터 읽는다. 연달아 눌러도 소리가 줄줄이 쌓이지 않는다. */
  speak: (text: string, language: string): void => {
    latest += 1;
    const request = latest;
    stopSpeaking();
    void (async () => {
      try {
        const voice = pickVoice(await Speech.getAvailableVoicesAsync(), language);
        if (voice === null || request !== latest) return;
        Speech.speak(text, { voice: voice.identifier, language: voice.language });
      } catch {
        // 위와 같다.
      }
    })();
  },
  stop: (): void => {
    latest += 1;
    stopSpeaking();
  },
};

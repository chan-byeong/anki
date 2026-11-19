import * as Speech from 'expo-speech';

// 기기 내장 TTS(STA-127). 화면은 읽을 글자와 언어만 넘기고, 어떻게 읽는지는 여기서만 안다.
// 읽기는 부가 기능이라서 실패(미지원 기기, 음성 없음)가 복습을 막으면 안 된다. 던지지도, 거부된 약속을 남기지도 않는다.
// 읽을 수 있는 음성이 기기에 있는지 확인하는 일은 STA-128이 맡는다.

export const speech = {
  /** 읽던 소리가 있으면 끊고 처음부터 읽는다. 연달아 눌러도 소리가 줄줄이 쌓이지 않는다. */
  speak: (text: string, language: string): void => {
    try {
      // stop은 약속을 돌려준다. 끝나길 기다리지 않아도 speak는 큐 앞의 소리를 끊은 뒤에 시작한다.
      Speech.stop().catch(() => {});
      Speech.speak(text, { language });
    } catch {
      // 소리가 안 나는 것으로 충분하다.
    }
  },
  stop: (): void => {
    try {
      Speech.stop().catch(() => {});
    } catch {
      // 위와 같다.
    }
  },
};

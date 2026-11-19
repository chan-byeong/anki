// 기기에 그 언어의 음성이 있는지 가른다(STA-128).
// 'ja'와 'ja-JP'처럼 지역이 있든 없든 언어가 같으면 같은 언어다. 다른 언어 음성으로 대신하지 않는다.

// 'ja_JP', 'JA-jp' 같은 표기 차이를 없애고 언어 부분(ja)만 뽑는다.
const languageOf = (code: string): string =>
  code.replace('_', '-').toLowerCase().split('-')[0] ?? '';

export const hasVoice = (voices: readonly { language: string }[], language: string): boolean =>
  voices.some((voice) => languageOf(voice.language) === languageOf(language));

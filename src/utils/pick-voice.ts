// 덱의 발음 언어로 읽을 기기 음성을 고른다(STA-127).
// iOS는 'ja'처럼 지역 없는 코드를 언어로 주면 음성을 못 찾고 기본 음성으로 대신하는 일이 있다.
// 그러면 일본어 글을 한국어·영어 음성이 읽어 소리가 안 나거나 엉뚱하다. 그래서 기기의 음성 목록에서 직접 고른다.

export type VoiceInfo = { identifier: string; language: string; quality: 'Default' | 'Enhanced' };

// 'ja_JP', 'JA-jp' 같은 표기 차이를 없애 'ja-jp'로 맞춘다.
const normalize = (language: string): string => language.replace('_', '-').toLowerCase();
const primary = (language: string): string => normalize(language).split('-')[0] ?? '';

const better = (a: VoiceInfo, b: VoiceInfo): VoiceInfo =>
  b.quality === 'Enhanced' && a.quality !== 'Enhanced' ? b : a;

const best = (voices: VoiceInfo[]): VoiceInfo | null =>
  voices.length === 0 ? null : voices.reduce(better);

/**
 * 같은 지역 음성을 먼저, 없으면 같은 언어의 다른 지역 음성을 고른다. 둘 다 고품질을 앞세운다.
 * 그 언어 음성이 없으면 null이다. 다른 언어 음성으로 대신 읽지 않는다.
 */
export function pickVoice(voices: VoiceInfo[], language: string): VoiceInfo | null {
  const wanted = normalize(language);
  const exact = best(voices.filter((voice) => normalize(voice.language) === wanted));
  if (exact !== null) return exact;
  return best(voices.filter((voice) => primary(voice.language) === primary(language)));
}

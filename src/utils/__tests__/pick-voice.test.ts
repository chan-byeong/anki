import { pickVoice, type VoiceInfo } from '../pick-voice';

const voice = (
  identifier: string,
  language: string,
  quality: VoiceInfo['quality'] = 'Default',
): VoiceInfo => ({ identifier, language, quality });

describe('pickVoice: 덱의 발음 언어로 읽을 기기 음성 고르기', () => {
  const voices = [
    voice('en-us', 'en-US'),
    voice('ko-kr', 'ko-KR'),
    voice('ja-jp', 'ja-JP'),
    voice('fr-fr', 'fr-FR'),
  ];

  test('지역 없는 언어 코드로 그 언어의 음성을 찾는다', () => {
    expect(pickVoice(voices, 'ja')?.identifier).toBe('ja-jp');
    expect(pickVoice(voices, 'en')?.identifier).toBe('en-us');
    expect(pickVoice(voices, 'ko')?.identifier).toBe('ko-kr');
  });

  test('지역까지 적은 코드는 그 지역 음성을 먼저 고른다', () => {
    const list = [voice('en-gb', 'en-GB'), voice('en-us', 'en-US')];

    expect(pickVoice(list, 'en-US')?.identifier).toBe('en-us');
    expect(pickVoice(list, 'en-GB')?.identifier).toBe('en-gb');
  });

  test('그 지역 음성이 없으면 같은 언어의 다른 지역 음성을 고른다', () => {
    expect(pickVoice([voice('en-gb', 'en-GB')], 'en-US')?.identifier).toBe('en-gb');
  });

  test('밑줄로 적은 언어 코드(ja_JP)와 대소문자 차이를 같은 코드로 본다', () => {
    expect(pickVoice([voice('a', 'ja_JP')], 'ja')?.identifier).toBe('a');
    expect(pickVoice([voice('a', 'JA-jp')], 'ja-JP')?.identifier).toBe('a');
  });

  test('같은 언어 음성이 여럿이면 고품질(Enhanced) 음성을 먼저 고른다', () => {
    const list = [voice('basic', 'ja-JP'), voice('enhanced', 'ja-JP', 'Enhanced')];

    expect(pickVoice(list, 'ja')?.identifier).toBe('enhanced');
  });

  test('그 언어 음성이 없으면 다른 언어로 대신하지 않고 null이다', () => {
    expect(pickVoice([voice('en-us', 'en-US'), voice('ko-kr', 'ko-KR')], 'ja')).toBeNull();
  });

  test('앞부분만 같은 다른 언어 코드는 같은 언어로 보지 않는다', () => {
    expect(pickVoice([voice('jv', 'jv-ID')], 'ja')).toBeNull();
    expect(pickVoice([voice('jam', 'jam-JM')], 'ja')).toBeNull();
  });

  test('음성 목록이 비어 있으면 null이다', () => {
    expect(pickVoice([], 'ja')).toBeNull();
  });
});

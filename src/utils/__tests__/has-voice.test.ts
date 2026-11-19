import { hasVoice } from '../has-voice';

const voices = (...languages: string[]) => languages.map((language) => ({ language }));

describe('hasVoice: 기기에 그 언어의 음성이 있는가', () => {
  test('지역 없는 언어 코드는 그 언어의 어느 지역 음성이든 있으면 있다', () => {
    expect(hasVoice(voices('en-US', 'ko-KR', 'ja-JP'), 'ja')).toBe(true);
    expect(hasVoice(voices('en-GB'), 'en')).toBe(true);
  });

  test('요청한 지역의 음성이 없어도 같은 언어의 다른 지역 음성이 있으면 있다', () => {
    expect(hasVoice(voices('en-GB'), 'en-US')).toBe(true);
  });

  test('대소문자와 밑줄 표기(ja_JP) 차이는 같은 코드로 본다', () => {
    expect(hasVoice(voices('ja_JP'), 'ja')).toBe(true);
    expect(hasVoice(voices('JA-jp'), 'ja-JP')).toBe(true);
  });

  test('그 언어 음성이 없으면, 다른 언어 음성이 있어도 없다(다른 언어로 대신 읽지 않는다)', () => {
    expect(hasVoice(voices('en-US', 'ko-KR'), 'ja')).toBe(false);
  });

  test('앞부분만 같은 다른 언어 코드는 같은 언어가 아니다', () => {
    expect(hasVoice(voices('jv-ID', 'jam-JM'), 'ja')).toBe(false);
  });

  test('음성 목록이 비어 있으면 없다', () => {
    expect(hasVoice([], 'ja')).toBe(false);
  });
});

import { isJapanese, pronunciationTarget } from '../pronunciation-target';

describe('pronunciationTarget: 발음 버튼이 읽을 글자와 언어', () => {
  test('덱의 발음 언어가 있으면 앞면을 그 언어로 읽는다', () => {
    expect(pronunciationTarget({ front: '食べる' }, 'ja')).toEqual({
      text: '食べる',
      language: 'ja',
    });
  });

  test('읽을 글자는 앞면이다(뒷면은 읽지 않는다)', () => {
    expect(pronunciationTarget({ front: 'apple' }, 'en')?.text).toBe('apple');
  });

  test('앞면이 공백뿐이면 읽을 대상이 없다', () => {
    expect(pronunciationTarget({ front: '  ' }, 'en')).toBeNull();
  });

  test('발음 언어가 없는 덱에서는 읽을 대상이 없다(버튼이 나타나지 않는다)', () => {
    expect(pronunciationTarget({ front: 'apple' }, null)).toBeNull();
  });

  test('덱에 저장된 언어 값은 그대로 넘긴다', () => {
    expect(pronunciationTarget({ front: 'Bonjour' }, 'fr-FR')?.language).toBe('fr-FR');
  });
});

describe('isJapanese', () => {
  test.each([
    ['ja', true],
    ['ja-JP', true],
    ['en', false],
    ['jam', false],
    [null, false],
  ] as const)('%s → %s', (language, expected) => {
    expect(isJapanese(language)).toBe(expected);
  });
});

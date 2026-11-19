import { readImportFile } from '../read-import-file';

const utf8 = (text: string): Uint8Array => new TextEncoder().encode(text);

describe('readImportFile: 줄을 카드로 읽기', () => {
  test('한 줄이 카드 한 장이고 칸은 앞면, 뒷면, 메모, 힌트 순서다', () => {
    const result = readImportFile(
      utf8('食べる\t먹다\t朝ごはんを食べる。\t た로 시작\n飲む\t마시다'),
      [],
    );

    expect(result).toEqual({
      ok: true,
      cards: [
        { line: 1, front: '食べる', back: '먹다', memo: '朝ごはんを食べる。', hint: 'た로 시작' },
        { line: 2, front: '飲む', back: '마시다', memo: null, hint: null },
      ],
      skipped: [],
    });
  });

  test('메모 없이 힌트만 넣을 때는 탭을 연달아 쓴다', () => {
    const result = readImportFile(utf8('apple\t사과\t\tfruit'), []);

    expect(result).toMatchObject({
      ok: true,
      cards: [{ front: 'apple', back: '사과', memo: null, hint: 'fruit' }],
    });
  });

  test('다섯째 칸부터는 읽지 않는다', () => {
    const result = readImportFile(utf8('apple\t사과\t과일\t빨강\t버려지는 칸'), []);

    expect(result).toMatchObject({
      ok: true,
      cards: [{ front: 'apple', back: '사과', memo: '과일', hint: '빨강' }],
    });
  });

  test('각 칸의 앞뒤 공백은 지운다', () => {
    const result = readImportFile(utf8('  apple \t 사과  \t  과일 '), []);

    expect(result).toMatchObject({
      ok: true,
      cards: [{ front: 'apple', back: '사과', memo: '과일', hint: null }],
    });
  });

  test('LF와 CRLF 줄바꿈을 모두 읽고 끝의 줄바꿈은 줄로 세지 않는다', () => {
    const result = readImportFile(utf8('apple\t사과\r\npear\t배\r\n'), []);

    expect(result).toMatchObject({
      ok: true,
      cards: [
        { line: 1, front: 'apple', back: '사과' },
        { line: 2, front: 'pear', back: '배' },
      ],
      skipped: [],
    });
  });

  test('빈 줄과 #으로 시작하는 줄은 조용히 무시하고, 줄 번호는 파일 그대로 센다', () => {
    const result = readImportFile(
      utf8('# 3주차 단어\n\napple\t사과\n   \n#pear\t배\nplum\t자두'),
      [],
    );

    expect(result).toEqual({
      ok: true,
      cards: [
        { line: 3, front: 'apple', back: '사과', memo: null, hint: null },
        { line: 6, front: 'plum', back: '자두', memo: null, hint: null },
      ],
      skipped: [],
    });
  });

  test('빈 파일은 카드 없이 읽힌다', () => {
    expect(readImportFile(utf8(''), [])).toEqual({ ok: true, cards: [], skipped: [] });
  });
});

describe('readImportFile: 건너뛰는 줄', () => {
  test('뒷면이 없는 줄은 줄 번호와 함께 건너뛰고 나머지 카드는 읽는다', () => {
    const result = readImportFile(utf8('apple\t사과\npear\npear2\t  \nplum\t자두'), []);

    expect(result).toEqual({
      ok: true,
      cards: [
        { line: 1, front: 'apple', back: '사과', memo: null, hint: null },
        { line: 4, front: 'plum', back: '자두', memo: null, hint: null },
      ],
      skipped: [
        { line: 2, reason: 'missing-back' },
        { line: 3, reason: 'missing-back' },
      ],
    });
  });

  test('앞면이 비어 있는 줄은 앞면 없음으로 건너뛴다', () => {
    const result = readImportFile(utf8('\t사과\n  \t배\t메모'), []);

    expect(result).toEqual({
      ok: true,
      cards: [],
      skipped: [
        { line: 1, reason: 'missing-front' },
        { line: 2, reason: 'missing-front' },
      ],
    });
  });

  test('덱에 같은 앞면이 있으면 건너뛴다', () => {
    const result = readImportFile(utf8('apple\t사과\npear\t배'), ['apple']);

    expect(result).toMatchObject({
      cards: [{ front: 'pear' }],
      skipped: [{ line: 1, reason: 'duplicate-front' }],
    });
  });

  test('한 파일 안에서 앞면이 겹치면 먼저 나온 줄만 넣는다', () => {
    const result = readImportFile(utf8('apple\t사과\npear\t배\napple\t애플'), []);

    expect(result).toMatchObject({
      cards: [
        { line: 1, front: 'apple', back: '사과' },
        { line: 2, front: 'pear' },
      ],
      skipped: [{ line: 3, reason: 'duplicate-front' }],
    });
  });

  test('같은 앞면은 앞뒤 공백을 지우고 유니코드 NFC로 맞춰 비교하며 대소문자는 구분한다', () => {
    const decomposed = '가'.normalize('NFD');
    const result = readImportFile(
      utf8(`${decomposed}\t첫째\n가\t둘째\nApple\t대문자\napple\t소문자\n  pear  \t앞\n pear\t뒤`),
      [],
    );

    expect(result).toMatchObject({
      cards: [
        { line: 1, back: '첫째' },
        { line: 3, front: 'Apple' },
        { line: 4, front: 'apple' },
        { line: 5, front: 'pear' },
      ],
      skipped: [
        { line: 2, reason: 'duplicate-front' },
        { line: 6, reason: 'duplicate-front' },
      ],
    });
    // 비교에만 NFC를 쓴다. 저장할 앞면의 글자는 파일에 적힌 그대로다.
    expect(result.ok && result.cards[0]?.front).toBe(decomposed);
  });

  test('덱의 기존 앞면도 NFC로 맞춰 비교한다', () => {
    const result = readImportFile(utf8('가\t첫째'), ['가'.normalize('NFD')]);

    expect(result).toMatchObject({ cards: [], skipped: [{ line: 1, reason: 'duplicate-front' }] });
  });

  test('뒷면이 없는 줄은 앞면이 겹쳐도 뒷면 없음 사유로만 알린다', () => {
    const result = readImportFile(utf8('apple\napple\t사과'), ['apple']);

    expect(result).toMatchObject({
      skipped: [
        { line: 1, reason: 'missing-back' },
        { line: 2, reason: 'duplicate-front' },
      ],
    });
  });

  test('건너뛴 줄의 앞면은 뒤따르는 줄의 중복 판정에 쓰지 않는다', () => {
    const result = readImportFile(utf8('apple\napple\t사과'), []);

    expect(result).toMatchObject({ cards: [{ line: 2, front: 'apple' }], skipped: [{ line: 1 }] });
  });
});

describe('readImportFile: 글자 인코딩', () => {
  const bom = (...bytes: number[]) => Uint8Array.from(bytes);
  const concat = (...parts: Uint8Array[]) => Uint8Array.from(parts.flatMap((part) => [...part]));
  const utf16be = (text: string): Uint8Array => {
    const le = Buffer.from(text, 'utf16le');
    return Uint8Array.from(le.swap16());
  };
  const content = '食べる\t먹다\n#주석\napple\t🍎';
  const expected = {
    ok: true,
    cards: [
      { line: 1, front: '食べる', back: '먹다', memo: null, hint: null },
      { line: 3, front: 'apple', back: '🍎', memo: null, hint: null },
    ],
    skipped: [],
  };

  test('UTF-8은 BOM이 있어도 없어도 읽는다', () => {
    expect(readImportFile(utf8(content), [])).toEqual(expected);
    expect(readImportFile(concat(bom(0xef, 0xbb, 0xbf), utf8(content)), [])).toEqual(expected);
  });

  test('BOM이 있는 UTF-16 리틀·빅 엔디언을 읽는다(엑셀의 유니코드 텍스트)', () => {
    const le = concat(bom(0xff, 0xfe), Uint8Array.from(Buffer.from(content, 'utf16le')));
    const be = concat(bom(0xfe, 0xff), utf16be(content));

    expect(readImportFile(le, [])).toEqual(expected);
    expect(readImportFile(be, [])).toEqual(expected);
  });

  test('UTF-16 파일의 CRLF 줄바꿈도 읽는다', () => {
    const bytes = concat(
      bom(0xff, 0xfe),
      Uint8Array.from(Buffer.from('apple\t사과\r\npear\t배\r\n', 'utf16le')),
    );

    expect(readImportFile(bytes, [])).toMatchObject({
      cards: [{ front: 'apple' }, { front: 'pear' }],
    });
  });

  test('UTF-8이 아닌 바이트(한국어 Windows의 ANSI/CP949)는 읽을 수 없는 파일이다', () => {
    // CP949로 저장한 "가\t나"
    const cp949 = bom(0xb0, 0xa1, 0x09, 0xb3, 0xaa);

    expect(readImportFile(cp949, [])).toEqual({ ok: false, failure: 'unreadable-encoding' });
  });

  test('BOM 없는 UTF-16과 쌍이 맞지 않는 UTF-16도 읽을 수 없는 파일이다', () => {
    const noBom = Uint8Array.from(Buffer.from('apple\t사과', 'utf16le'));
    const loneSurrogate = concat(bom(0xff, 0xfe), bom(0x00, 0xd8, 0x61, 0x00));
    const oddLength = concat(bom(0xff, 0xfe), bom(0x61));

    expect(readImportFile(noBom, [])).toEqual({ ok: false, failure: 'unreadable-encoding' });
    expect(readImportFile(loneSurrogate, [])).toEqual({
      ok: false,
      failure: 'unreadable-encoding',
    });
    expect(readImportFile(oddLength, [])).toEqual({ ok: false, failure: 'unreadable-encoding' });
  });
});

describe('readImportFile: 한도', () => {
  test('2 MB를 넘는 파일은 읽지 않는다', () => {
    const tooLarge = new Uint8Array(2 * 1024 * 1024 + 1);

    expect(readImportFile(tooLarge, [])).toEqual({ ok: false, failure: 'too-large' });
  });

  test('줄이 5,000을 넘으면 읽지 않고, 5,000줄까지는 읽는다', () => {
    const rows = (count: number) =>
      Array.from({ length: count }, (_, i) => `앞${i}\t뒤${i}`).join('\n');

    expect(readImportFile(utf8(rows(5001)), [])).toEqual({ ok: false, failure: 'too-many-lines' });
    const atLimit = readImportFile(utf8(`${rows(5000)}\n`), []);
    expect(atLimit.ok && atLimit.cards).toHaveLength(5000);
  });

  test('빈 줄과 주석 줄도 줄 수에 센다', () => {
    const bytes = utf8(`${'#\n'.repeat(5000)}apple\t사과`);

    expect(readImportFile(bytes, [])).toEqual({ ok: false, failure: 'too-many-lines' });
  });
});

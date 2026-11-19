// 가져오기 파일의 글자 인코딩을 푼다. Hermes에는 TextDecoder가 있다는 보장이 없어서 직접 푼다.
// UTF-8(BOM 있든 없든)과 BOM이 있는 UTF-16(LE·BE)만 읽는다. 그 밖의 바이트(CP949 등)는 null이다.

const CHUNK = 4096;

const joinChunks = (units: number[], fromCodes: (codes: number[]) => string): string => {
  let text = '';
  for (let start = 0; start < units.length; start += CHUNK) {
    text += fromCodes(units.slice(start, start + CHUNK));
  }
  return text;
};

const fromCodePoints = (codePoints: number[]): string =>
  joinChunks(codePoints, (codes) => String.fromCodePoint(...codes));
const fromCodeUnits = (units: number[]): string =>
  joinChunks(units, (codes) => String.fromCharCode(...codes));

// 이어지는 바이트 수와 그 길이에서 허용하는 가장 작은 값(긴 형태로 쓴 값을 거부한다).
const sequenceShape = (lead: number): { extra: number; min: number; bits: number } | null => {
  if (lead >= 0xc2 && lead <= 0xdf) return { extra: 1, min: 0x80, bits: lead & 0x1f };
  if (lead >= 0xe0 && lead <= 0xef) return { extra: 2, min: 0x800, bits: lead & 0x0f };
  if (lead >= 0xf0 && lead <= 0xf4) return { extra: 3, min: 0x10000, bits: lead & 0x07 };
  return null;
};

const isSurrogate = (codePoint: number): boolean => codePoint >= 0xd800 && codePoint <= 0xdfff;

function decodeUtf8(bytes: Uint8Array): string | null {
  const codePoints: number[] = [];
  let index = 0;
  while (index < bytes.length) {
    const lead = bytes[index++]!;
    // 0은 BOM 없는 UTF-16을 UTF-8로 잘못 읽은 것이다. 텍스트 파일에는 나오지 않는다.
    if (lead === 0) return null;
    if (lead < 0x80) {
      codePoints.push(lead);
      continue;
    }
    const shape = sequenceShape(lead);
    if (shape === null || index + shape.extra > bytes.length) return null;
    let codePoint = shape.bits;
    for (let i = 0; i < shape.extra; i++) {
      const next = bytes[index++]!;
      if ((next & 0xc0) !== 0x80) return null;
      codePoint = (codePoint << 6) | (next & 0x3f);
    }
    if (codePoint < shape.min || codePoint > 0x10ffff || isSurrogate(codePoint)) return null;
    codePoints.push(codePoint);
  }
  return fromCodePoints(codePoints);
}

function decodeUtf16(bytes: Uint8Array, littleEndian: boolean): string | null {
  if (bytes.length % 2 !== 0) return null;
  const units: number[] = [];
  for (let i = 0; i < bytes.length; i += 2) {
    const [a, b] = [bytes[i]!, bytes[i + 1]!];
    units.push(littleEndian ? a | (b << 8) : (a << 8) | b);
  }
  for (let i = 0; i < units.length; i++) {
    const unit = units[i]!;
    if (unit >= 0xd800 && unit <= 0xdbff) {
      const low = units[i + 1];
      if (low === undefined || low < 0xdc00 || low > 0xdfff) return null;
      i++;
    } else if (unit >= 0xdc00 && unit <= 0xdfff) {
      return null;
    }
  }
  return fromCodeUnits(units);
}

/** 읽을 수 없는 인코딩이면 null. 앞의 BOM은 떼고 돌려준다. */
export function decodeText(bytes: Uint8Array): string | null {
  const [first, second, third] = bytes;
  if (first === 0xff && second === 0xfe) return decodeUtf16(bytes.subarray(2), true);
  if (first === 0xfe && second === 0xff) return decodeUtf16(bytes.subarray(2), false);
  if (first === 0xef && second === 0xbb && third === 0xbf) return decodeUtf8(bytes.subarray(3));
  return decodeUtf8(bytes);
}

import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

// CONTEXT.md에서 피하라고 한 말이 화면 문구에 들어오지 않게 막는다(STA-141).
// 메모·힌트는 서로를 피하라는 뜻이라 따로 쓰면 맞는 말이고, '문제'는 카드를 부르는 말로만 피해서 넣지 않는다
// (State-6의 "문제가 생겼어요"는 캔버스 문구다).
const AVOIDED = [
  '노트',
  '질문면',
  '답면',
  '단서',
  '폴더',
  '컬렉션',
  '점수',
  '난이도',
  '어려움',
  '예정일',
  '마감일',
  '세션',
  '반복',
  '재시도',
  '완전 삭제',
  '사용자',
  '프로필',
  '게스트 계정',
  '익명 계정',
  '오프라인 모드',
];
// '로그'는 로그인·로그아웃 안에서는 괜찮다.
const AVOIDED_PATTERN = new RegExp(`${AVOIDED.join('|')}|로그(?!인|아웃)`, 'g');

const SRC = join(__dirname, '..');
const UI_DIRS = ['app', 'features', 'components'];

const sourceFiles = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      return entry.name === '__tests__' || entry.name === 'testing' ? [] : sourceFiles(path);
    }
    return /\.tsx?$/.test(entry.name) ? [path] : [];
  });

// 주석은 화면에 나오지 않으므로 지운다. 문자열 안의 '//'(URL)는 UI 코드에 없다.
const withoutComments = (code: string): string =>
  code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

describe('화면 문구의 용어', () => {
  test('용어집에서 피하라고 한 말을 쓰지 않는다', () => {
    const found = UI_DIRS.flatMap((dir) => sourceFiles(join(SRC, dir))).flatMap((file) =>
      [...withoutComments(readFileSync(file, 'utf8')).matchAll(AVOIDED_PATTERN)].map(
        ([term]) => `${relative(SRC, file)}: ${term}`,
      ),
    );

    expect(found).toEqual([]);
  });
});

// 덱 편집에서 고를 수 있는 발음 언어. value는 IETF 언어 코드, null은 "없음"이다.
export const languages = [
  { value: null, label: '없음' },
  { value: 'ja', label: '일본어' },
  { value: 'en', label: '영어' },
  { value: 'ko', label: '한국어' },
] as const;

/** 화면에 쓰는 언어 이름. 목록에 없는 코드(외부에서 저장한 값)는 코드를 그대로 쓴다. */
export const languageName = (code: string): string =>
  languages.find((option) => option.value === code)?.label ?? code;

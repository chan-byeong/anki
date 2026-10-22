// 평가 버튼과 완료 화면의 결과가 같은 순서·이름을 쓴다.
export const RATINGS = [
  { kind: 'forgot', label: '모름', rating: 'dont' },
  { kind: 'unsure', label: '헷갈림', rating: 'unsure' },
  { kind: 'knew', label: '앎', rating: 'know' },
] as const;

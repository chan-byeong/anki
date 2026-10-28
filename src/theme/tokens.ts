// Anki 디자인 토큰 v1.1. 캔버스 "Anki 디자인"의 tokens.css가 단일 출처다.
// 값을 바꿀 때는 캔버스를 먼저 고친다.

export interface ColorTokens {
  bg: string;
  surface: string;
  line: string;
  text: string;
  muted: string;
  inverse: string;
  danger: string;
  warn: string;
  success: string;
  dim: string;
}

export type ThemeName = 'light' | 'dark';

export const colors: Record<ThemeName, ColorTokens> = {
  light: {
    bg: '#FFFFFF',
    surface: '#F4F4F5',
    line: '#EAEAEC',
    text: '#111113',
    muted: '#6B6B73',
    inverse: '#FFFFFF',
    danger: '#C8321F',
    warn: '#A65B00',
    success: '#1E7A4C',
    dim: 'rgba(0, 0, 0, 0.4)',
  },
  dark: {
    bg: '#0B0B0C',
    surface: '#18181B',
    line: '#242428',
    text: '#F2F2F3',
    muted: '#909099',
    inverse: '#0B0B0C',
    danger: '#FF8A7D',
    warn: '#F0B252',
    success: '#66D19C',
    dim: 'rgba(0, 0, 0, 0.6)',
  },
};

// 이미지 위: 사진은 테마를 따르지 않으므로 고정
export const onImage = {
  color: '#FFFFFF',
  muted: 'rgba(255, 255, 255, 0.8)',
  control: 'rgba(0, 0, 0, 0.4)',
} as const;

// 그라디언트: expo-linear-gradient의 LinearGradient에 `{...scrim}`처럼 펼쳐 쓴다.
interface GradientToken {
  colors: readonly [string, string, ...string[]];
  locations?: readonly [number, number, ...number[]];
  start: { x: number; y: number };
  end: { x: number; y: number };
}

// --scrim: linear-gradient(to top, rgba(0,0,0,.82), rgba(0,0,0,0))
export const scrim: GradientToken = {
  colors: ['rgba(0, 0, 0, 0.82)', 'rgba(0, 0, 0, 0)'],
  start: { x: 0, y: 1 },
  end: { x: 0, y: 0 },
};

// --image-placeholder: linear-gradient(165deg, #C9CCD3 0%, #8E939D 55%, #4A4E57 100%)
// 165deg는 아래쪽에서 오른쪽으로 15도 기운 방향이라 (0.37, 0.02) → (0.63, 0.98)로 근사한다.
export const imagePlaceholder: GradientToken = {
  colors: ['#C9CCD3', '#8E939D', '#4A4E57'],
  locations: [0, 0.55, 1],
  start: { x: 0.37, y: 0.02 },
  end: { x: 0.63, y: 0.98 },
};

export const fonts = {
  // KR 글꼴이 기본이고 일본어(lang="ja") 텍스트만 JP 글꼴을 명시해서 쓴다.
  sans: { regular: 'NotoSansKR_400Regular', bold: 'NotoSansKR_600SemiBold' },
  ja: { regular: 'NotoSansJP_400Regular', bold: 'NotoSansJP_600SemiBold' },
  mono: 'Menlo',
} as const;

export type FontWeightName = 'regular' | 'bold';

export const typography = {
  display: { fontSize: 34, lineHeight: 44 },
  title: { fontSize: 22, lineHeight: 30 },
  body: { fontSize: 16, lineHeight: 24 },
  caption: { fontSize: 13, lineHeight: 18 },
} as const;

export type TypographyName = keyof typeof typography;

export const space = { 1: 4, 2: 8, 3: 16, 4: 24, 5: 40 } as const;

export const radius = { sm: 12, lg: 20, full: 999 } as const;

export const size = {
  touch: 44,
  button: 56,
  row: 64,
  rating: 72,
  // 브리프의 평가 버튼 마크. 캔버스 토큰 누락(STA-141 점검 대상).
  ratingMark: 28,
  thumb: 96,
  // 아이콘 버튼을 화면 여백 24에 시각적으로 맞추는 바깥 여백 (space-4 / 2)
  edgeIcon: space[4] / 2,
} as const;

// --status-bar, --safe-bottom은 기기 값이라 토큰으로 두지 않는다. safe-area insets를 쓴다.

// 시간(ms). --motion은 tokens.css, 나머지는 캔버스 motion.css에 있다.
// 기본 전환: 페이드, 나가기, 카드 교체, 토스트, 목록에서 빠짐.
export const motion = 160;
// 누름 피드백, 아이콘 켜짐, 선택 원.
export const motionPress = 100;
// 큰 면이 들어올 때: 시트, 정답 공개.
export const motionEnter = 240;
// 길게 누르기 판정.
export const motionHold = 400;

// 캔버스 Motion의 --toast-hold: 토스트가 머무는 시간. 보조 줄(sub)이 있으면 더 오래 둔다.
export const toastHold = { plain: 3000, withSub: 4000 } as const;

// 늦을 때만 기다림 표시: after가 지나야 띄우고, 띄우면 최소 min 동안 둔다.
// 캔버스 토큰에는 없고 "한장 인터랙션 명세"의 시간과 곡선 표에만 있다.
export const slow = { after: 300, min: 400 } as const;

// 곡선. cubic-bezier(x1, y1, x2, y2)의 네 값이라 애니메이션 라이브러리와 무관하다.
export type Bezier = readonly [number, number, number, number];
// 들어옴: 빠르게 시작해 부드럽게 멈춤.
export const easeOut: Bezier = [0.2, 0, 0, 1];
// 나감: 천천히 시작해 빠르게 사라짐.
export const easeIn: Bezier = [0.4, 0, 1, 1];
// 제자리 변화: 색, 크기, 높이.
export const easeMove: Bezier = [0.4, 0, 0.2, 1];

// 거리. 동작 줄이기에서는 useMotion이 크기 변화와 이동을 없앤 값을 준다.
// 누를 때 줄어드는 비율.
export const pressScale = 0.97;
// 작은 것(토스트, 글자)이 들어오고 나가는 거리.
export const shift = 8;
// 복습 카드가 들어오는 거리.
export const shiftCard = 24;

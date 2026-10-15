import { View } from 'react-native';
import Svg, { Circle, Line, Path, Polyline, Rect } from 'react-native-svg';

export interface IconProps {
  color: string;
  size?: number;
}

export type IconComponent = (props: IconProps) => React.JSX.Element;

// 캔버스의 인라인 SVG(24 격자, 선 2, 둥근 끝)를 그대로 옮긴 것이다.
function Glyph({
  color,
  size = 22,
  strokeWidth = 2,
  children,
}: IconProps & { strokeWidth?: number; children: React.ReactNode }) {
  // 아이콘은 장식이다. 이름은 감싼 버튼의 접근성 라벨이 맡는다.
  // RN 전용 속성을 Svg에 주면 웹에서 <svg> DOM으로 새어 경고가 나므로 View에 aria-hidden을 준다.
  return (
    <View aria-hidden>
      <Svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {children}
      </Svg>
    </View>
  );
}

export const ChevronLeftIcon: IconComponent = (props) => (
  <Glyph {...props}>
    <Polyline points="15 18 9 12 15 6" />
  </Glyph>
);

export const ChevronRightIcon: IconComponent = (props) => (
  <Glyph {...props}>
    <Polyline points="9 18 15 12 9 6" />
  </Glyph>
);

export const CloseIcon: IconComponent = (props) => (
  <Glyph {...props}>
    <Line x1="18" y1="6" x2="6" y2="18" />
    <Line x1="6" y1="6" x2="18" y2="18" />
  </Glyph>
);

export const PlusIcon: IconComponent = (props) => (
  <Glyph {...props}>
    <Line x1="12" y1="5" x2="12" y2="19" />
    <Line x1="5" y1="12" x2="19" y2="12" />
  </Glyph>
);

export const AlertCircleIcon: IconComponent = ({ size = 18, ...props }) => (
  <Glyph size={size} {...props}>
    <Circle cx="12" cy="12" r="10" />
    <Line x1="12" y1="8" x2="12" y2="12" />
    <Line x1="12" y1="16" x2="12.01" y2="16" />
  </Glyph>
);

export const MonitorIcon: IconComponent = ({ size = 18, ...props }) => (
  <Glyph size={size} {...props}>
    <Rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
    <Line x1="8" y1="21" x2="16" y2="21" />
    <Line x1="12" y1="17" x2="12" y2="21" />
  </Glyph>
);

// 평가 표시(✕ △ ○). 선 굵기 2.6은 캔버스 components.css의 .rmark 한 곳에서만 정한 값이다.
const MARK_PATHS = {
  forgot: <Path d="M6 6l12 12M18 6L6 18" />,
  unsure: <Path d="M12 5L20.5 19H3.5z" />,
  knew: <Circle cx="12" cy="12" r="7.5" />,
} as const;

export type RatingKind = keyof typeof MARK_PATHS;

export function RatingShape({ kind, color, size = 18 }: IconProps & { kind: RatingKind }) {
  return (
    <Glyph color={color} size={size} strokeWidth={2.6}>
      {MARK_PATHS[kind]}
    </Glyph>
  );
}

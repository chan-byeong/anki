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

export const CheckIcon: IconComponent = (props) => (
  <Glyph {...props}>
    <Polyline points="20 6 9 17 4 12" />
  </Glyph>
);

export const MoreIcon: IconComponent = (props) => (
  <Glyph {...props}>
    <Circle cx="12" cy="12" r="1" />
    <Circle cx="19" cy="12" r="1" />
    <Circle cx="5" cy="12" r="1" />
  </Glyph>
);

export const EditIcon: IconComponent = (props) => (
  <Glyph {...props}>
    <Path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
  </Glyph>
);

export const TrashIcon: IconComponent = (props) => (
  <Glyph {...props}>
    <Polyline points="3 6 5 6 21 6" />
    <Path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <Line x1="10" y1="11" x2="10" y2="17" />
    <Line x1="14" y1="11" x2="14" y2="17" />
  </Glyph>
);

export const DeckIcon: IconComponent = ({ size = 14, ...props }) => (
  <Glyph size={size} {...props}>
    <Rect x="3" y="4" width="18" height="16" rx="2" />
    <Line x1="3" y1="9" x2="21" y2="9" />
  </Glyph>
);

export const StatsIcon: IconComponent = (props) => (
  <Glyph {...props}>
    <Line x1="18" y1="20" x2="18" y2="10" />
    <Line x1="12" y1="20" x2="12" y2="4" />
    <Line x1="6" y1="20" x2="6" y2="14" />
  </Glyph>
);

export const SettingsIcon: IconComponent = (props) => (
  <Glyph {...props}>
    <Circle cx="12" cy="12" r="3" />
    <Path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </Glyph>
);

export const SearchIcon: IconComponent = ({ size = 18, ...props }) => (
  <Glyph size={size} {...props}>
    <Circle cx="11" cy="11" r="8" />
    <Line x1="21" y1="21" x2="16.65" y2="16.65" />
  </Glyph>
);

export const ClearCircleIcon: IconComponent = ({ size = 18, ...props }) => (
  <Glyph size={size} {...props}>
    <Circle cx="12" cy="12" r="10" />
    <Line x1="15" y1="9" x2="9" y2="15" />
    <Line x1="9" y1="9" x2="15" y2="15" />
  </Glyph>
);

export const AlertCircleIcon: IconComponent = ({ size = 18, ...props }) => (
  <Glyph size={size} {...props}>
    <Circle cx="12" cy="12" r="10" />
    <Line x1="12" y1="8" x2="12" y2="12" />
    <Line x1="12" y1="16" x2="12.01" y2="16" />
  </Glyph>
);

export const InboxIcon: IconComponent = ({ size = 18, ...props }) => (
  <Glyph size={size} {...props}>
    <Line x1="22" y1="12" x2="2" y2="12" />
    <Path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
    <Line x1="6" y1="16" x2="6.01" y2="16" />
    <Line x1="10" y1="16" x2="10.01" y2="16" />
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

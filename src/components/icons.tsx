import Svg, { Line, Polyline } from 'react-native-svg';

export interface IconProps {
  color: string;
  size?: number;
}

export type IconComponent = (props: IconProps) => React.JSX.Element;

// 캔버스의 인라인 SVG(24 격자, 선 2, 둥근 끝)를 그대로 옮긴 것이다.
function Glyph({ color, size = 22, children }: IconProps & { children: React.ReactNode }) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {children}
    </Svg>
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

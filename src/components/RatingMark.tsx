import { View } from 'react-native';

import { useTheme } from '../theme/ThemeProvider';
import type { ColorTokens } from '../theme/tokens';
import { RatingShape, type RatingKind } from './icons';

export type { RatingKind };

// 용어집의 평가 이름. 화면 읽기 이름으로도 쓴다.
const NAME: Record<RatingKind, string> = { forgot: '모름', unsure: '헷갈림', knew: '앎' };

// 평가마다 정해진 색. 눌린 평가 버튼은 이 색을 배경으로 쓴다.
export const ratingColor = (colors: ColorTokens, kind: RatingKind): string =>
  ({ forgot: colors.danger, unsure: colors.warn, knew: colors.success })[kind];

interface RatingMarkProps {
  kind: RatingKind;
  size?: number;
  // 평가색 배경 위에 놓일 때 마크 색을 바꾼다.
  color?: string;
}

// 모양(✕ △ ○)이 먼저 말하고 색은 보조다. 순서는 손 설정과 상관없이 호출 측에서 고정한다.
export function RatingMark({ kind, size = 18, color }: RatingMarkProps) {
  const { colors } = useTheme();

  return (
    <View accessible accessibilityRole="image" accessibilityLabel={NAME[kind]}>
      <RatingShape kind={kind} color={color ?? ratingColor(colors, kind)} size={size} />
    </View>
  );
}

import { View } from 'react-native';

import { useTheme } from '../theme/ThemeProvider';
import { RatingShape, type RatingKind } from './icons';

export type { RatingKind };

// 용어집의 평가 이름. 화면 읽기 이름으로도 쓴다.
const NAME: Record<RatingKind, string> = { forgot: '모름', unsure: '헷갈림', knew: '앎' };

interface RatingMarkProps {
  kind: RatingKind;
  size?: number;
}

// 모양(✕ △ ○)이 먼저 말하고 색은 보조다. 순서는 손 설정과 상관없이 호출 측에서 고정한다.
export function RatingMark({ kind, size = 18 }: RatingMarkProps) {
  const { colors } = useTheme();
  const color = { forgot: colors.danger, unsure: colors.warn, knew: colors.success }[kind];

  return (
    <View accessible accessibilityRole="image" accessibilityLabel={NAME[kind]}>
      <RatingShape kind={kind} color={color} size={size} />
    </View>
  );
}

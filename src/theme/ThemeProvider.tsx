import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useColorScheme, type TextStyle } from 'react-native';

import {
  colors,
  fonts,
  typography,
  type ColorTokens,
  type FontWeightName,
  type ThemeName,
  type TypographyName,
} from './tokens';

interface TextStyleOptions {
  weight?: FontWeightName;
  // 일본어(lang="ja") 텍스트는 JP 글리프 글꼴을 명시한다.
  ja?: boolean;
}

interface Theme {
  name: ThemeName;
  colors: ColorTokens;
  // fontSize·lineHeight는 RN이 시스템 글자 크기에 맞춰 함께 키운다(allowFontScaling 기본값).
  text: (variant: TypographyName, options?: TextStyleOptions) => TextStyle;
}

const ThemeContext = createContext<Theme | null>(null);

interface ThemeProviderProps {
  // STA-134(테마 선택)에서 수동 선택을 넘길 자리. 비우면 시스템 설정을 따른다.
  override?: ThemeName;
  children: ReactNode;
}

export function ThemeProvider({ override, children }: ThemeProviderProps) {
  const system = useColorScheme();
  const name: ThemeName = override ?? (system === 'dark' ? 'dark' : 'light');

  const theme = useMemo<Theme>(
    () => ({
      name,
      colors: colors[name],
      text: (variant, { weight = 'regular', ja = false } = {}) => {
        const { fontSize, lineHeight } = typography[variant];
        return {
          fontFamily: (ja ? fonts.ja : fonts.sans)[weight],
          fontSize,
          lineHeight,
          color: colors[name].text,
        };
      },
    }),
    [name],
  );

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  const theme = useContext(ThemeContext);
  if (!theme) {
    throw new Error('useTheme must be used inside ThemeProvider');
  }
  return theme;
}

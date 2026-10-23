import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
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
import {
  readThemePreference,
  writeThemePreference,
  type PreferenceStorage,
  type ThemePreference,
} from './theme-preference';

interface TextStyleOptions {
  weight?: FontWeightName;
  // 일본어(lang="ja") 텍스트는 JP 글리프 글꼴을 명시한다.
  ja?: boolean;
}

interface Theme {
  name: ThemeName;
  // 사용자가 고른 테마. system이면 name은 기기 설정을 따른다.
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
  colors: ColorTokens;
  // fontSize·lineHeight는 RN이 시스템 글자 크기에 맞춰 함께 키운다(allowFontScaling 기본값).
  text: (variant: TypographyName, options?: TextStyleOptions) => TextStyle;
}

const ThemeContext = createContext<Theme | null>(null);

interface ThemeProviderProps {
  // 테스트에서 테마를 고정한다. 있으면 사용자의 선택보다 앞선다.
  override?: ThemeName;
  // 테마 선택을 읽고 쓰는 곳. 없으면 저장하지 않고 시스템에서 시작한다.
  storage?: PreferenceStorage;
  children: ReactNode;
}

export function ThemeProvider({ override, storage, children }: ThemeProviderProps) {
  const system = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>(() =>
    storage ? readThemePreference(storage) : 'system',
  );
  const setPreference = useCallback(
    (next: ThemePreference) => {
      setPreferenceState(next);
      if (storage) void writeThemePreference(storage, next);
    },
    [storage],
  );
  const chosen: ThemeName =
    preference === 'system' ? (system === 'dark' ? 'dark' : 'light') : preference;
  const name: ThemeName = override ?? chosen;

  const theme = useMemo<Theme>(
    () => ({
      name,
      preference,
      setPreference,
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
    [name, preference, setPreference],
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

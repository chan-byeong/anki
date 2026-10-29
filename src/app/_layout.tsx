import { NotoSansJP_400Regular, NotoSansJP_600SemiBold } from '@expo-google-fonts/noto-sans-jp';
import {
  NotoSansKR_400Regular,
  NotoSansKR_600SemiBold,
  useFonts,
} from '@expo-google-fonts/noto-sans-kr';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { ReducedMotionConfig, ReduceMotion } from 'react-native-reanimated';

import { HandProvider } from '@/features/settings/HandProvider';
import { StorageErrorScreen } from '@/features/storage-status/components/StorageErrorScreen';
import { useMotion } from '@/hooks/use-motion';
import { screenTransition, type ScreenTransition } from '@/navigation/screen-transitions';
import { kvStore } from '@/storage/kv-store';
import { openAppStore } from '@/storage/open-app-store';
import type { Store } from '@/storage/store';
import { StoreProvider } from '@/storage/StoreProvider';
import { ThemeProvider, useTheme } from '@/theme/ThemeProvider';

SplashScreen.preventAutoHideAsync();

// 화면마다 전환 모양을 여기 한 곳에 둔다(STA-157). 덱 목록(index)은 뿌리라 밀려 들어오지 않고,
// router.replace('/')로 돌아올 때(복습 끝, 덱 만든 뒤 등)만 바꿔 끼운다.
const SCREENS: { name: string; transition: ScreenTransition }[] = [
  { name: 'index', transition: 'replace' },
  { name: 'deck/[id]', transition: 'push' },
  { name: 'settings', transition: 'push' },
  { name: 'stats', transition: 'push' },
  { name: 'trash', transition: 'push' },
  { name: 'review/[deckId]', transition: 'push' },
  { name: 'deck/new', transition: 'modal' },
  { name: 'deck/[id]/edit', transition: 'modal' },
  { name: 'card/new', transition: 'modal' },
  { name: 'card/[id]', transition: 'modal' },
];

function ThemedStack() {
  const { name, colors } = useTheme();
  const { reduced } = useMotion();
  return (
    <>
      <StatusBar style={name === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
        {SCREENS.map(({ name: route, transition }) => (
          <Stack.Screen key={route} name={route} options={screenTransition(transition, reduced)} />
        ))}
      </Stack>
    </>
  );
}

type StoreState = { kind: 'opening' } | { kind: 'open'; store: Store } | { kind: 'failed' };

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    NotoSansKR_400Regular,
    NotoSansKR_600SemiBold,
    NotoSansJP_400Regular,
    NotoSansJP_600SemiBold,
  });
  const [storeState, setStoreState] = useState<StoreState>({ kind: 'opening' });
  const ready = (fontsLoaded || fontError !== null) && storeState.kind !== 'opening';

  const [retrying, setRetrying] = useState(false);

  const openStore = useCallback(
    () =>
      openAppStore().then(
        (store) => setStoreState({ kind: 'open', store }),
        () => setStoreState({ kind: 'failed' }),
      ),
    [],
  );

  useEffect(() => {
    openStore();
  }, [openStore]);

  const retry = () => {
    setRetrying(true);
    openStore().finally(() => setRetrying(false));
  };

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <ThemeProvider storage={kvStore}>
      {/* reanimated는 동작 줄이기가 켜지면 애니메이션을 건너뛰지만, 명세는 160ms 페이드를 남긴다.
          판단은 useMotion(useReducedMotion)이 하므로 라이브러리 처리는 끈다(ADR 0020). */}
      <ReducedMotionConfig mode={ReduceMotion.Never} />
      <HandProvider storage={kvStore}>
        {storeState.kind === 'open' ? (
          <StoreProvider store={storeState.store}>
            <ThemedStack />
          </StoreProvider>
        ) : (
          <StorageErrorScreen onRetry={retry} retrying={retrying} />
        )}
      </HandProvider>
    </ThemeProvider>
  );
}

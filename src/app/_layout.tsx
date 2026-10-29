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
import { kvStore } from '@/storage/kv-store';
import { openAppStore } from '@/storage/open-app-store';
import type { Store } from '@/storage/store';
import { StoreProvider } from '@/storage/StoreProvider';
import { ThemeProvider, useTheme } from '@/theme/ThemeProvider';

SplashScreen.preventAutoHideAsync();

function ThemedStack() {
  const { name, colors } = useTheme();
  return (
    <>
      <StatusBar style={name === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
        <Stack.Screen name="deck/new" options={{ presentation: 'modal' }} />
        <Stack.Screen name="deck/[id]/edit" options={{ presentation: 'modal' }} />
        <Stack.Screen name="card/new" options={{ presentation: 'modal' }} />
        <Stack.Screen name="card/[id]" options={{ presentation: 'modal' }} />
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

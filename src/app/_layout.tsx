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
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ReducedMotionConfig, ReduceMotion } from 'react-native-reanimated';

import { FadeSwap } from '@/components';
import { HandProvider } from '@/features/settings/HandProvider';
import { LogoSplash } from '@/features/splash/components/LogoSplash';
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

  // 로고가 그려지면 네이티브 스플래시를 거둔다. 로고가 못 그려져도 준비가 끝나면 거둔다.
  const hideNativeSplash = () => {
    SplashScreen.hideAsync().catch(() => {});
  };
  useEffect(() => {
    if (ready) hideNativeSplash();
  }, [ready]);

  return (
    // 제스처(밀어서 평가, 밀어서 휴지통)는 앱 전체를 이 뿌리 뷰 아래에서 받는다.
    <GestureHandlerRootView style={styles.fill}>
      <ThemeProvider storage={kvStore}>
        {/* reanimated는 동작 줄이기가 켜지면 애니메이션을 건너뛰지만, 명세는 160ms 페이드를 남긴다.
          판단은 useMotion(useReducedMotion)이 하므로 라이브러리 처리는 끈다(ADR 0020). */}
        <ReducedMotionConfig mode={ReduceMotion.Never} />
        <HandProvider storage={kvStore}>
          {/* 로고(첫 장 놓기)·저장소 오류 화면·앱은 160ms 페이드로 바꿔 끼운다.
              로고 모션은 준비를 기다리는 동안만 돈다. 준비가 먼저 끝나면 모션이 안 끝나도 바로 넘어간다. */}
          <FadeSwap swapKey={ready ? storeState.kind : 'splash'} style={styles.fill}>
            {!ready ? (
              <LogoSplash onShown={hideNativeSplash} />
            ) : storeState.kind === 'open' ? (
              <StoreProvider store={storeState.store}>
                <ThemedStack />
              </StoreProvider>
            ) : (
              <StorageErrorScreen onRetry={retry} retrying={retrying} />
            )}
          </FadeSwap>
        </HandProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});

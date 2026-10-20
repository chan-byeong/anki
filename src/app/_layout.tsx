import { NotoSansJP_400Regular, NotoSansJP_600SemiBold } from '@expo-google-fonts/noto-sans-jp';
import {
  NotoSansKR_400Regular,
  NotoSansKR_600SemiBold,
  useFonts,
} from '@expo-google-fonts/noto-sans-kr';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { openAppStore } from '@/storage/open-app-store';
import type { Store } from '@/storage/store';
import { StoreProvider } from '@/storage/StoreProvider';
import { ThemeProvider, useTheme } from '@/theme/ThemeProvider';
import { space } from '@/theme/tokens';

SplashScreen.preventAutoHideAsync();

function ThemedStack() {
  const { name, colors } = useTheme();
  return (
    <>
      <StatusBar style={name === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
        <Stack.Screen name="deck/new" options={{ presentation: 'modal' }} />
      </Stack>
    </>
  );
}

// 저장소를 열지 못했을 때의 최소 안내. 디자인된 오류 화면(State-6)은 따로 만든다.
function StoreFailed() {
  const { colors, text } = useTheme();
  return (
    <View style={[styles.failed, { backgroundColor: colors.bg }]}>
      <Text accessibilityRole="header" style={text('title', { weight: 'bold' })}>
        저장소를 열지 못했어요
      </Text>
      <Text style={[text('body'), { color: colors.muted }]}>앱을 다시 열어 주세요.</Text>
    </View>
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

  useEffect(() => {
    openAppStore().then(
      (store) => setStoreState({ kind: 'open', store }),
      () => setStoreState({ kind: 'failed' }),
    );
  }, []);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <ThemeProvider>
      {storeState.kind === 'open' ? (
        <StoreProvider store={storeState.store}>
          <ThemedStack />
        </StoreProvider>
      ) : (
        <StoreFailed />
      )}
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  failed: { flex: 1, justifyContent: 'center', padding: space[4], gap: space[2] },
});

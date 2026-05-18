import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts, Inter_700Bold, Inter_800ExtraBold } from '@expo-google-fonts/inter';
import { useWordStore } from '../store/wordStore';

export default function RootLayout() {
  const load = useWordStore((s) => s.load);
  const [fontsLoaded] = useFonts({ Inter_700Bold, Inter_800ExtraBold });

  useEffect(() => {
    load();
  }, []);

  if (!fontsLoaded) return null;

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
      </Stack>
    </>
  );
}

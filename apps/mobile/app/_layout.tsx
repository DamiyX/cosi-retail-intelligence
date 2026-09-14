import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerTintColor: '#174F46', contentStyle: { backgroundColor: '#F7F8F5' } }}>
        <Stack.Screen name="index" options={{ title: 'Welcome' }} />
        <Stack.Screen name="about" options={{ title: 'About' }} />
      </Stack>
    </>
  );
}

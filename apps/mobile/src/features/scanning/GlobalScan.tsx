import { usePathname, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Keyboard, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PrimaryButton } from '../../ui/components';

export default function GlobalScan() {
  const path = usePathname();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [keyboard, setKeyboard] = useState(false);
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setKeyboard(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboard(false));
    return () => { show.remove(); hide.remove(); };
  }, []);
  if (keyboard || !['/today', '/products', '/more'].includes(path) || process.env.EXPO_PUBLIC_SCANNER_ENABLED === 'false') return null;
  return <View style={{ padding: 12, paddingBottom: Math.max(12, insets.bottom), alignItems: 'flex-end' }}>
    <PrimaryButton title="Scan" onPress={() => router.navigate({ pathname: '/sell', params: { scan: '1' } })} />
  </View>;
}

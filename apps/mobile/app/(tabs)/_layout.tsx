import { Tabs } from 'expo-router';
import { View } from 'react-native';
import GlobalScan from '../../src/features/scanning/GlobalScan';

export default function TabsLayout() {
  return <View style={{ flex: 1 }}>
    <Tabs initialRouteName="today" screenOptions={{
      headerTintColor: '#174F46', tabBarActiveTintColor: '#174F46',
      tabBarInactiveTintColor: '#41534C', sceneStyle: { backgroundColor: '#F7F8F5' },
    }}>
      <Tabs.Screen name="today" options={{ title: 'Today' }} />
      <Tabs.Screen name="products" options={{ title: 'Products' }} />
      <Tabs.Screen name="more" options={{ title: 'More' }} />
    </Tabs>
    <GlobalScan />
  </View>;
}

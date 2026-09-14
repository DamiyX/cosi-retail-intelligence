import { Tabs } from 'expo-router';

/**
 * MVP baseline navigation (docs/design/DESIGN.md). Products is the only
 * implemented area in M2; Today, Sell, and More stay clearly labelled
 * placeholders until their milestones. Text labels keep every destination
 * accessible without an icon dependency.
 */
export default function TabsLayout() {
  return (
    <Tabs
      initialRouteName="products"
      screenOptions={{
        headerTintColor: '#174F46',
        tabBarActiveTintColor: '#174F46',
        tabBarInactiveTintColor: '#41534C',
        sceneStyle: { backgroundColor: '#F7F8F5' },
      }}
    >
      <Tabs.Screen name="today" options={{ title: 'Today' }} />
      <Tabs.Screen name="sell" options={{ title: 'Sell' }} />
      <Tabs.Screen name="products" options={{ title: 'Products' }} />
      <Tabs.Screen name="more" options={{ title: 'More' }} />
    </Tabs>
  );
}

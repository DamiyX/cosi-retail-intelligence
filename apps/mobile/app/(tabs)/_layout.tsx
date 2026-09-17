import { useCallback, useRef } from 'react';
import { Tabs } from 'expo-router';
import { Alert } from 'react-native';

import { SaleDraftNavigationProvider, useSaleDraftNavigation } from '../../src/sales/SaleDraftNavigationContext';
import { saleDraftExitCopy, type SaleDraftExit } from '../../src/sales/draftExit';

interface TabPressEvent {
  target?: string;
  preventDefault(): void;
}

interface TabNavigation {
  getState(): { index: number; routes: { key: string; name: string }[] } | undefined;
  navigate(name: string): void;
}

interface TabScreenListenerArguments {
  navigation: TabNavigation;
}

function TabsContent() {
  const { clearDraft, getDraft } = useSaleDraftNavigation();
  const allowingNavigationRef = useRef(false);

  const confirmTabExit = useCallback(
    (draft: SaleDraftExit, navigation: TabNavigation, targetName: string): void => {
      const copy = saleDraftExitCopy(draft.reason);
      Alert.alert(copy.title, copy.message, [
        { text: 'Keep editing', style: 'cancel' },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: () => {
            allowingNavigationRef.current = true;
            clearDraft();
            draft.discard();
            try {
              navigation.navigate(targetName);
            } finally {
              allowingNavigationRef.current = false;
            }
          },
        },
      ]);
    },
    [clearDraft],
  );

  const screenListeners = useCallback(
    ({ navigation }: TabScreenListenerArguments) => ({
      tabPress: (event: TabPressEvent) => {
        if (allowingNavigationRef.current) {
          return;
        }
        const state = navigation.getState();
        const currentRoute = state?.routes[state.index];
        if (currentRoute?.name !== 'sell' || event.target === currentRoute.key) {
          return;
        }
        const targetRoute = state?.routes.find((route) => route.key === event.target);
        const draft = getDraft();
        if (!targetRoute || !draft) {
          return;
        }
        event.preventDefault();
        confirmTabExit(draft, navigation, targetRoute.name);
      },
    }),
    [confirmTabExit, getDraft],
  );

  return (
    <Tabs
      initialRouteName="products"
      screenListeners={screenListeners}
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

/**
 * MVP baseline navigation (docs/design/DESIGN.md). Products is the only
 * implemented area in M2; Today, Sell, and More stay clearly labelled
 * placeholders until their milestones. Text labels keep every destination
 * accessible without an icon dependency.
 */
export default function TabsLayout() {
  return (
    <SaleDraftNavigationProvider>
      <TabsContent />
    </SaleDraftNavigationProvider>
  );
}

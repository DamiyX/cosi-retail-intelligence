import { useIsFocused, useRouter, useNavigation } from 'expo-router';
import { useRef, useState } from 'react';
import { Alert } from 'react-native';
import { usePreventRemove } from 'expo-router/build/react-navigation/core';

import ExpenseEntryScreen from '../src/screens/finance/ExpenseEntryScreen';
import MissingFinanceStore from '../src/screens/finance/MissingFinanceStore';
import { FinanceProvider, useFinance } from '../src/finance/FinanceContext';
import { ErrorPanel } from '../src/ui/components';

function ExpenseRouteContent() {
  const router = useRouter();
  const navigation = useNavigation();
  const focused = useIsFocused();
  const { client, failure, retryLocalStore } = useFinance();
  const discardRef = useRef<() => void>(() => undefined);
  const [dirty, setDirty] = useState(false);
  const [allowNavigation, setAllowNavigation] = useState(false);
  usePreventRemove(focused && dirty && !allowNavigation, ({ data }) => {
    Alert.alert('Discard expense draft?', 'Your unsaved expense details will be cleared.', [
      { text: 'Keep editing', style: 'cancel' },
      {
        text: 'Discard',
        style: 'destructive',
        onPress: () => {
          setAllowNavigation(true);
          discardRef.current();
          requestAnimationFrame(() => {
            navigation.dispatch(data.action);
            setAllowNavigation(false);
          });
        },
      },
    ]);
  });
  if (!client) {
    return failure ? <ErrorPanel title="Expense recording unavailable" message={failure} onRetry={retryLocalStore} /> : <MissingFinanceStore />;
  }
  return (
    <ExpenseEntryScreen
      client={client}
      onBack={() => router.back()}
      onOpenHistory={() => router.push('/expenses')}
      onDirtyDraftChange={(nextDirty, discard) => {
        setDirty(nextDirty);
        discardRef.current = discard;
      }}
    />
  );
}

export default function ExpenseRoute() {
  return <FinanceProvider><ExpenseRouteContent /></FinanceProvider>;
}

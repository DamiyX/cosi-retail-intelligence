import { useIsFocused, useNavigation, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Alert } from 'react-native';
import { usePreventRemove } from 'expo-router/build/react-navigation/core';

import OwnerWithdrawalEntryScreen from '../src/screens/finance/OwnerWithdrawalEntryScreen';
import MissingFinanceStore from '../src/screens/finance/MissingFinanceStore';
import { FinanceProvider, useFinance } from '../src/finance/FinanceContext';
import { ErrorPanel } from '../src/ui/components';

function WithdrawalRouteContent() {
  const router = useRouter();
  const navigation = useNavigation();
  const focused = useIsFocused();
  const { client, failure, retryLocalStore } = useFinance();
  const discardRef = useRef<() => void>(() => undefined);
  const [dirty, setDirty] = useState(false);
  const [allowNavigation, setAllowNavigation] = useState(false);
  usePreventRemove(focused && dirty && !allowNavigation, ({ data }) => {
    Alert.alert('Discard withdrawal draft?', 'Your unsaved withdrawal details will be cleared.', [
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
    return failure ? <ErrorPanel title="Withdrawal recording unavailable" message={failure} onRetry={retryLocalStore} /> : <MissingFinanceStore />;
  }
  return (
    <OwnerWithdrawalEntryScreen
      client={client}
      onBack={() => router.back()}
      onOpenHistory={() => router.push('/withdrawals')}
      onDirtyDraftChange={(nextDirty, discard) => {
        setDirty(nextDirty);
        discardRef.current = discard;
      }}
    />
  );
}

export default function WithdrawalRoute() {
  return <FinanceProvider><WithdrawalRouteContent /></FinanceProvider>;
}

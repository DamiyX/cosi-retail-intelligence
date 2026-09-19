import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useFinance } from '../../finance/FinanceContext';
import { ErrorPanel, Field, PrimaryButton } from '../../ui/components';
import { theme } from '../../ui/theme';

export default function MissingFinanceStore() {
  const { setupLocalStore } = useFinance();
  const [ownerName, setOwnerName] = useState('');
  const [storeName, setStoreName] = useState('');
  const [failure, setFailure] = useState<string | null>(null);
  const setup = (): void => {
    if (!ownerName.trim() || !storeName.trim()) {
      setFailure('Enter your name and store name.');
      return;
    }
    try {
      setupLocalStore(ownerName.trim(), storeName.trim());
    } catch {
      setFailure('Store setup could not be saved on this device. Nothing was changed.');
    }
  };
  return (
    <View style={styles.center}>
      <Field label="Your name" value={ownerName} onChangeText={setOwnerName} />
      <Field label="Store name" value={storeName} onChangeText={setStoreName} />
      {failure ? <ErrorPanel title="Store not created" message={failure} /> : null}
      <PrimaryButton title="Create local store" onPress={setup} />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, padding: theme.spacing(4), gap: theme.spacing(3), backgroundColor: theme.color.canvas, justifyContent: 'center' },
});

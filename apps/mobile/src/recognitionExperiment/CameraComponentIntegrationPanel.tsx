import { useState } from 'react';
import { Pressable, ScrollView, Text } from 'react-native';
import { requireNativeModule } from 'expo-modules-core';
export default function CameraComponentIntegrationPanel() {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('Camera integration ready. Open the camera test when instructed.');
  async function inspect() {
    if (pending) return;
    setPending(true);
    try { const value = await requireNativeModule<{ cameraComponentIntegrationStatus(): Promise<{record: string; cpu: string; namespace: string; attempt: string; retainedI00: string; initialAdmission: boolean; noCpuOrExportIntent: boolean}> }>('RecognitionExperiment').cameraComponentIntegrationStatus(); setMessage(`${value.attempt}\n${value.retainedI00}\n${value.namespace}\nInitial admission: ${value.initialAdmission ? 'allowed' : 'blocked'}\nNo CPU/export intent confirmed: ${value.noCpuOrExportIntent ? 'yes' : 'no'}\n${value.record}\n${value.cpu}`); }
    catch { setMessage('Saved result could not be verified. Preserve the attempt for inspection.'); }
    finally { setPending(false); }
  }
  async function open() {
    if (pending) return;
    setPending(true);
    try { await requireNativeModule<{ openCameraComponentIntegration(): Promise<unknown> }>('RecognitionExperiment').openCameraComponentIntegration(); setMessage('Native camera test opened. Return here after the saved record and CPU checks.'); }
    catch { setMessage('Camera test could not open. Preserve the current attempt and inspect its status before retrying.'); }
    finally { setPending(false); }
  }
  return <ScrollView contentContainerStyle={{ padding: 24, gap: 16 }}>
    <Text accessibilityRole="header">Camera integration test</Text>
    <Text>Use the generated chart when instructed. Opening the test does not take a photo.</Text>
    <Pressable accessibilityRole="button" accessibilityLabel="Open integrated camera test" accessibilityState={{ disabled: pending }} disabled={pending} onPress={() => void open()} style={{ minHeight: 48, padding: 16 }}><Text>Open camera test</Text></Pressable>
    <Pressable accessibilityRole="button" accessibilityLabel="Verify integrated saved result" accessibilityState={{ disabled: pending }} disabled={pending} onPress={() => void inspect()} style={{ minHeight: 48, padding: 16 }}><Text>Verify saved result</Text></Pressable>
    <Text accessibilityLiveRegion="polite">{message}</Text>
  </ScrollView>;
}

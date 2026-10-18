const envKeys = ['EXPO_PUBLIC_APP_ENV', 'COSI_SCANNER_VERIFICATION', 'COSI_RECOGNITION_EXPERIMENT', 'EXPO_PUBLIC_RECOGNITION_CAMERA_PROOF'] as const;
const original = Object.fromEntries(envKeys.map(k => [k, process.env[k]]));
const mockMods: Record<string, (context: unknown) => unknown> = {};
jest.mock('@expo/config-plugins', () => Object.fromEntries(['withAppBuildGradle', 'withSettingsGradle', 'withGradleProperties', 'withAndroidManifest', 'withProjectBuildGradle'].map(name => [name, (value: unknown, callback: (context: unknown) => unknown) => { mockMods[name] = callback; return value; }])));
function config(values: Record<string, string | undefined> = {}) {
  for (const key of envKeys) delete process.env[key]; Object.assign(process.env, values);
  let result: typeof import('../app.config').default;
  jest.isolateModules(() => { result = jest.requireActual<typeof import('../app.config')>('../app.config').default; }); return result!;
}
afterEach(() => { for (const key of envKeys) { const value = original[key]; if (value === undefined) delete process.env[key]; else process.env[key] = value; } });
test('camera opt-in requires the isolated pair and grants CAMERA only', () => {
  for (const values of [{ EXPO_PUBLIC_RECOGNITION_CAMERA_PROOF: '1' }, { EXPO_PUBLIC_RECOGNITION_CAMERA_PROOF: '1', COSI_RECOGNITION_EXPERIMENT: '1' }, { EXPO_PUBLIC_RECOGNITION_CAMERA_PROOF: 'true' }]) expect(() => config(values)).toThrow();
  const c = config({ EXPO_PUBLIC_APP_ENV: 'recognition-verification', COSI_RECOGNITION_EXPERIMENT: '1', EXPO_PUBLIC_RECOGNITION_CAMERA_PROOF: '1' });
  expect(c.android?.permissions).toEqual(['android.permission.CAMERA']); expect(c.android?.blockedPermissions).not.toContain('android.permission.CAMERA');
  expect(c.android?.blockedPermissions).toEqual(expect.arrayContaining(['android.permission.INTERNET', 'android.permission.RECORD_AUDIO', 'android.permission.READ_MEDIA_IMAGES']));
  expect(c.plugins).toEqual(['./plugins/withRecognitionExperiment', ['expo-camera', { recordAudioAndroid: false, microphonePermission: false, barcodeScannerEnabled: false }]]);
  expect(c.extra).toEqual({ appEnvironment: 'recognition-verification', recognitionExperimentBuild: true, recognitionCameraProofBuild: true }); expect(c.owner).toBeUndefined();
});
test('ordinary and zero-camera recognition configs retain their behavior', () => {
  const ordinary = config(); expect(ordinary.android?.package).toBe('com.damiyx.retailintelligence.dev'); expect(ordinary.plugins).toContain('expo-router'); expect(ordinary.extra?.recognitionCameraProofBuild).toBeUndefined();
  const isolated = config({ EXPO_PUBLIC_APP_ENV: 'recognition-verification', COSI_RECOGNITION_EXPERIMENT: '1' });
  expect(isolated.plugins).toEqual(['./plugins/withRecognitionExperiment']); expect(isolated.android?.permissions).toEqual([]); expect(isolated.android?.blockedPermissions).toContain('android.permission.CAMERA'); expect(isolated.extra?.recognitionCameraProofBuild).toBeUndefined();
  const disabled = config({ EXPO_PUBLIC_APP_ENV: 'recognition-verification', COSI_RECOGNITION_EXPERIMENT: '1', EXPO_PUBLIC_RECOGNITION_CAMERA_PROOF: '0' }); expect(disabled).toEqual(isolated);
});
test('camera variant removes only the camera exclusion and explicitly removes residual barcode metadata', () => {
  const plugin = jest.requireActual('../plugins/withRecognitionExperiment');
  for (const camera of ['0', '1']) {
    config({ EXPO_PUBLIC_APP_ENV: 'recognition-verification', COSI_RECOGNITION_EXPERIMENT: '1', EXPO_PUBLIC_RECOGNITION_CAMERA_PROOF: camera }); plugin({});
    const settings = { modResults: { contents: 'extensions.configure(com.facebook.react.ReactSettingsExtension)\nex.autolinkLibrariesFromCommand(expoAutolinking.rnConfigCommand)\nex.autolinkLibrariesFromCommand()' } };
    mockMods.withSettingsGradle(settings);
    expect(settings.modResults.contents.includes("'expo-camera'")).toBe(camera === '0'); expect(settings.modResults.contents).toContain("'expo-audio'"); expect(settings.modResults.contents).toContain("'expo-file-system'"); expect(settings.modResults.contents).toContain('Community autolinking is unsupported');
    const manifest = { modResults: { manifest: { $: {}, application: [{ $: {}, 'meta-data': [{ $: { 'android:name': 'com.google.mlkit.vision.DEPENDENCIES', 'android:value': 'barcode_ui' } }] }] } } };
    mockMods.withAndroidManifest(manifest);
    const app = manifest.modResults.manifest.application[0];
    expect(app.$).toEqual({ 'android:usesCleartextTraffic': 'false', 'android:allowBackup': 'false' });
    expect(app['meta-data']).toEqual(camera === '1' ? [{ $: { 'android:name': 'com.google.mlkit.vision.DEPENDENCIES', 'tools:node': 'remove' } }] : [{ $: { 'android:name': 'com.google.mlkit.vision.DEPENDENCIES', 'android:value': 'barcode_ui' } }]);
  }
});

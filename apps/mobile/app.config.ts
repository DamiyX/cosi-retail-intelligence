import type { ExpoConfig } from 'expo/config';

const variants = {
  development: { name: 'COSI Dev', suffix: '.dev' },
  preview: { name: 'COSI Preview', suffix: '.preview' },
  production: { name: 'COSI', suffix: '' },
  'scanner-verification': { name: 'COSI Scanner Verification', suffix: '.scannerverification' },
  'recognition-verification': { name: 'Recognition Generated Probe', suffix: '.recognitionverification' },
} as const;

const environment = process.env.EXPO_PUBLIC_APP_ENV ?? 'development';
if (!Object.hasOwn(variants, environment)) {
  throw new Error('Unknown EXPO_PUBLIC_APP_ENV.');
}
const scannerVerification = process.env.COSI_SCANNER_VERIFICATION === '1';
if (scannerVerification !== (environment === 'scanner-verification')) {
  throw new Error('Scanner verification requires both its isolated app environment and explicit opt-in.');
}
const variant = variants[environment as keyof typeof variants];
const recognitionExperiment = process.env.COSI_RECOGNITION_EXPERIMENT === '1';
if (recognitionExperiment !== (environment === 'recognition-verification')) {
  throw new Error('Recognition verification requires both its isolated app environment and explicit opt-in.');
}
const cameraProofValue = process.env.EXPO_PUBLIC_RECOGNITION_CAMERA_PROOF;
if (cameraProofValue !== undefined && cameraProofValue !== '0' && cameraProofValue !== '1') {
  throw new Error('Invalid recognition camera opt-in.');
}
const cameraProof = cameraProofValue === '1';
if (cameraProof && !recognitionExperiment) throw new Error('Camera proof requires both isolated recognition flags.');
const projectId = process.env.EAS_PROJECT_ID ?? '737ed99c-2c20-4612-ac80-a8a868b827cb';
const owner = process.env.EAS_OWNER ?? 'damiyxs-team';

const config: ExpoConfig = {
  name: variant.name,
  slug: 'cosi',
  version: '0.0.1',
  orientation: 'portrait',
  userInterfaceStyle: 'light',
  platforms: ['android'],
  scheme: 'retail-intelligence' + variant.suffix.replace('.', '-'),
  android: {
    // Internal application ID; final production identifier requires release review.
    package: 'com.damiyx.retailintelligence' + variant.suffix,
    versionCode: 1,
  },
  plugins: ['expo-router', 'expo-dev-client', 'expo-secure-store', ['expo-camera', { recordAudioAndroid: false, microphonePermission: false, barcodeScannerEnabled: true }], ['expo-audio', { recordAudioAndroid: false, microphonePermission: false, enableBackgroundPlayback: false, enableBackgroundRecording: false }]],
  extra: {
    appEnvironment: environment,
    scannerVerificationBuild: scannerVerification,
    ...(projectId ? { eas: { projectId } } : {}),
  },
  ...(owner ? { owner } : {}),
};

if (recognitionExperiment) {
  config.plugins = cameraProof ? ['./plugins/withRecognitionExperiment', ['expo-camera', { recordAudioAndroid: false, microphonePermission: false, barcodeScannerEnabled: false }]] : ['./plugins/withRecognitionExperiment'];
  config.android = {
    ...config.android,
    permissions: cameraProof ? ['android.permission.CAMERA'] : [],
    blockedPermissions: [
      'android.permission.INTERNET', 'android.permission.ACCESS_NETWORK_STATE',
      'android.permission.RECORD_AUDIO', 'android.permission.CAMERA',
      'android.permission.READ_EXTERNAL_STORAGE', 'android.permission.WRITE_EXTERNAL_STORAGE',
      'android.permission.READ_MEDIA_IMAGES', 'android.permission.READ_MEDIA_VIDEO',
      'android.permission.ACCESS_FINE_LOCATION', 'android.permission.ACCESS_COARSE_LOCATION',
      'android.permission.FOREGROUND_SERVICE', 'android.permission.FOREGROUND_SERVICE_DATA_SYNC',
      'android.permission.SYSTEM_ALERT_WINDOW', 'android.permission.VIBRATE',
    ].filter(permission => !cameraProof || permission !== 'android.permission.CAMERA'),
  };
  config.extra = { appEnvironment: environment, recognitionExperimentBuild: true, ...(cameraProof ? { recognitionCameraProofBuild: true } : {}) };
  delete config.owner;
}

export default config;

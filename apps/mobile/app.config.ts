import type { ExpoConfig } from 'expo/config';

const variants = {
  development: { name: 'COSI Dev', suffix: '.dev' },
  preview: { name: 'COSI Preview', suffix: '.preview' },
  production: { name: 'COSI', suffix: '' },
} as const;

const environment = process.env.EXPO_PUBLIC_APP_ENV ?? 'development';
if (!Object.hasOwn(variants, environment)) {
  throw new Error('EXPO_PUBLIC_APP_ENV must be development, preview, or production.');
}
const variant = variants[environment as keyof typeof variants];
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
  plugins: ['expo-router', 'expo-dev-client'],
  extra: {
    appEnvironment: environment,
    ...(projectId ? { eas: { projectId } } : {}),
  },
  ...(owner ? { owner } : {}),
};

export default config;

import Constants from 'expo-constants';

export type AppEnvironment = 'development' | 'preview' | 'production' | 'scanner-verification';

export function parseEnvironment(value: unknown): AppEnvironment {
  if (value === 'development' || value === 'preview' || value === 'production' || value === 'scanner-verification') {
    return value;
  }
  throw new Error('Missing or invalid application environment. Rebuild with a valid app configuration.');
}

export const appEnvironment = parseEnvironment(Constants.expoConfig?.extra?.appEnvironment);

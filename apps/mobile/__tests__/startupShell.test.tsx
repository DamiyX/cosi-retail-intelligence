import { renderRouter, screen } from 'expo-router/testing-library';

import RootLayout from '../app/_layout';
import AboutScreen from '../src/screens/AboutScreen';
import HomeScreen from '../src/screens/HomeScreen';

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { expoConfig: { extra: { appEnvironment: 'development' } } },
}));

jest.mock('../src/db/initialize', () => ({
  initializeAppDatabase: () => ({
    state: 'failed',
    code: 'MIGRATION_FAILED',
    message: 'Migration 1 (store_context) failed and was rolled back.',
  }),
}));

it('shows a diagnosable database error instead of a false ready route', async () => {
  renderRouter({ _layout: RootLayout, index: HomeScreen, about: AboutScreen });
  expect(await screen.findByText('Local database unavailable')).toBeTruthy();
  expect(screen.queryByText('Welcome')).toBeNull();
});

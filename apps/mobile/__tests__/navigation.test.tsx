import { fireEvent, renderRouter, screen, testRouter } from 'expo-router/testing-library';
import RootLayout from '../app/_layout';
import HomeScreen from '../src/screens/HomeScreen';
import AboutScreen from '../src/screens/AboutScreen';

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { expoConfig: { extra: { appEnvironment: 'development' } } },
}));

jest.mock('../src/db/initialize', () => ({
  initializeAppDatabase: () => ({ state: 'ready', schemaVersion: 1, path: 'retail.db' }),
}));

it('opens the about route from the welcome screen', async () => {
  const result = renderRouter({ _layout: RootLayout, index: HomeScreen, about: AboutScreen });
  expect(result.getPathname()).toBe('/');
  fireEvent.press(screen.getByText('About this app'));
  expect(await screen.findByText('About COSI')).toBeTruthy();
  expect(result.getPathname()).toBe('/about');
  testRouter.back();
  expect(result.getPathname()).toBe('/');
});

it('renders the about route when opened directly', async () => {
  const result = renderRouter({ _layout: RootLayout, index: HomeScreen, about: AboutScreen }, { initialUrl: '/about' });
  expect(await screen.findByText('About COSI')).toBeTruthy();
  expect(result.getPathname()).toBe('/about');
});

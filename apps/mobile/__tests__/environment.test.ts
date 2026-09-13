import { parseEnvironment } from '../src/config/environment';

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { expoConfig: { extra: { appEnvironment: 'development' } } },
}));

it.each(['development', 'preview', 'production'] as const)('accepts the %s environment', (value) => {
  expect(parseEnvironment(value)).toBe(value);
});

it.each([undefined, null, '', 'prod', 'staging'])('rejects invalid configuration: %s', (value) => {
  expect(() => parseEnvironment(value)).toThrow('Missing or invalid application environment');
});

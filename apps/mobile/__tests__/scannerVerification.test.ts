import { isScannerVerificationBuild } from '../src/features/scanning/verificationBuild';

it('requires the isolated app identity and both verification settings', () => {
  const config = { extra: { appEnvironment: 'scanner-verification', scannerVerificationBuild: true },
    android: { package: 'com.damiyx.retailintelligence.scannerverification' } };
  expect(isScannerVerificationBuild(config)).toBe(true);
  expect(isScannerVerificationBuild(null)).toBe(false);
  for (const appEnvironment of ['development', 'preview', 'production']) {
    expect(isScannerVerificationBuild({ ...config, extra: { ...config.extra, appEnvironment } })).toBe(false);
  }
  expect(isScannerVerificationBuild({ ...config, android: { package: 'com.damiyx.retailintelligence' } })).toBe(false);
  expect(isScannerVerificationBuild({ ...config, extra: { ...config.extra, scannerVerificationBuild: false } })).toBe(false);
});

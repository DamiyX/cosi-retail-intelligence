/** A separately installed internal app only; ordinary app variants remain off. */
export function isScannerVerificationBuild(config: {
  extra?: Record<string, unknown>;
  android?: { package?: string };
} | null | undefined): boolean {
  return config?.extra?.appEnvironment === 'scanner-verification'
    && config.extra.scannerVerificationBuild === true
    && config.android?.package === 'com.damiyx.retailintelligence.scannerverification';
}

import { getRandomBytes } from 'expo-crypto';
import { formatUuidV4 } from '@retail/domain';

/**
 * Android-supported client ID provider. React Native/Hermes does not
 * guarantee globalThis.crypto, so ID generation goes through Expo's
 * documented crypto module instead of assuming a WebCrypto global.
 */
export function generateMobileId(): string {
  return formatUuidV4(getRandomBytes(16));
}

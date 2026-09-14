import { isValidId } from '@retail/domain';

import { generateMobileId } from '../src/crypto/mobileIds';

jest.mock('expo-crypto', () => ({
  getRandomBytes: (byteCount: number) => new Uint8Array(byteCount).fill(0xab),
}));

describe('mobile ID provider', () => {
  it('formats Expo entropy as a version-4 UUID', () => {
    expect(generateMobileId()).toBe('abababab-abab-4bab-abab-abababababab');
    expect(isValidId(generateMobileId())).toBe(true);
  });
});

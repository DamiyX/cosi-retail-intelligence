// File contents, not a URI suffix or camera-reported dimensions, establish JPEG bounds.
export function jpegDimensions(bytes: Uint8Array): { width: number; height: number } {
  if (bytes[0] !== 255 || bytes[1] !== 216 || bytes.at(-2) !== 255 || bytes.at(-1) !== 217) throw new Error('Photo is not a complete JPEG.');
  let offset = 2;
  while (offset + 8 < bytes.length) {
    if (bytes[offset++] !== 255) throw new Error('Invalid JPEG segment.');
    const marker = bytes[offset++]!;
    const length = bytes[offset]! * 256 + bytes[offset + 1]!;
    if (length < 2 || offset + length > bytes.length) throw new Error('Invalid JPEG length.');
    if ([192, 193, 194].includes(marker)) {
      const height = bytes[offset + 3]! * 256 + bytes[offset + 4]!;
      const width = bytes[offset + 5]! * 256 + bytes[offset + 6]!;
      if (!width || !height || width > 4096 || height > 4096) throw new Error('Photo dimensions exceed bounds.');
      return { width, height };
    }
    offset += length;
  }
  throw new Error('Photo dimensions unavailable.');
}

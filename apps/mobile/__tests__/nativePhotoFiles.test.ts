import { createNativePhotoFiles, discardCameraCapture } from '../src/media/nativePhotoFiles';
const mockEntries = new Map<string, { bytes: Uint8Array; checksum: string }>();
let mockFree = 100000000;
const mockJpeg = Uint8Array.from([255,216,255,192,0,11,8,0,100,0,200,1,1,17,0,255,217]);
jest.mock('expo-file-system', () => {
  class File {
    uri: string;
    constructor(...parts: (string | { uri: string })[]) { this.uri = parts.map(p => typeof p === 'string' ? p : p.uri).join('/'); }
    get exists() { return mockEntries.has(this.uri); }
    get size() { return mockEntries.get(this.uri)?.bytes.length ?? 0; }
    get md5() { return mockEntries.get(this.uri)?.checksum ?? null; }
    bytesSync() { return mockEntries.get(this.uri)!.bytes; }
    copySync(destination: File) { if (destination.exists) throw new Error('Already exists'); mockEntries.set(destination.uri, { ...mockEntries.get(this.uri)! }); }
    moveSync(destination: File) { if (destination.exists) throw new Error('Already exists'); mockEntries.set(destination.uri, mockEntries.get(this.uri)!); mockEntries.delete(this.uri); this.uri = destination.uri; }
    delete() { mockEntries.delete(this.uri); }
  }
  class Directory { uri: string; constructor(...parts: (string | { uri: string })[]) { this.uri = parts.map(p => typeof p === 'string' ? p : p.uri).join('/'); } create() {} get exists() { return true; } list() { return []; } }
  return { File, Directory, Paths: { document: { uri: 'file:///documents' }, cache: { uri: 'file:///cache' }, get availableDiskSpace() { return mockFree; } } };
});
beforeEach(() => { mockFree = 100000000; mockEntries.clear(); mockEntries.set('file:///cache/capture.jpg', { bytes: mockJpeg, checksum: 'same-content' }); });
const key = '00000000-0000-4000-8000-000000001000.jpg';
it('copies verified bounded capture outside cache using generated names and retains source cache separately', () => {
  const files = createNativePhotoFiles();
  expect(files.stage('file:///cache/capture.jpg', key)).toMatchObject({ size: 17, width: 200, height: 100 });
  expect(files.uri(key)).toBe('file:///documents/product-photos/' + key);
  expect(mockEntries.has(files.uri(key) + '.part')).toBe(false);
  expect(mockEntries.has('file:///cache/capture.jpg')).toBe(true);
});
it('low storage and malformed images produce no durable attachment file', () => {
  const files = createNativePhotoFiles();
  mockFree = 1;
  expect(() => files.stage('file:///cache/capture.jpg', key)).toThrow('storage');
  expect(mockEntries.size).toBe(1);
  mockFree = 100000000;
  mockEntries.set('file:///cache/capture.jpg', { bytes: Uint8Array.from([1,2,3]), checksum: 'bad' });
  expect(() => files.stage('file:///cache/capture.jpg', key)).toThrow('JPEG');
  expect(mockEntries.size).toBe(1);
});
it('rejects arbitrary sources, traversal and scanned text as path components', () => {
  const files = createNativePhotoFiles();
  for (const uri of ['https://example.com/photo.jpg','file:///documents/private.jpg','file:///cache/../private.jpg','file:///cache/%2e%2e/private.jpg']) expect(() => files.stage(uri, key)).toThrow('cache');
  expect(() => files.uri('../../barcode.jpg')).toThrow('key');
});

it('rejects high-detail bytes and dimensions at the native copy boundary, before creating a durable file', () => {
  const files = createNativePhotoFiles();
  const bytes = new Uint8Array(307201); bytes.set(mockJpeg.slice(0, -2)); bytes.set([255, 217], bytes.length - 2);
  mockEntries.set('file:///cache/capture.jpg', { bytes, checksum: 'oversize' });
  expect(() => files.stage('file:///cache/capture.jpg', key)).toThrow('bounds');
  const dimensions = mockJpeg.slice(); dimensions[9] = 4; dimensions[10] = 1;
  mockEntries.set('file:///cache/capture.jpg', { bytes: dimensions, checksum: 'too-wide' });
  expect(() => files.stage('file:///cache/capture.jpg', key)).toThrow('bounds');
  expect(mockEntries.size).toBe(1);
});

it('cleans only the tracked native capture URI and preserves unrelated cache and committed files', () => {
  const capture = 'file:///cache/Camera/' + key;
  const committed = 'file:///documents/product-photos/' + key;
  const unrelated = 'file:///cache/Camera/other-task.jpg';
  for (const uri of [capture, committed, unrelated]) mockEntries.set(uri, { bytes: mockJpeg, checksum: uri });
  discardCameraCapture(committed); discardCameraCapture(unrelated); discardCameraCapture('file:///cache/Camera/../capture.jpg');
  expect(mockEntries.has(committed)).toBe(true); expect(mockEntries.has(unrelated)).toBe(true);
  discardCameraCapture(capture);
  expect(mockEntries.has(capture)).toBe(false);
  expect(mockEntries.has('file:///cache/capture.jpg')).toBe(true);
  expect(mockEntries.has(committed)).toBe(true); expect(mockEntries.has(unrelated)).toBe(true);
});

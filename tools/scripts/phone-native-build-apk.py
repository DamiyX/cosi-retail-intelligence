"""Static APK inventory: assets, DEX class definitions and every ELF load segment."""
import hashlib
import json
import pathlib
import struct
import sys
import zipfile

apk = pathlib.Path(sys.argv[1]).resolve()
out = pathlib.Path(sys.argv[2]).resolve()
sha = lambda b: hashlib.sha256(b).hexdigest()

def dex_classes(data):
    if not data.startswith(b'dex\n'):
        raise ValueError('Not a standard DEX payload')
    strings_count, strings_offset = struct.unpack_from('<II', data, 56)
    types_count, types_offset = struct.unpack_from('<II', data, 64)
    classes_count, classes_offset = struct.unpack_from('<II', data, 96)
    strings = []
    for i in range(strings_count):
        position = struct.unpack_from('<I', data, strings_offset + i * 4)[0]
        for _ in range(5):
            b = data[position]; position += 1
            if b < 128:
                break
        strings.append(data[position:data.index(b'\0', position)].decode('utf-8', errors='replace'))
    types = [strings[struct.unpack_from('<I', data, types_offset + i * 4)[0]] for i in range(types_count)]
    method_count, method_offset = struct.unpack_from('<II', data, 88)
    methods = [struct.unpack_from('<HHI', data, method_offset + i * 8) for i in range(method_count)]
    native_methods = []
    def uleb(position):
        value = 0
        for shift in range(0, 35, 7):
            byte = data[position]; position += 1; value |= (byte & 127) << shift
            if byte < 128:
                return value, position
        raise ValueError('Invalid DEX integer')
    for i in range(classes_count):
        position = struct.unpack_from('<I', data, classes_offset + i * 32 + 24)[0]
        if not position:
            continue
        counts = []
        for _ in range(4):
            count, position = uleb(position); counts.append(count)
        for _ in range(counts[0] + counts[1]):
            _, position = uleb(position); _, position = uleb(position)
        for count in counts[2:]:
            method_index = 0
            for _ in range(count):
                delta, position = uleb(position); method_index += delta
                flags, position = uleb(position); _, position = uleb(position)
                if flags & 0x100:
                    class_index, prototype, name_index = methods[method_index]
                    native_methods.append(dict(className=types[class_index], method=strings[name_index], prototype=prototype, static=bool(flags & 8)))
    return dict(classes=[types[struct.unpack_from('<I', data, classes_offset + i * 32)[0]] for i in range(classes_count)],
                typeReferences=types, nativeMethods=native_methods)

def elf_load_segments(data):
    if data[:4] != b'\x7fELF' or data[4:6] != b'\x02\x01':
        raise ValueError('Expected arm64 ELF64 little endian')
    if struct.unpack_from('<H', data, 18)[0] != 183:
        raise ValueError('Expected AArch64 machine')
    table = struct.unpack_from('<Q', data, 32)[0]
    width, count = struct.unpack_from('<HH', data, 54)
    rows = []
    for i in range(count):
        kind, flags, offset, virtual, physical, file_size, memory_size, align = struct.unpack_from('<IIQQQQQQ', data, table + i * width)
        if kind == 1:
            rows.append(dict(offset=offset, virtual=virtual, fileBytes=file_size, memoryBytes=memory_size,
                             alignment=align, compatible16KB=align >= 16384 and offset % 16384 == virtual % 16384))
    return rows

inventory, native, classes, type_references, native_methods = [], [], [], [], []
with apk.open('rb') as raw, zipfile.ZipFile(apk) as archive:
    for entry in archive.infolist():
        data = archive.read(entry)
        raw.seek(entry.header_offset)
        header = raw.read(30)
        name_bytes, extra_bytes = struct.unpack_from('<HH', header, 26)
        data_offset = entry.header_offset + 30 + name_bytes + extra_bytes
        inventory.append(dict(path=entry.filename, bytes=len(data), compressedBytes=entry.compress_size,
                              compression=entry.compress_type, dataOffset=data_offset, sha256=sha(data)))
        if entry.filename.startswith('lib/') and entry.filename.endswith('.so'):
            assert entry.filename.startswith('lib/arm64-v8a/'), 'Unexpected ABI'
            segments = elf_load_segments(data)
            native.append(dict(path=entry.filename, bytes=len(data), sha256=sha(data), loadSegments=segments,
                               allLoads16KB=all(s['compatible16KB'] for s in segments),
                               zipUncompressed=entry.compress_type == 0, zipAligned16KB=data_offset % 16384 == 0))
        if entry.filename.endswith('.dex'):
            dex = dex_classes(data)
            classes.extend(dex['classes']); type_references.extend(dex['typeReferences']); native_methods.extend(dex['nativeMethods'])
assert native and all(n['allLoads16KB'] and n['zipUncompressed'] and n['zipAligned16KB'] for n in native)
assert not any(c.startswith('Lcom/google/android/play/') or c.startswith('Lcom/google/android/gms/') for c in classes)
assert not any(c.startswith('Lcom/google/android/play/') or c.startswith('Lcom/google/android/gms/') for c in type_references)
model = next(x for x in inventory if x['path'] == 'assets/recognition-experiment/mobilenet_v3_small.tflite')
assert model['bytes'] == 4117670 and model['sha256'] == 'bbbb4c51a55a53905af1daec995ca1aae355046f8839bb8c9f5ce9271394bc40'
result = dict(apk=str(apk), bytes=apk.stat().st_size, sha256=sha(apk.read_bytes()), inventory=inventory,
              native=native, classes=sorted(classes), typeReferences=sorted(set(type_references)), nativeMethods=native_methods,
              nativeBytes=sum(n['bytes'] for n in native),
              model=model, staticOnly=True, deviceInferenceExecuted=False)
out.write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps({k: result[k] for k in ['apk', 'bytes', 'sha256', 'nativeBytes', 'staticOnly', 'deviceInferenceExecuted']}))

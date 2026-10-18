"""IJ-01 generated pixels only; never reads a private study or model."""
import importlib.util
import io
import json
import os
from pathlib import Path
import struct
import subprocess
import sys
import unittest
from unittest.mock import patch
import uuid

import numpy as np
from PIL import Image
import producer as current

EVIDENCE = Path(os.environ.get("IJ01_EVIDENCE_ROOT", str(current.RUNS / "ij01-generated")))
EVIDENCE.mkdir(parents=True, exist_ok=True)
RUN = EVIDENCE / ("generated-tests-" + uuid.uuid4().hex)
RUN.mkdir()
before_path = os.environ.get("IJ01_BEFORE_SOURCE")
if before_path:
    spec = importlib.util.spec_from_file_location("ij01_before", before_path)
    subject = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(subject)
else:
    subject = current

TAGS = [(0x0a01, b"Image_UTC_Data", b"0" * 13),
        (0x0aa1, b"MCC_Data", b"0" * 3),
        (0x0c61, b"Camera_Capture_Mode_Info", b"0")]
SCENE = (0x0d21, b"Camera_Scene_Info", b"00")


def jpeg(orientation=1, progressive=False, size=(224, 224), restart=False):
    y, x = np.indices((size[1], size[0]))
    pixels = np.stack(((x * 11 + y * 3) % 256, (y * 7) % 256, (x + y * 19) % 256), axis=-1).astype(np.uint8)
    exif = Image.Exif(); exif[274] = orientation
    stream = io.BytesIO()
    Image.fromarray(pixels).save(stream, format="JPEG", quality=93, subsampling=0,
                               progressive=progressive, exif=exif,
                               **({"restart_marker_blocks": 2} if restart else {}))
    return stream.getvalue()


def trailer(records=None, version=107):
    records = TAGS if records is None else records
    blocks = [struct.pack("<HHI", 0, tag, len(name)) + name + payload for tag, name, payload in records]
    total = sum(map(len, blocks)); cursor = 0; entries = []
    for (tag, _, _), block in zip(records, blocks):
        entries.append(struct.pack("<HHII", 0, tag, total - cursor, len(block)))
        cursor += len(block)
    directory = b"SEFH" + struct.pack("<II", version, len(blocks)) + b"".join(entries)
    return b"".join(blocks) + directory + struct.pack("<I", len(directory)) + b"SEFT"


def oracle(primary):
    # Independently express the existing numeric recipe against PRIMARY pixels.
    with Image.open(io.BytesIO(primary), formats=["JPEG"]) as image:
        orientation = image.getexif().get(274, 1)
        a = np.asarray(image.convert("RGB"))
    transforms = {1: a, 2: a[:, ::-1], 3: a[::-1, ::-1], 4: a[::-1],
                  5: a.transpose(1, 0, 2), 6: np.rot90(a, 3),
                  7: a.transpose(1, 0, 2)[::-1, ::-1], 8: np.rot90(a, 1)}
    a = transforms[orientation]
    h, w = a.shape[:2]; factor = min(224 / w, 224 / h)
    fit = (int(w * factor + .5), int(h * factor + .5))
    resized = Image.fromarray(a).resize(fit, Image.Resampling.LANCZOS)
    expected = np.full((224, 224, 3), 128, np.uint8)
    left = (224 - fit[0]) // 2; top = (224 - fit[1]) // 2
    expected[top:top + fit[1], left:left + fit[0]] = np.asarray(resized)
    return expected.astype(np.float32).reshape(1, 224, 224, 3) / np.float32(255), expected.tobytes()


def mutate_tail(primary, tail, at, replacement):
    b = bytearray(tail); b[at:at + len(replacement)] = replacement
    return primary + bytes(b)


class Containers(unittest.TestCase):
    def equivalent(self, primary, tail):
        wanted, pixels = oracle(primary)
        bare, thumbnail, bare_details = subject.preprocess(primary)
        tensor, wrapped_thumb, details = subject.preprocess(primary + tail)
        np.testing.assert_array_equal(bare, wanted)
        np.testing.assert_array_equal(tensor, wanted)
        self.assertEqual(tensor.dtype, np.dtype("<f4"))
        self.assertEqual(details["pixelSha256"], subject.digest(pixels))
        self.assertEqual(details["tensorSha256"], subject.digest(wanted.tobytes()))
        self.assertEqual(wrapped_thumb, thumbnail)
        self.assertEqual(details["pixelSha256"], bare_details["pixelSha256"])
        with Image.open(io.BytesIO(wrapped_thumb)) as image:
            self.assertFalse(image.info)

    def test_strict_baseline_and_progressive(self):
        for progressive in (False, True):
            data = jpeg(progressive=progressive)
            tensor, _, _ = subject.preprocess(data)
            np.testing.assert_array_equal(tensor, oracle(data)[0])

    def test_portrait_landscape_odd_padding_wrappers(self):
        for size in [(101, 224), (224, 101), (1, 3)]:
            self.equivalent(jpeg(size=size), trailer(TAGS + [SCENE]))

    def test_exif_thumbnail_eoi_is_not_primary_boundary(self):
        primary = jpeg(); embedded = jpeg(size=(8, 8))
        # Little-endian TIFF IFD0 orientation, followed by IFD1 JPEG thumbnail.
        tiff = b"II" + struct.pack("<HI", 42, 8)
        tiff += struct.pack("<H", 1) + struct.pack("<HHI", 274, 3, 1) + struct.pack("<H", 1) + b"\0\0" + struct.pack("<I", 26)
        tiff += struct.pack("<H", 2) + struct.pack("<HHII", 513, 4, 1, 56) + struct.pack("<HHII", 514, 4, 1, len(embedded)) + b"\0" * 4 + embedded
        payload = b"Exif\0\0" + tiff
        # Omit original EXIF to avoid duplicate orientation sources.
        app = primary.index(b"\xff\xe1"); length = int.from_bytes(primary[app + 2:app + 4], "big")
        data = primary[:app] + b"\xff\xe1" + struct.pack(">H", len(payload) + 2) + payload + primary[app + 2 + length:]
        self.assertGreater(data.count(b"\xff\xd9"), 1)
        self.equivalent(data, trailer())

    def test_entropy_stuffing_and_restart_sequences(self):
        data = jpeg(restart=True)
        self.assertIn(b"\xff\x00", data)
        self.assertIn(b"\xff\xdd", data)
        self.assertIn(b"\xff\xd0", data)
        self.equivalent(data, trailer())

    def test_metadata_digits_and_directory_order_cannot_change_tensor(self):
        records = [(tag, name, b"9" * len(payload)) for tag, name, payload in reversed(TAGS + [SCENE])]
        self.equivalent(jpeg(), trailer(records))

    def test_numeric_recipe_descriptor_unchanged(self):
        self.assertEqual(subject.RECIPE, current.RECIPE)
        self.assertEqual(subject.RECIPE_SHA, current.RECIPE_SHA)

    def test_non_image_tail_never_reaches_decoder(self):
        primary = jpeg(); opened = []
        real_open = Image.open
        def capture(stream, *args, **kwargs):
            opened.append(stream.getvalue())
            return real_open(stream, *args, **kwargs)
        with patch("PIL.Image.open", capture):
            subject.preprocess(primary + trailer())
        self.assertTrue(opened)
        self.assertTrue(all(data == primary for data in opened))

    def test_oversized_direct_input(self):
        data = jpeg() + b"0" * subject.RECIPE["maxBytes"]
        with self.assertRaises(Exception): subject.preprocess(data)

    def test_buffered_original_hash_not_primary_hash(self):
        primary = jpeg(); data = primary + trailer(); path = RUN / "original.jpg"; path.write_bytes(data)
        self.assertEqual(subject.buffered(path, RUN, subject.digest(data)), data)
        with self.assertRaises(subject.Blocked): subject.buffered(path, RUN, subject.digest(primary))
        with self.assertRaises(subject.Blocked): subject.buffered(path, RUN, limit=len(data) - 1)
        self.assertEqual(path.read_bytes(), data)

    def test_input_changed_between_stat_and_open(self):
        path = RUN / "changed.jpg"; path.write_bytes(jpeg() + trailer())
        real = Path.open; changes = []
        def altered(p, *args, **kwargs):
            if p == path and args and args[0] == "rb":
                replacement = p.with_name("replacement.jpg")
                replacement.write_bytes(jpeg(orientation=2) + trailer())
                os.replace(replacement, p); changes.append(1)
            return real(p, *args, **kwargs)
        with patch.object(Path, "open", altered):
            with self.assertRaises(subject.Blocked): subject.buffered(path, RUN)
        self.assertEqual(changes, [1])

    def test_reparse_junction_is_not_input_authority(self):
        if os.name != "nt": self.skipTest("Windows junction boundary")
        target = RUN / "junction-target"; target.mkdir(); (target / "image.jpg").write_bytes(jpeg() + trailer())
        link = RUN / "junction-link"
        self.assertTrue(target.is_relative_to(EVIDENCE) and link.is_relative_to(EVIDENCE))
        result = subprocess.run(["cmd", "/c", "mklink", "/J", str(link), str(target)], capture_output=True)
        self.assertEqual(result.returncode, 0)
        with self.assertRaises(subject.Blocked): subject.buffered(link / "image.jpg", RUN)

    def test_real_worker_decode_failures_keep_forty_rows(self):
        self.worker_accounting(bad=True)

    def test_real_worker_wrappers_preserve_full_buffer_ids_and_hashes(self):
        self.worker_accounting(bad=False)

    def test_real_worker_changed_hash_stops_and_keeps_remaining_rows(self):
        self.worker_accounting(changed=True)

    def worker_accounting(self, bad=False, changed=False):
        folder = RUN / ("worker-" + uuid.uuid4().hex); folder.mkdir()
        entries = []; jobs = []
        for i in range(40):
            data = jpeg(orientation=i % 8 + 1) + trailer(TAGS + ([SCENE] if i % 2 else []))
            if bad and i in [1, 19, 37]: data += b"arbitrary"
            path = folder / (str(i) + ".jpg"); path.write_bytes(data)
            sha = "0" * 64 if changed and i == 0 else subject.digest(data)
            entries.append(dict(id="g" + str(i), asset=dict(path=path.name, sha256=sha)))
            jobs.append(subject.packed(dict(id="g" + str(i), path=str(path), root=str(folder), sha256=sha)))
        class Pipe:
            def __init__(self): self.jobs = iter(jobs + [b"null"]); self.messages = []
            def recv_bytes(self, *args): return next(self.jobs)
            def send_bytes(self, data): self.messages.append(data)
            def close(self): pass
        class Interpreter:
            calls = 0
            def set_tensor(self, index, tensor): self.calls += 1
            def invoke(self): pass
            def get_tensor(self, index): return np.ones((1, 1024), dtype=np.float32)
        pipe = Pipe(); interpreter = Interpreter()
        with patch.object(subject, "cpu_interpreter", return_value=(interpreter, 0, 0)):
            subject.worker(pipe, b"generated-no-model")
        messages = iter(pipe.messages[1:])
        class Replay:
            def send_bytes(self, data): pass
            def poll(self, limit): return True
            def recv_bytes(self, limit): return next(messages)
        out = folder / "out"; out.mkdir()
        records, _ = subject.collect(Replay(), None, entries, folder, out)
        self.assertEqual(len(records), 40)
        self.assertEqual([r["id"] for r in records], [e["id"] for e in entries])
        self.assertEqual([r["assetSha256"] for r in records], [e["asset"]["sha256"] for e in entries])
        expected = ["INPUT_CHANGED"] + ["NOT_RUN"] * 39 if changed else ["DECODE_ERROR" if bad and i in [1, 19, 37] else "vector" for i in range(40)]
        self.assertEqual([r.get("code", r["kind"]) for r in records], expected)
        self.assertEqual(interpreter.calls, 0 if changed else 37 if bad else 40)


for orientation in range(1, 9):
    for progressive in (False, True):
        def positive(self, o=orientation, p=progressive):
            self.equivalent(jpeg(o, p), trailer(TAGS + ([SCENE] if p else [])))
        setattr(Containers, f"test_wrapper_orientation_{orientation}_{'progressive' if progressive else 'baseline'}", positive)


def negative_cases():
    primary = jpeg(); tail = trailer(); directory = len(tail) - 8 - 48
    u32 = lambda value: struct.pack("<I", value)
    cases = {
        "arbitrary_suffix": primary + b"anything",
        "polyglot_eoi_suffix": primary + b"PK\x03\x04payload\xff\xd9",
        "second_jpeg": primary + jpeg(),
        "suffix_before_sef": primary + b"hidden" + tail,
        "suffix_after_sef": primary + tail + b"hidden",
        "two_sef_blocks": primary + tail + tail,
        "footer_only": primary + b"SEFT",
        "forged_empty_directory": primary + b"SEFH" + struct.pack("<III", 107, 0, 12) + b"SEFT",
        "version": primary + trailer(version=101),
        "unknown_tag": primary + trailer(TAGS + [(0x0a30, b"MotionPhoto_Data", b"ftyp")]),
        "duplicate_tag": primary + trailer(TAGS + [TAGS[0]]),
        "wrong_name": primary + trailer([(TAGS[0][0], b"wrong", TAGS[0][2])] + TAGS[1:]),
        "wrong_payload_length": primary + trailer([(TAGS[0][0], TAGS[0][1], b"0" * 12)] + TAGS[1:]),
        "payload_polyglot": primary + trailer([(TAGS[0][0], TAGS[0][1], b"PK\x03\x04" + b"0" * 9)] + TAGS[1:]),
        "truncated_footer": primary + tail[:-1],
        "oversized_trailer": primary + b"0" * 257 + tail,
        "footer_overflow": mutate_tail(primary, tail, len(tail) - 8, u32(0xffffffff)),
        "count_overflow": mutate_tail(primary, tail, directory + 8, u32(0xffffffff)),
        "directory_size_mismatch": mutate_tail(primary, tail, len(tail) - 8, u32(49)),
        "offset_overflow": mutate_tail(primary, tail, directory + 16, u32(0xffffffff)),
        "length_overflow": mutate_tail(primary, tail, directory + 20, u32(0xffffffff)),
        "negative_offset_result": mutate_tail(primary, tail, directory + 16, u32(directory + 1)),
        "overlap": mutate_tail(primary, tail, directory + 28, u32(directory)),
        "gap": mutate_tail(primary, tail, directory + 16, u32(directory - 1)),
        "record_header_mismatch": mutate_tail(primary, tail, 0, b"\x01\x00"),
        "directory_flags": mutate_tail(primary, tail, directory + 12, b"\x01\x00"),
        "name_length_overflow": mutate_tail(primary, tail, 4, u32(0xffffffff)),
        "missing_required_scalar": primary + trailer(TAGS[1:] + [SCENE]),
        "truncated_primary_before_eoi": primary[:-2] + tail,
        "wrong_primary_marker_length": primary[:4] + b"\xff\xff" + primary[6:] + tail,
        "jpeg_header_only": b"\xff\xd8\xff\xd9" + tail,
        "duplicate_soi": primary[:2] + b"\xff\xd8" + primary[2:] + tail,
    }
    restart = jpeg(restart=True); at = restart.index(b"\xff\xd0")
    cases["wrong_restart_order"] = restart[:at + 1] + b"\xd2" + restart[at + 2:] + tail
    dri = restart.index(b"\xff\xdd")
    cases["restart_without_interval"] = restart[:dri] + restart[dri + 6:] + tail
    progressive = jpeg(progressive=True); at = progressive.index(b"\xff\xda")
    cases["malformed_scan_length"] = progressive[:at + 2] + b"\x00\x02" + progressive[at + 4:] + tail
    return cases


for name, data in negative_cases().items():
    def reject(self, data=data):
        with self.assertRaises(Exception): subject.preprocess(data)
    setattr(Containers, "test_reject_" + name, reject)


if __name__ == "__main__":
    suite = unittest.defaultTestLoader.loadTestsFromTestCase(Containers)
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    record = dict(kind="GENERATED_JPEG_CONTAINER_NOT_PRIVATE_INFERENCE", subjectSha256=current.digest(Path(subject.__file__).read_bytes()),
                  before=bool(before_path), tests=result.testsRun, failures=len(result.failures), errors=len(result.errors),
                  skipped=len(result.skipped), privatePixelsDecoded=False, realModelLoaded=False,
                  fixtureDirectory=str(RUN), failedCases=[case.id() for case, _ in result.failures + result.errors])
    (RUN / "results.json").write_text(json.dumps(record, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(record))
    sys.exit(0 if result.wasSuccessful() else 1)

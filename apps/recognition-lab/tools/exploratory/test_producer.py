"""Generated-only tests. Do not require network access or a model artifact."""
import io
import json
import multiprocessing
import os
from pathlib import Path
import tempfile
import time
import unittest
from unittest.mock import patch

import numpy as np
from PIL import Image, ImageCms
from producer import (RUNS, Blocked, RECIPE_SHA, MODEL_SHA, buffered, checked_path,
                      collect, digest, packed, preprocess, valid_vector, validate_study,
                      encode_entries, wait_for_load)
from generate_fixtures import generate


def jpeg(size=(224, 224), colour=(0, 128, 255), orientation=1, profile=None):
    im = Image.new("RGB", size, colour); exif = Image.Exif(); exif[274] = orientation
    stream = io.BytesIO(); im.save(stream, format="JPEG", quality=100, subsampling=0, exif=exif,
                                 **({"icc_profile": profile} if profile else {}))
    return stream.getvalue()


def hang(conn):
    conn.send_bytes(b"ready"); conn.recv_bytes(); time.sleep(3)


def crash(conn):
    conn.send_bytes(b"ready"); conn.recv_bytes(); conn.close(); os._exit(3)


def load_success(conn, model):
    conn.send_bytes(packed(dict(ready=True, loadMs=1)))
    try:
        while True:
            job = json.loads(conn.recv_bytes())
            conn.send_bytes(packed(dict(id=job['id'], assetSha256=job['sha256'], kind='failure', code='DECODE_ERROR')))
    except EOFError:
        conn.close()


def load_fatal(conn, model):
    conn.send_bytes(packed(dict(fatal='RUNTIME_ERROR'))); conn.close()


def load_disconnect(conn, model):
    conn.close(); os._exit(3)


def load_hang(conn, model):
    time.sleep(3)


def load_invalid(conn, model):
    conn.send_bytes(packed(dict(ready=True, loadMs=0, error='PRIVATE_PATH'))); conn.close()


class PreprocessTests(unittest.TestCase):
    def test_exact_normalization_and_hashes(self):
        data = jpeg(); tensor, thumb, d = preprocess(data)
        with Image.open(io.BytesIO(data)) as image:
            expected = np.asarray(image.convert("RGB"), dtype=np.float32) / np.float32(255)
        np.testing.assert_array_equal(tensor[0], expected)
        self.assertEqual(tensor.shape, (1, 224, 224, 3)); self.assertEqual(tensor.dtype, np.dtype("<f4"))
        self.assertEqual(d["tensorSha256"], digest(tensor.tobytes()))
        self.assertEqual(d["pixelSha256"], digest((expected * 255).astype(np.uint8).tobytes()))
        with Image.open(io.BytesIO(thumb)) as image:
            self.assertEqual(image.size, (112, 112)); self.assertFalse(image.info)

    def test_all_eight_orientations_independent_numpy_oracle(self):
        arr = np.zeros((224, 224, 3), dtype=np.uint8)
        arr[:70, :120] = (255, 0, 0); arr[70:, :120] = (0, 255, 0); arr[:, 120:] = (0, 0, 255)
        for orientation in range(1, 9):
            with self.subTest(orientation=orientation):
                stream = io.BytesIO(); exif = Image.Exif(); exif[274] = orientation
                Image.fromarray(arr).save(stream, format="JPEG", quality=100, subsampling=0, exif=exif)
                data = stream.getvalue()
                with Image.open(io.BytesIO(data)) as image:
                    a = np.asarray(image.convert("RGB"))
                oracles = {1: a, 2: a[:, ::-1], 3: a[::-1, ::-1], 4: a[::-1],
                           5: a.transpose(1, 0, 2), 6: np.rot90(a, 3),
                           7: a.transpose(1, 0, 2)[::-1, ::-1], 8: np.rot90(a, 1)}
                tensor, _, _ = preprocess(data)
                np.testing.assert_array_equal(tensor[0], oracles[orientation].astype(np.float32) / np.float32(255))

    def test_portrait_landscape_and_odd_padding(self):
        for size, bounds in [((224, 101), (61, 162)), ((101, 224), (61, 162)), ((1, 3), (74, 149))]:
            tensor, _, _ = preprocess(jpeg(size, (255, 0, 0)))
            pixels = np.rint(tensor[0] * 255).astype(np.uint8)
            start, end = bounds
            axis = pixels if size[0] < size[1] else pixels.transpose(1, 0, 2)
            self.assertTrue(np.all(axis[:, :start] == 128)); self.assertTrue(np.all(axis[:, end:] == 128))
            self.assertTrue(np.all(axis[:, start:end, 0] >= 253))

    def test_reject_truncated_png_and_invalid_orientation(self):
        stream = io.BytesIO(); Image.new("RGB", (5, 5)).save(stream, format="PNG")
        for data in [jpeg()[:-2], stream.getvalue(), jpeg(orientation=9), jpeg() + b"tail"]:
            with self.subTest(size=len(data)), self.assertRaises(ValueError): preprocess(data)

    def test_decompression_bomb_before_allocation(self):
        data = bytearray(jpeg((5, 5))); pos = data.index(b"\xff\xc0")
        data[pos + 5:pos + 9] = b"\xff\xff\xff\xff"
        with self.assertRaises(Exception): preprocess(bytes(data))

    def test_profiles_and_metadata_stripping(self):
        srgb = ImageCms.ImageCmsProfile(ImageCms.createProfile("sRGB")).tobytes()
        _, thumbnail, _ = preprocess(jpeg(profile=srgb))
        with Image.open(io.BytesIO(thumbnail)) as thumb: self.assertNotIn("icc_profile", thumb.info)
        with self.assertRaises(Exception): preprocess(jpeg(profile=b"unsupported-ICC"))

    def test_nonfinite_zero_and_wrong_shape_output(self):
        for arr in [np.zeros((1, 1024), np.float32), np.full((1, 1024), np.inf, np.float32),
                    np.full((1, 1024), np.nan, np.float32), np.ones((1024,), np.float32), np.ones((1, 1024), np.float64)]:
            with self.assertRaises(Blocked): valid_vector(arr)
        self.assertEqual(valid_vector(np.ones((1, 1024), np.float32)), [1.0] * 1024)


class FileAndStudyTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="python-tests-", dir=RUNS); self.root = Path(self.temp.name)

    def tearDown(self): self.temp.cleanup()

    def test_buffer_hash_size_traversal_and_existing_output(self):
        p = self.root / "a.jpg"; data = jpeg(); p.write_bytes(data)
        self.assertEqual(buffered(p, self.root, digest(data)), data)
        with self.assertRaises(Blocked): buffered(p, self.root, "0" * 64)
        with self.assertRaises(Blocked): buffered(p, self.root, limit=1)
        with self.assertRaises(Blocked): checked_path(self.root.parent / "outside.jpg", self.root)
        with self.assertRaises(Blocked): checked_path(p, self.root, missing=True)

    def test_hardlink_and_case_alias(self):
        p = self.root / "Case.jpg"; p.write_bytes(jpeg()); os.link(p, self.root / "linked.jpg")
        with self.assertRaises(Blocked): buffered(p, self.root)
        if os.name == "nt":
            with self.assertRaises(Blocked): checked_path(self.root / "case.jpg", self.root)

    def test_symlink(self):
        p = self.root / "a.jpg"; p.write_bytes(jpeg()); link = self.root / "link.jpg"
        try: link.symlink_to(p)
        except OSError as error: self.skipTest("Host symlink privilege unavailable: " + str(error.winerror))
        with self.assertRaises(Blocked): buffered(link, self.root)

    def test_generated_study_positive_and_corrupt_bindings(self):
        generate(self.root / "generated"); s = json.loads((self.root / "generated/study.json").read_bytes())
        validate_study(s); self.assertEqual(s["recipeSha256"], RECIPE_SHA); self.assertEqual(s["modelSha256"], MODEL_SHA)
        for mutate in [lambda x: x.update(formalAdmission=True), lambda x: x["entries"][0].update(productId="missing"),
                       lambda x: x["entries"][0]["asset"].update(path="../a.jpg"),
                       lambda x: x["entries"][0].update(exposure="query-generated"),
                       lambda x: x["entries"][0].update(physicalFamily="different")]:
            c = json.loads(packed(s)); mutate(c)
            with self.assertRaises(Blocked): validate_study(c)

    def test_actual_timeout_and_crash_keep_all_rows(self):
        entries = [dict(id="q" + str(i), asset=dict(path="a.jpg", sha256="0" * 64)) for i in range(3)]
        context = multiprocessing.get_context("spawn")
        for target, first in [(hang, "TIMEOUT"), (crash, "RUNTIME_ERROR")]:
            parent, child = context.Pipe(); proc = context.Process(target=target, args=(child,)); proc.start(); child.close()
            try:
                self.assertTrue(parent.poll(10)); self.assertEqual(parent.recv_bytes(), b"ready")
                records, _ = collect(parent, proc, entries, self.root, self.root, per_image=.5, total=3)
                self.assertEqual([r["code"] for r in records], [first, "NOT_RUN", "NOT_RUN"])
            finally:
                if proc.is_alive(): proc.terminate()
                proc.join(5); parent.close()


    def test_spawned_load_success_and_failure_causes_keep_forty_rows(self):
        entries = [dict(id='q' + str(i), asset=dict(path='a.jpg', sha256='0' * 64)) for i in range(40)]
        for target, reason in [(load_success, None), (load_fatal, 'WORKER_FATAL'),
                               (load_disconnect, 'DISCONNECTED'), (load_hang, 'TIMEOUT'),
                               (load_invalid, 'INVALID_READY')]:
            with self.subTest(reason=reason), patch('producer.worker', target):
                records, load_ms, encoding_ms, attempt_ms, cause = encode_entries(
                    entries, self.root, self.root, b'', load_timeout=.2 if target is load_hang else 10)
                self.assertEqual(len(records), 40)
                self.assertGreater(load_ms, 0)
                self.assertGreaterEqual(attempt_ms, load_ms + encoding_ms)
                self.assertEqual(cause, dict(stage='load', reason=reason) if reason else None)
                self.assertEqual([r['code'] for r in records], ['NOT_RUN' if reason else 'DECODE_ERROR'] * 40)
                if reason: self.assertEqual(encoding_ms, 0)
                else: self.assertGreater(encoding_ms, 0)

    def test_load_os_error_is_bounded(self):
        # OS errors are injected at the connection boundary; process cases above
        # use actual spawn/pipe operations rather than replacing the wait logic.
        class BrokenConnection:
            def poll(self, timeout): raise OSError('PRIVATE_PATH_AND_ERROR')
        self.assertEqual(wait_for_load(BrokenConnection()), dict(stage='load', reason='OS_ERROR'))


if __name__ == "__main__": unittest.main(verbosity=2)

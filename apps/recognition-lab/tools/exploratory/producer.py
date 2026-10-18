"""Bounded local feature production. Never discovers photos or downloads data.

Private inference requires an independently authored, exact E04 approval.
One spawned CPU worker owns one interpreter; the parent enforces deadlines.
"""
from __future__ import annotations

import argparse
import base64
import hashlib
import importlib.metadata
import io
import json
import math
import multiprocessing
import os
from pathlib import Path
import platform
import re
import stat
import sys
import time
import warnings

LAB = Path(__file__).resolve().parents[2]
RUNS = LAB / "runs" / "exploratory"
MODEL_SHA = "bbbb4c51a55a53905af1daec995ca1aae355046f8839bb8c9f5ce9271394bc40"
RECIPE = dict(version="rgb-letterbox-224-v1", size=224, resize="Pillow-12.3.0-LANCZOS",
              rounding="floor(x+0.5)", padding=[128, 128, 128], oddPadding="right-bottom",
              orientation="EXIF-274-only", colour="untagged-or-sRGB; reject-other-profiles",
              layout="NHWC", dtype="float32-le", mean=0, std=255,
              maxBytes=41943040, maxPixels=50000000)
ID = re.compile(r"^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$")
HASH = re.compile(r"^[0-9a-f]{64}$")
PATH = re.compile(r"^(?:[a-zA-Z0-9_-]+/)*[a-zA-Z0-9_.-]+\.jpg$")


class Blocked(Exception):
    pass


def packed(value):
    return json.dumps(value, separators=(",", ":"), ensure_ascii=False, allow_nan=False).encode()


def digest(data):
    return hashlib.sha256(data).hexdigest()


RECIPE_SHA = digest(packed(RECIPE))


def checked_path(path, root, directory=False, missing=False):
    p = Path(os.path.abspath(path))
    ceiling = Path(os.path.abspath(root))
    if not p.is_relative_to(ceiling) or str(p.resolve()) != str(p):
        raise Blocked("PATH_CONFINEMENT")
    for component in [*reversed(p.parents), p]:
        if not component.exists():
            if component.is_symlink():
                raise Blocked("LINKED_PATH")
            continue
        s = component.lstat()
        if stat.S_ISLNK(s.st_mode) or getattr(s, "st_file_attributes", 0) & stat.FILE_ATTRIBUTE_REPARSE_POINT:
            raise Blocked("LINKED_PATH")
        if stat.S_ISREG(s.st_mode) and s.st_nlink != 1:
            raise Blocked("HARDLINK")
        # Refuse Windows case and short-name aliases rather than treating them
        # as independently writable destinations.
        if os.name == "nt" and component.parent != component:
            if component.name not in {e.name for e in os.scandir(component.parent)}:
                raise Blocked("PATH_ALIAS")
    if missing:
        if p.exists():
            raise Blocked("OUTPUT_EXISTS")
    elif not (p.is_dir() if directory else p.is_file()):
        raise Blocked("INPUT_UNAVAILABLE")
    return p


def buffered(path, root, expected=None, limit=RECIPE["maxBytes"]):
    p = checked_path(path, root)
    before = p.stat()
    if before.st_size > limit:
        raise Blocked("INPUT_OVERSIZE")
    with p.open("rb") as f:
        opened = os.fstat(f.fileno())
        if (opened.st_dev, opened.st_ino, opened.st_nlink) != (before.st_dev, before.st_ino, 1):
            raise Blocked("INPUT_CHANGED")
        data = f.read(limit + 1)
        after = os.fstat(f.fileno())
    if len(data) > limit or (after.st_size, after.st_mtime_ns) != (opened.st_size, opened.st_mtime_ns):
        raise Blocked("INPUT_CHANGED")
    if expected and digest(data) != expected:
        raise Blocked("HASH_MISMATCH")
    return data


def json_input(path):
    data = buffered(path, LAB, limit=4 * 1024 * 1024)
    def pairs(items):
        result = {}
        for k, v in items:
            if k in result:
                raise Blocked("DUPLICATE_JSON_KEY")
            result[k] = v
        return result
    return json.loads(data, object_pairs_hook=pairs, parse_constant=lambda _: (_ for _ in ()).throw(Blocked("NONFINITE_JSON"))), digest(data)


def exact(value, keys):
    if not isinstance(value, dict) or set(value) != set(keys):
        raise Blocked("SCHEMA_KEYS")


def validate_study(s):
    exact(s, ["schemaVersion", "studyId", "kind", "formalAdmission", "modelSha256", "recipeSha256", "products", "entries"])
    if s["schemaVersion"] != 1 or s["studyId"] != "same-instance-exploration-v1" or s["formalAdmission"] is not False:
        raise Blocked("STUDY_BOUNDARY")
    if s["kind"] not in ["generated-fixture", "private-same-instance"] or s["modelSha256"] != MODEL_SHA or s["recipeSha256"] != RECIPE_SHA:
        raise Blocked("MODEL_RECIPE_BINDING")
    if len(s["products"]) != 10 or len(s["entries"]) != 40:
        raise Blocked("CARDINALITY")
    products = {}
    for p in s["products"]:
        exact(p, ["id", "label", "physicalFamily"])
        if not ID.fullmatch(p["id"]) or not ID.fullmatch(p["physicalFamily"]) or not isinstance(p["label"], str) or not 1 <= len(p["label"]) <= 120:
            raise Blocked("IDENTITY")
        products[p["id"]] = p
    if len(products) != 10 or len({p["physicalFamily"] for p in products.values()}) != 10:
        raise Blocked("DUPLICATE_IDENTITY")
    for e in s["entries"]:
        exact(e, ["id", "productId", "physicalFamily", "exposure", "role", "asset"])
        exact(e["asset"], ["path", "sha256"])
        if not ID.fullmatch(e["id"]) or not ID.fullmatch(e["exposure"]) or e["role"] not in ["reference", "query"]:
            raise Blocked("ENTRY_ID")
        if e["productId"] not in products or e["physicalFamily"] != products[e["productId"]]["physicalFamily"]:
            raise Blocked("FAMILY_BINDING")
        if not PATH.fullmatch(e["asset"]["path"]) or any(p in [".", ".."] for p in e["asset"]["path"].split("/")) or not HASH.fullmatch(e["asset"]["sha256"]):
            raise Blocked("ASSET_BINDING")
    for key in [lambda e: e["id"], lambda e: e["asset"]["path"].lower(), lambda e: e["asset"]["sha256"]]:
        if len({key(e) for e in s["entries"]}) != 40:
            raise Blocked("DUPLICATE_ASSET")
    for p in products:
        r = [e for e in s["entries"] if e["productId"] == p and e["role"] == "reference"]
        q = [e for e in s["entries"] if e["productId"] == p and e["role"] == "query"]
        if len(r) != 2 or len(q) != 2 or {e["exposure"] for e in r} & {e["exposure"] for e in q}:
            raise Blocked("EXPOSURE_CARDINALITY")
    return s


def source_fingerprint():
    names = sorted(p for p in (LAB / "tools/exploratory").iterdir() if p.suffix in [".py", ".lock"])
    names += [LAB / "src" / (n + ".ts") for n in ["exploratoryStudy", "exploratoryEvaluation", "exploratoryReport", "exploratoryCli", "ranking", "retrievalPaths", "schema", "provenance"]]
    return digest(packed([[p.relative_to(LAB).as_posix(), digest(buffered(p, LAB))] for p in names]))


# Input acceptance policy only; the frozen numeric RECIPE is unchanged. This
# policy is bound by source_fingerprint and needs fresh independent E04/setup
# review. SEF is not authenticated provenance and never supplies image identity.
INPUT_CONTAINER_POLICY = "jpeg-primary+sef107-scalar-metadata-v1"
SEF_SCALARS = {0x0a01: (b"Image_UTC_Data", 13), 0x0aa1: (b"MCC_Data", 3),
               0x0c61: (b"Camera_Capture_Mode_Info", 1),
               0x0d21: (b"Camera_Scene_Info", 2)}


def primary_jpeg_end(data):
    """Bounded marker walk, not a pixel decoder or first/last-EOI search."""
    if len(data) > RECIPE["maxBytes"] or data[:2] != b"\xff\xd8":
        raise ValueError("STRICT_JPEG")
    pos = 2; components = None; scans = 0; markers = 0; restart_interval = 0
    sof = {0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf}
    sized = sof | {0xc4, 0xcc, 0xda, 0xdb, 0xdc, 0xdd, 0xde, 0xdf, 0xfe} | set(range(0xe0, 0xf0))
    while pos < len(data):
        markers += 1
        if markers > 65536 or data[pos] != 255:
            raise ValueError("STRICT_JPEG")
        while pos < len(data) and data[pos] == 255:
            pos += 1
        if pos >= len(data):
            raise ValueError("STRICT_JPEG")
        marker = data[pos]; pos += 1
        if marker == 0xd9:
            if components is None or not scans:
                raise ValueError("STRICT_JPEG")
            return pos
        if marker not in sized or pos + 2 > len(data):
            raise ValueError("STRICT_JPEG")
        length = int.from_bytes(data[pos:pos + 2], "big")
        if length < 2 or pos + length > len(data):
            raise ValueError("STRICT_JPEG")
        if marker in sof:
            if components is not None or length < 8:
                raise ValueError("STRICT_JPEG")
            count = data[pos + 7]
            if not 1 <= count <= 4 or length != 8 + 3 * count:
                raise ValueError("STRICT_JPEG")
            components = set(data[pos + 8:pos + length:3])
            if len(components) != count:
                raise ValueError("STRICT_JPEG")
        elif marker == 0xdd:
            if length != 4:
                raise ValueError("STRICT_JPEG")
            restart_interval = int.from_bytes(data[pos + 2:pos + 4], "big")
        elif marker == 0xda:
            if components is None or length < 6:
                raise ValueError("STRICT_JPEG")
            count = data[pos + 2]
            selected = set(data[pos + 3:pos + 3 + 2 * count:2])
            if not 1 <= count <= len(components) or length != 6 + 2 * count or len(selected) != count or not selected <= components:
                raise ValueError("STRICT_JPEG")
        pos += length
        if marker == 0xda:
            scans += 1; restart = 0; scan_start = pos
            if scans > 1024:
                raise ValueError("STRICT_JPEG")
            # Length-delimited APP/EXIF payloads were skipped above. In entropy
            # data FF00 is stuffed, RSTn is standalone, and another marker ends
            # this scan. Progressive images can enter further SOS segments.
            while True:
                start = data.find(b"\xff", pos)
                if start < 0:
                    raise ValueError("STRICT_JPEG")
                after = start + 1
                while after < len(data) and data[after] == 255:
                    after += 1
                if after >= len(data):
                    raise ValueError("STRICT_JPEG")
                code = data[after]
                if code == 0:
                    if after != start + 1:
                        raise ValueError("STRICT_JPEG")
                elif 0xd0 <= code <= 0xd7:
                    if not restart_interval or code != 0xd0 + restart:
                        raise ValueError("STRICT_JPEG")
                    restart = (restart + 1) % 8
                else:
                    if start == scan_start:
                        raise ValueError("STRICT_JPEG")
                    pos = start; break
                pos = after + 1
    raise ValueError("STRICT_JPEG")


def jpeg_container(data):
    """Return primary JPEG bytes only after exact bounded trailer validation."""
    end = primary_jpeg_end(data)
    if end == len(data):
        return data
    tail = memoryview(data)[end:]
    if not 20 <= len(tail) <= 256 or tail[-4:] != b"SEFT":
        raise ValueError("JPEG_CONTAINER")
    number = lambda at: int.from_bytes(tail[at:at + 4], "little")
    size = number(len(tail) - 8); directory = len(tail) - 8 - size
    if directory < 0 or size < 12 or tail[directory:directory + 4] != b"SEFH":
        raise ValueError("JPEG_CONTAINER")
    count = number(directory + 8)
    if number(directory + 4) != 107 or count not in (3, 4) or size != 12 + 12 * count:
        raise ValueError("JPEG_CONTAINER")
    seen = set(); spans = []
    for i in range(count):
        entry = directory + 12 + 12 * i
        word = number(entry); tag = word >> 16
        offset = number(entry + 4); length = number(entry + 8)
        # uint32 arithmetic stays mathematical (Python integers); no wraparound.
        start = directory - offset
        if word & 0xffff or tag not in SEF_SCALARS or tag in seen or start < 0 or length < 8 or start + length > directory:
            raise ValueError("JPEG_CONTAINER")
        name, payload_length = SEF_SCALARS[tag]
        if number(start) != word or number(start + 4) != len(name) or length != 8 + len(name) + payload_length or tail[start + 8:start + 8 + len(name)] != name:
            raise ValueError("JPEG_CONTAINER")
        # Validate only scalar byte shape; never interpret, retain or log values.
        if any(c < 48 or c > 57 for c in tail[start + 8 + len(name):start + length]):
            raise ValueError("JPEG_CONTAINER")
        seen.add(tag); spans.append((start, start + length))
    if seen not in ({0x0a01, 0x0aa1, 0x0c61}, set(SEF_SCALARS)):
        raise ValueError("JPEG_CONTAINER")
    cursor = 0
    for start, stop in sorted(spans):
        if start != cursor:
            raise ValueError("JPEG_CONTAINER")
        cursor = stop
    if cursor != directory:
        raise ValueError("JPEG_CONTAINER")
    # The complete original buffer was hashed/allowlisted by buffered(). No
    # trailer bytes ever reach Pillow, EXIF processing, thumbnails or encoder.
    return data[:end]


def preprocess(data):
    import numpy as np
    from PIL import Image, ImageCms, ImageFile
    if importlib.metadata.version("Pillow") != "12.3.0" or importlib.metadata.version("numpy") != "2.5.3":
        raise Blocked("SOFTWARE_VERSION")
    data = jpeg_container(data)
    Image.MAX_IMAGE_PIXELS = RECIPE["maxPixels"]
    ImageFile.LOAD_TRUNCATED_IMAGES = False
    t = time.perf_counter()
    with warnings.catch_warnings():
        warnings.simplefilter("error", Image.DecompressionBombWarning)
        with Image.open(io.BytesIO(data), formats=["JPEG"]) as image:
            if image.width * image.height > RECIPE["maxPixels"] or image.mode not in ["RGB", "L"]:
                raise ValueError("PIXELS_OR_COLOUR")
            profile = image.info.get("icc_profile")
            if profile:
                if len(profile) > 1024 * 1024:
                    raise ValueError("PROFILE_SIZE")
                cms = ImageCms.ImageCmsProfile(io.BytesIO(profile))
                if cms.profile.xcolor_space.strip() != "RGB" or ImageCms.getProfileName(cms).strip().lower() != "srgb built-in":
                    raise ValueError("UNSUPPORTED_PROFILE")
            orientation = image.getexif().get(274, 1)
            if orientation not in range(1, 9):
                raise ValueError("ORIENTATION")
            image.load()
            pixels = image.convert("RGB")
    decoded = time.perf_counter()
    from PIL import Image
    transforms = {2: Image.Transpose.FLIP_LEFT_RIGHT, 3: Image.Transpose.ROTATE_180,
                  4: Image.Transpose.FLIP_TOP_BOTTOM, 5: Image.Transpose.TRANSPOSE,
                  6: Image.Transpose.ROTATE_270, 7: Image.Transpose.TRANSVERSE, 8: Image.Transpose.ROTATE_90}
    if orientation in transforms:
        pixels = pixels.transpose(transforms[orientation])
    w, h = pixels.size
    scale = min(224 / w, 224 / h)
    fit = (max(1, min(224, math.floor(w * scale + .5))), max(1, min(224, math.floor(h * scale + .5))))
    canvas = Image.new("RGB", (224, 224), (128, 128, 128))
    canvas.paste(pixels.resize(fit, Image.Resampling.LANCZOS), ((224 - fit[0]) // 2, (224 - fit[1]) // 2))
    # Strip all metadata; only raw oriented RGB pixels reach the model.
    tensor = (np.asarray(canvas, dtype=np.float32) / np.float32(255)).reshape(1, 224, 224, 3)
    tensor = np.ascontiguousarray(tensor, dtype="<f4")
    thumb = Image.frombytes("RGB", (224, 224), canvas.tobytes()).resize((112, 112), Image.Resampling.LANCZOS)
    thumbnail = io.BytesIO(); thumb.save(thumbnail, format="PNG")
    return tensor, thumbnail.getvalue(), dict(pixelSha256=digest(canvas.tobytes()), tensorSha256=digest(tensor.tobytes()),
        decodeMs=(decoded - t) * 1000, preprocessMs=(time.perf_counter() - decoded) * 1000)


def cpu_interpreter(model):
    # The pinned Windows wheel prepends its DLL directory to process PATH on
    # import. Restore the inherited value immediately; no user/global changes.
    inherited = os.environ.get("PATH")
    try:
        from ai_edge_litert.interpreter import Interpreter, OpResolverType
    finally:
        if inherited is None:
            os.environ.pop("PATH", None)
        else:
            os.environ["PATH"] = inherited
    interpreter = Interpreter(model_content=model, num_threads=1,
        experimental_op_resolver_type=OpResolverType.BUILTIN_WITHOUT_DEFAULT_DELEGATES)
    interpreter.allocate_tensors()
    inputs = interpreter.get_input_details(); outputs = interpreter.get_output_details()
    import numpy as np
    if len(inputs) != 1 or len(outputs) != 1 or inputs[0]["shape"].tolist() != [1, 224, 224, 3] or outputs[0]["shape"].tolist() != [1, 1024] or inputs[0]["dtype"] != np.float32 or outputs[0]["dtype"] != np.float32 or inputs[0]["name"] != "serving_default_inputs:0" or outputs[0]["name"] != "StatefulPartitionedCall:0":
        raise Blocked("TENSOR_SIGNATURE")
    return interpreter, inputs[0]["index"], outputs[0]["index"]


def valid_vector(values):
    import numpy as np
    if values.shape != (1, 1024) or values.dtype != np.float32 or not np.isfinite(values).all() or not np.any(values != 0):
        raise Blocked("INVALID_OUTPUT_VECTOR")
    return values[0].tolist()


def worker(conn, model):
    try:
        t = time.perf_counter(); interpreter, input_index, output_index = cpu_interpreter(model)
        conn.send_bytes(packed(dict(ready=True, loadMs=(time.perf_counter() - t) * 1000)))
        while True:
            job = json.loads(conn.recv_bytes(4096))
            if job is None:
                break
            base = dict(id=job["id"], assetSha256=job["sha256"])
            try:
                start = time.perf_counter(); data = buffered(job["path"], job["root"], job["sha256"])
                read_ms = (time.perf_counter() - start) * 1000
                tensor, thumbnail, details = preprocess(data)
            except Blocked:
                conn.send_bytes(packed(dict(**base, kind="failure", code="INPUT_CHANGED"))); break
            except Exception:
                conn.send_bytes(packed(dict(**base, kind="failure", code="DECODE_ERROR"))); continue
            t = time.perf_counter(); interpreter.set_tensor(input_index, tensor); interpreter.invoke()
            values = valid_vector(interpreter.get_tensor(output_index))
            inference_ms = (time.perf_counter() - t) * 1000
            record = dict(**base, kind="vector", values=values, pixelSha256=details["pixelSha256"], tensorSha256=details["tensorSha256"],
                          thumbnailSha256=digest(thumbnail), timings=dict(readMs=read_ms, decodeMs=details["decodeMs"],
                          preprocessMs=details["preprocessMs"], inferenceMs=inference_ms))
            conn.send_bytes(packed(dict(record=record, thumbnail=base64.b64encode(thumbnail).decode())))
    except Exception:
        # Do not expose decoder metadata, paths or model internals in logs.
        try:
            conn.send_bytes(packed(dict(fatal="RUNTIME_ERROR")))
        except (OSError, BrokenPipeError):
            pass
    finally:
        conn.close()


def collect(conn, process, entries, root, out, per_image=60, total=900):
    started = time.perf_counter(); records = []; stopped = False
    for e in entries:
        base = dict(id=e["id"], assetSha256=e["asset"]["sha256"])
        remaining = total - (time.perf_counter() - started)
        if stopped or remaining <= 0:
            records.append(dict(**base, kind="failure", code="NOT_RUN")); stopped = True; continue
        try:
            conn.send_bytes(packed(dict(id=e["id"], sha256=e["asset"]["sha256"], path=str(root / e["asset"]["path"]), root=str(root))))
            if not conn.poll(min(per_image, remaining)):
                records.append(dict(**base, kind="failure", code="TIMEOUT")); stopped = True; process.terminate(); continue
            message = json.loads(conn.recv_bytes(1024 * 1024))
            if "fatal" in message:
                records.append(dict(**base, kind="failure", code="RUNTIME_ERROR")); stopped = True; continue
            if message.get("kind") == "failure":
                records.append(message); stopped = message["code"] == "INPUT_CHANGED"; continue
            record = message["record"]
            if record["id"] != e["id"] or record["assetSha256"] != e["asset"]["sha256"]:
                raise Blocked("WORKER_BINDING")
            thumbnail = base64.b64decode(message["thumbnail"], validate=True)
            if digest(thumbnail) != record["thumbnailSha256"] or len(thumbnail) > 200000:
                raise Blocked("WORKER_DERIVATIVE")
            with (out / ("thumb-" + e["id"] + ".png")).open("xb") as f:
                f.write(thumbnail)
            records.append(record)
        except (EOFError, OSError):
            records.append(dict(**base, kind="failure", code="RUNTIME_ERROR")); stopped = True
    return records, (time.perf_counter() - started) * 1000


def wait_for_load(conn, timeout=60):
    """Return a bounded load cause, never worker/OS exception text."""
    reason = None
    try:
        if not conn.poll(timeout):
            reason = "TIMEOUT"
        else:
            ready = json.loads(conn.recv_bytes(4096))
            if isinstance(ready, dict) and ready == {"fatal": "RUNTIME_ERROR"}:
                reason = "WORKER_FATAL"
            elif not isinstance(ready, dict) or set(ready) != {"ready", "loadMs"} or ready["ready"] is not True or type(ready["loadMs"]) not in [int, float] or not math.isfinite(ready["loadMs"]) or ready["loadMs"] < 0:
                reason = "INVALID_READY"
    except EOFError:
        reason = "DISCONNECTED"
    except OSError:
        reason = "OS_ERROR"
    except (ValueError, UnicodeError):
        reason = "INVALID_READY"
    return dict(stage="load", reason=reason) if reason else None


def encode_entries(entries, root, out, model, load_timeout=60):
    context = multiprocessing.get_context("spawn"); parent, child = context.Pipe()
    process = context.Process(target=worker, args=(child, model))
    # Parent wall time includes spawn, interpreter allocation and ready receipt.
    # encodingMs remains the image-work interval; attemptMs also includes cleanup.
    started = time.perf_counter(); started_process = False; encoding_ms = 0
    run_failure = None
    try:
        try:
            process.start(); started_process = True; child.close()
            run_failure = wait_for_load(parent, load_timeout)
        except OSError:
            run_failure = dict(stage="load", reason="OS_ERROR")
        load_ms = (time.perf_counter() - started) * 1000
        if run_failure:
            records = [dict(id=e["id"], assetSha256=e["asset"]["sha256"], kind="failure", code="NOT_RUN") for e in entries]
        else:
            records, encoding_ms = collect(parent, process, entries, root, out,
                                           total=max(0, 900 - (time.perf_counter() - started)))
    finally:
        child.close()
        if started_process:
            if process.is_alive(): process.terminate()
            process.join(5)
            if process.is_alive(): process.kill(); process.join(5)
        parent.close()
    attempt_ms = (time.perf_counter() - started) * 1000
    return records, load_ms, encoding_ms, attempt_ms, run_failure


def validate_setup(setup):
    exact(setup, ["schemaVersion", "modelSha256", "recipeSha256", "softwareSha256", "rightsReviewed", "preprocessingReviewed", "networkReviewed", "reviewer", "evidence"])
    if setup["schemaVersion"] != 1 or setup["modelSha256"] != MODEL_SHA or setup["recipeSha256"] != RECIPE_SHA or not HASH.fullmatch(setup["softwareSha256"]) or setup["rightsReviewed"] is not True or setup["preprocessingReviewed"] is not True or not isinstance(setup["networkReviewed"], bool) or not isinstance(setup["reviewer"], str) or not 1 <= len(setup["reviewer"]) <= 120 or not isinstance(setup["evidence"], list) or not 1 <= len(setup["evidence"]) <= 20 or not all(isinstance(e, str) and e for e in setup["evidence"]):
        raise Blocked("UNRESOLVED_SETUP_GATE")
    expected = {}
    for line in (LAB / "tools/exploratory/requirements.lock").read_text().splitlines():
        name, version = line.split()[0].split("==")
        expected[name] = version
    for name, version in expected.items():
        if importlib.metadata.version(name) != version:
            raise Blocked("INSTALLED_VERSION")
    actual = {d.metadata["Name"].lower().replace("_", "-") for d in importlib.metadata.distributions()}
    if actual - {n.lower().replace("_", "-") for n in expected} - {"pip", "setuptools"}:
        raise Blocked("UNREVIEWED_PACKAGE")


def produce(args):
    s, study_hash = json_input(args.study); validate_study(s)
    setup, setup_hash = json_input(args.setup); validate_setup(setup)
    software = buffered(args.software, RUNS, setup["softwareSha256"], limit=4 * 1024 * 1024)
    from inventory import inventory
    if software != packed(inventory()):
        raise Blocked("INSTALLED_FILE_DRIFT")
    source_hash = source_fingerprint()
    if not re.fullmatch(r"[a-zA-Z0-9_-]{1,64}", args.run_id):
        raise Blocked("RUN_ID")
    if s["kind"] == "private-same-instance":
        if not setup["networkReviewed"] or not args.approval:
            raise Blocked("E04_AND_NETWORK_REQUIRED")
        approval, _ = json_input(args.approval)
        exact(approval, ["status", "studySha256", "sourceSha256", "setupSha256", "softwareSha256", "runId"])
        if approval != dict(status="APPROVED_FOR_EXPLORATORY_RUN", studySha256=study_hash, sourceSha256=source_hash,
                            setupSha256=setup_hash, softwareSha256=setup["softwareSha256"], runId=args.run_id):
            raise Blocked("E04_BINDING")
    ceiling = RUNS if s["kind"] == "generated-fixture" else LAB / "private-data"
    root = checked_path(args.root, ceiling, directory=True)
    out = checked_path(args.out, RUNS, missing=True)
    checked_path(out.parent, RUNS, directory=True)
    model = buffered(args.model, RUNS, MODEL_SHA, limit=8 * 1024 * 1024)
    if len(model) != 4117670:
        raise Blocked("MODEL_SIZE")
    identities = set()
    # Preflight all hashes before decoding anything, binding the exact allowlist.
    for e in s["entries"]:
        p = checked_path(root / e["asset"]["path"], root)
        identity = (p.stat().st_dev, p.stat().st_ino)
        if identity in identities:
            raise Blocked("PHYSICAL_ALIAS")
        identities.add(identity); buffered(p, root, e["asset"]["sha256"])
    out.mkdir()  # fails rather than replacing an existing attempt
    entries = sorted(s["entries"], key=lambda e: (0 if e["role"] == "reference" else 1, e["id"]))
    records, load_ms, elapsed, attempt_ms, run_failure = encode_entries(entries, root, out, model)
    preservation = []
    for e in entries:
        try:
            after = digest(buffered(root / e["asset"]["path"], root))
        except (Blocked, OSError):
            after = "0" * 64
        preservation.append(dict(id=e["id"], before=e["asset"]["sha256"], after=after))
    if source_fingerprint() != source_hash:
        raise Blocked("SOURCE_CHANGED")
    bundle = dict(schemaVersion=1, runId=args.run_id,
        mode="GENERATED_FIXTURE" if s["kind"] == "generated-fixture" else "PRIVATE_INFERENCE",
        studySha256=study_hash, modelSha256=MODEL_SHA, recipeSha256=RECIPE_SHA, sourceSha256=source_hash,
        setupSha256=setup_hash, softwareSha256=setup["softwareSha256"], loadMs=load_ms, encodingMs=elapsed,
        attemptMs=attempt_ms, runFailure=run_failure,
        environment=dict(python=platform.python_version(), os=platform.platform(), cpu=platform.processor(), threads=1, memory="not-measured"),
        preservation=preservation, records=records)
    with (out / "bundle.json").open("xb") as f:
        f.write(packed(bundle))
    for name, data in [("study.json", buffered(args.study, LAB)), ("setup.json", buffered(args.setup, LAB)), ("software.json", software)]:
        with (out / name).open("xb") as f:
            f.write(data)
    complete = run_failure is None and all(r["kind"] == "vector" for r in records) and all(p["before"] == p["after"] for p in preservation)
    print(json.dumps(dict(mode=bundle["mode"], total=40, vectors=sum(r["kind"] == "vector" for r in records), complete=complete,
                          runFailure=run_failure, loadMs=load_ms, encodingMs=elapsed, attemptMs=attempt_ms)))
    return 0 if complete else 2


def main():
    p = argparse.ArgumentParser(description=__doc__)
    for option in ["study", "root", "model", "setup", "software", "out", "run-id"]:
        p.add_argument("--" + option, required=True)
    p.add_argument("--approval")
    try:
        return produce(p.parse_args())
    except Exception as error:
        print(str(error) if isinstance(error, Blocked) else "SETUP_BLOCKED", file=sys.stderr)
        return 1


if __name__ == "__main__":
    multiprocessing.freeze_support()
    sys.exit(main())

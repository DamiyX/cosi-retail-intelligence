"""One generated-image runtime smoke with limited process network observations.

This is not network isolation and cannot itself set networkReviewed=True.
Python audit events do not cover native socket APIs. IPv4 endpoint snapshots
do not detect transient connections or IPv6. No firewall or global changes.
"""
import argparse
import ctypes
import json
import os
from pathlib import Path
import sys
import time
from producer import (RUNS, MODEL_SHA, checked_path, buffered, cpu_interpreter,
                      preprocess, valid_vector, digest, packed)


def ipv4_endpoints():
    if os.name != "nt":
        return dict(status="unavailable", reason="Windows-only observation")
    dll = ctypes.WinDLL("iphlpapi")
    values = {}
    for kind, name, table_class, stride, pid_field in [("tcp", "GetExtendedTcpTable", 5, 24, 5),
                                                     ("udp", "GetExtendedUdpTable", 1, 12, 2)]:
        f = getattr(dll, name); size = ctypes.c_ulong(0)
        code = f(None, ctypes.byref(size), False, 2, table_class, 0)
        if code not in [0, 122]:
            return dict(status="unavailable", windowsError=code)
        buf = ctypes.create_string_buffer(size.value)
        code = f(buf, ctypes.byref(size), False, 2, table_class, 0)
        if code:
            return dict(status="unavailable", windowsError=code)
        count = int.from_bytes(buf.raw[:4], "little"); matching = []
        for i in range(count):
            row = buf.raw[4 + i * stride:4 + (i + 1) * stride]
            fields = [int.from_bytes(row[j:j+4], "little") for j in range(0, stride, 4)]
            if fields[pid_field] == os.getpid():
                matching.append(fields)
        values[kind] = matching
    return dict(status="observed-ipv4-only", **values)


def smoke(model_path, fixture, out):
    fixture = checked_path(fixture, RUNS)
    # A producer fixture's study proves origin/category; do not accept a private
    # copied JPEG merely because someone placed it in a runs directory.
    study = json.loads(buffered(fixture.parent.parent / "study.json", RUNS))
    relative = fixture.relative_to(fixture.parent.parent).as_posix()
    if study.get("kind") != "generated-fixture" or relative not in {e["asset"]["path"] for e in study["entries"]}:
        raise ValueError("GENERATED_ONLY")
    destination = checked_path(out, RUNS, missing=True)
    events = []
    def audit(event, args):
        if event.startswith("socket."):
            events.append(event)  # no addresses or sensitive metadata
            if event in ["socket.connect", "socket.connect_ex", "socket.getaddrinfo", "socket.sendto"]:
                raise RuntimeError("Python outbound operation blocked during generated smoke")
    sys.addaudithook(audit)
    before = ipv4_endpoints(); t = time.perf_counter()
    model = buffered(model_path, RUNS, MODEL_SHA); interpreter, inp, output = cpu_interpreter(model)
    load_ms = (time.perf_counter() - t) * 1000
    entry = next(e for e in study["entries"] if e["asset"]["path"] == relative)
    tensor, _, details = preprocess(buffered(fixture, RUNS, entry["asset"]["sha256"]))
    t = time.perf_counter(); interpreter.set_tensor(inp, tensor); interpreter.invoke()
    vector = valid_vector(interpreter.get_tensor(output)); inference_ms = (time.perf_counter() - t) * 1000
    after = ipv4_endpoints()
    result = dict(kind="generated-runtime-smoke", modelSha256=MODEL_SHA, outputDimension=len(vector),
                  vectorSha256=digest(packed(vector)), pixelSha256=details["pixelSha256"], tensorSha256=details["tensorSha256"],
                  loadMs=load_ms, inferenceMs=inference_ms, pythonSocketEvents=events, before=before, after=after,
                  networkGate="UNRESOLVED", limitation="Snapshots and Python audit cannot prove zero native/transient/IPv6 outbound effects.")
    with destination.open("xb") as f:
        f.write(packed(result))
    print(json.dumps(dict(kind=result["kind"], outputDimension=len(vector), networkGate="UNRESOLVED")))


if __name__ == "__main__":
    p = argparse.ArgumentParser(description=__doc__)
    for name in ["model", "fixture", "out"]: p.add_argument("--" + name, required=True)
    a = p.parse_args(); smoke(a.model, a.fixture, a.out)

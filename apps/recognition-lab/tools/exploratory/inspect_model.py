"""Read the exact official export metadata without executing the model.

Field indices are from Google's TFLite schema and MediaPipe metadata_schema.fbs.
This small reader accepts only the hash-bound artifact, never arbitrary models.
"""
import argparse
import json
import struct
from producer import RUNS, MODEL_SHA, buffered, checked_path, packed


class Tables:
    def __init__(self, data): self.data = data
    def u(self, pos): return struct.unpack_from("<I", self.data, pos)[0]
    def field(self, table, index):
        vtable = table - struct.unpack_from("<i", self.data, table)[0]
        length = struct.unpack_from("<H", self.data, vtable)[0]
        offset = struct.unpack_from("<H", self.data, vtable + 4 + index * 2)[0] if 4 + index * 2 < length else 0
        return table + offset if offset else 0
    def ref(self, pos): return pos + self.u(pos)
    def string(self, table, index):
        field = self.field(table, index)
        if not field: return None
        p = self.ref(field); return self.data[p + 4:p + 4 + self.u(p)].decode()
    def tables(self, table, index):
        field = self.field(table, index)
        if not field: return []
        p = self.ref(field)
        return [self.ref(p + 4 + i * 4) for i in range(self.u(p))]
    def floats(self, table, index):
        p = self.ref(self.field(table, index))
        return list(struct.unpack_from("<" + "f" * self.u(p), self.data, p + 4))


def inspect(path):
    data = buffered(path, RUNS, MODEL_SHA, limit=8 * 1024 * 1024)
    t = Tables(data); model = t.u(0); metadata = None
    for table in t.tables(model, 6):
        if t.string(table, 0) == "TFLITE_METADATA":
            index = t.u(t.field(table, 1)); buffer = t.tables(model, 4)[index]
            p = t.ref(t.field(buffer, 0)); metadata = data[p + 4:p + 4 + t.u(p)]
    if metadata is None or metadata[4:8] != b"M001": raise ValueError("Missing metadata")
    t = Tables(metadata); model = t.u(0)
    result = {name: t.string(model, i) for name, i in [("name", 0), ("description", 1), ("version", 2), ("author", 4), ("license", 5), ("minParser", 7)]}
    graph = t.tables(model, 3)[0]
    for key, index in [("inputs", 2), ("outputs", 3)]:
        result[key] = []
        for table in t.tables(graph, index):
            item = dict(name=t.string(table, 0), description=t.string(table, 1), normalization=[])
            for unit in t.tables(table, 4):
                tag = t.field(unit, 0)
                if tag and metadata[tag] == 1:
                    option = t.ref(t.field(unit, 1))
                    item["normalization"].append(dict(mean=t.floats(option, 0), std=t.floats(option, 1)))
            result[key].append(item)
    if result["inputs"][0]["normalization"] != [dict(mean=[0.0], std=[255.0])] or result["outputs"][0]["name"] != "feature":
        raise ValueError("Unexpected exact model preprocessing/feature metadata")
    return result


if __name__ == "__main__":
    p = argparse.ArgumentParser(description=__doc__); p.add_argument("--model", required=True); p.add_argument("--out", required=True)
    a = p.parse_args(); out = checked_path(a.out, RUNS, missing=True)
    with out.open("xb") as f: f.write(packed(inspect(a.model)))
    print("Exact export metadata inspected; normalization mean0/std255, output feature, Apache2 declaration.")

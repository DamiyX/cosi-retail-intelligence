"""Prepare a separate same-instance allowlist from existing intake records.

Reads manifests/CSV and hashes only. Does not decode or infer. Original forty
photos, old selection, excluded originals and formal records are never written.
"""
import argparse
import csv
import io
import re
from producer import LAB, RUNS, MODEL_SHA, RECIPE_SHA, checked_path, buffered, json_input, packed, validate_study


def prepare(out):
    root = LAB / "private-data/r1-pilot"
    manifest, manifest_hash = json_input(root / "dataset.json")
    if manifest_hash != "faba50bdb6ca8a963e9bf84b78478eeaded28d4a9ad120d145249579900fbf91":
        raise ValueError("REFERENCE_MANIFEST_CHANGED")
    selection = csv.DictReader(io.StringIO(buffered(root / "exploratory-revised-selection.csv", root).decode("utf-8-sig")))
    selected = list(selection)
    if len(selected) != 20:
        raise ValueError("QUERY_SELECTION")
    intake = buffered(root / "LOCAL_INTAKE.md", root).decode()
    labels = {alias.lower(): label.strip() for alias, label in re.findall(r"^\| (P\d{2}) \| ([^|]+) \|", intake, re.MULTILINE)}
    if set(labels) != {p["id"] for p in manifest["products"]}:
        raise ValueError("IDENTITY_LABEL_RECORD")
    products = [dict(id=p["id"], label=labels[p["id"]], physicalFamily="sample-" + p["id"] + "-a") for p in manifest["products"]]
    entries = [dict(id=e["id"], productId=e["productId"], physicalFamily="sample-" + e["productId"] + "-a", exposure=e["captureSession"],
                    role="reference", asset=e["asset"]) for e in manifest["entries"]]
    for row in selected:
        if row["copy_status"] != "copied-hash-verified":
            raise ValueError("COPY_NOT_VERIFIED")
        entries.append(dict(id=row["entry_id"], productId=row["product_id"], physicalFamily=row["physical_family"], exposure=row["source_family"],
                            role="query", asset=dict(path="exploratory-20261004/" + row["original_filename"], sha256=row["exact_sha256"])))
    study = validate_study(dict(schemaVersion=1, studyId="same-instance-exploration-v1", kind="private-same-instance", formalAdmission=False,
                          modelSha256=MODEL_SHA, recipeSha256=RECIPE_SHA, products=products, entries=entries))
    for e in entries:
        buffered(root / e["asset"]["path"], root, e["asset"]["sha256"])
    destination = checked_path(out, RUNS, missing=True); checked_path(destination.parent, RUNS, directory=True)
    destination.mkdir(); (destination / "study.json").write_bytes(packed(study))
    print("Prepared separate non-admitted study: 20 references / 20 queries; no decoding/inference.")


if __name__ == "__main__":
    p = argparse.ArgumentParser(description=__doc__); p.add_argument("--out", required=True)
    prepare(p.parse_args().out)

"""Fingerprint installed code/data of only the isolated locked dependencies."""
import argparse
import importlib.metadata
from pathlib import Path
import sys
from producer import LAB, RUNS, checked_path, digest, packed


def inventory():
    packages = []
    for line in (LAB / "tools/exploratory/requirements.lock").read_text().splitlines():
        name, version = line.split()[0].split("=="); dist = importlib.metadata.distribution(name)
        if dist.version != version: raise ValueError("Installed version differs")
        files = []
        for relative in sorted(dist.files, key=str):
            if str(relative).endswith(".pyc"): continue
            path = checked_path(dist.locate_file(relative), Path(sys.prefix))
            files.append(dict(path=str(relative).replace("\\", "/"), sha256=digest(path.read_bytes()), bytes=path.stat().st_size))
        packages.append(dict(name=name, version=version, wheelSha256=line.split("sha256:")[1], files=files))
    return dict(schemaVersion=1, python=sys.version, packages=packages)


if __name__ == "__main__":
    p = argparse.ArgumentParser(description=__doc__); p.add_argument("--out", required=True); a = p.parse_args()
    path = checked_path(a.out, RUNS, missing=True); value = packed(inventory())
    with path.open("xb") as f: f.write(value)
    print("Installed inventory", digest(value))

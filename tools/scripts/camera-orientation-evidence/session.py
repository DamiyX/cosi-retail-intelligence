"""Later reviewed execution only. No ADB or file effect when imported."""
import argparse
import json
from pathlib import Path
import time

from controller import CaptureTail, PinnedAdb, ROOT, digest, load, require


def main():
    parser = argparse.ArgumentParser(description="One bounded generated-chart row; no retries")
    parser.add_argument("packet", type=Path)
    parser.add_argument("charter", type=Path)
    args = parser.parse_args()
    # A charter is a guard, never authority: the actual founder/reviewer dispatch is required.
    charter = load(args.charter)
    output = Path(charter["executionDir"])
    require(output.is_absolute() and output == output.resolve() and output.is_relative_to(ROOT / "apps/recognition-lab/runs/phone-experiment") and output.is_dir(), "SCOPED_OUTPUT_DIRECTORY")
    adapter = PinnedAdb(args.packet, args.charter)
    tail = CaptureTail(adapter, adapter.packet, output)
    ready = charter["readyMonotonic"]
    pre = tail.prepare(ready)
    print(json.dumps({"status": "PRE_REVIEW_REQUIRED", "path": str(output / "pre.png"), "sha256": pre["sha256"], "qualificationDeadlineMonotonic": pre["monotonic"] + 30}), flush=True)
    decision = output / "pre-qualified.json"
    while not decision.exists() and time.monotonic() - pre["monotonic"] <= 30:
        time.sleep(0.1)
    require(decision.exists() and not decision.is_symlink(), "NO_TIMELY_PRE_SCENE_QUALIFICATION")
    qualification = load(decision)
    require(qualification.get("sceneQualified") is True and qualification.get("packetSha256") == digest(args.packet.read_bytes()) and qualification.get("preSha256") == pre["sha256"], "PRE_SCENE_REJECTED_OR_WRONG_FRAME")
    result = tail.run(ready, qualification["preSha256"])
    print(json.dumps({"status": result, "postPath": str(output / "post.png"), "cameraProofAccepted": False}), flush=True)


if __name__ == "__main__":
    main()

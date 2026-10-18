"""Create forty unmistakably generated non-private JPEG fixtures, no vectors.

Only writes to a fresh directory in ignored exploratory runs. No model needed.
"""
import argparse
import json
from producer import RUNS, MODEL_SHA, RECIPE_SHA, checked_path, digest, packed
from PIL import Image, ImageDraw


def generate(out):
    root = checked_path(out, RUNS, missing=True)
    checked_path(root.parent, RUNS, directory=True)
    root.mkdir(); (root / "assets").mkdir()
    products = []; entries = []
    for n in range(10):
        product = f"item{n:02d}"
        products.append(dict(id=product, label=f"Generated item {n}", physicalFamily=f"generated-family{n:02d}"))
        for role in ["reference", "query"]:
            for view in range(2):
                name = f"{product}-{role}{view}"
                # Every view has distinct bytes. These are generated graphics,
                # not proxy photos, SKU performance or label-assisted encoding.
                image = Image.new("RGB", (157 + n * 3, 89 + view * 40), (30 + n * 15, 20 + view * 60, 100 if role == "query" else 150))
                draw = ImageDraw.Draw(image); draw.rectangle((10 + view, 12, 55 + n, 66), fill=(220, 100 + n, 80 + view))
                draw.ellipse((65, 15 + view * 3, 110, 63), fill=(n * 18, 230, 120))
                path = "assets/" + name + ".jpg"; image.save(root / path, quality=92, exif=b"")
                entries.append(dict(id=name, productId=product, physicalFamily=f"generated-family{n:02d}", exposure=role + "-generated",
                                    role=role, asset=dict(path=path, sha256=digest((root / path).read_bytes()))))
    study = dict(schemaVersion=1, studyId="same-instance-exploration-v1", kind="generated-fixture", formalAdmission=False,
                 modelSha256=MODEL_SHA, recipeSha256=RECIPE_SHA, products=products, entries=entries)
    (root / "study.json").write_bytes(packed(study))
    print(json.dumps(dict(kind="generated-fixture", images=40)))


if __name__ == "__main__":
    p = argparse.ArgumentParser(description=__doc__); p.add_argument("--out", required=True)
    generate(p.parse_args().out)

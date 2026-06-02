from pathlib import Path
from PIL import Image

# Each tuple is (left, top, right, bottom)
CROPS_PNG = [
    (21, 154, 307, 422),
    (310, 154, 596, 422),
    (21, 431, 307, 700),
    (310, 431, 596, 700),
]

CROPS_JPG = [
    (21, 175, 318, 446),
    (319, 175, 615, 446),
    (21, 466, 319, 737),
    (337, 466, 620, 737),
]

root = Path(__file__).parent

sources = (p for pattern in ("image*.png", "image*.jpg", "image*.jpeg")
           for p in root.rglob(pattern)
           if p.stem.replace("image", "").isdigit())
for img_path in sorted(sources):
    stem = img_path.stem  # e.g. "image1"
    crops = CROPS_JPG if img_path.suffix.lower() in (".jpg", ".jpeg") else CROPS_PNG
    with Image.open(img_path) as img:
        for i, box in enumerate(crops, start=1):
            cropped = img.crop(box)
            out_path = img_path.with_name(f"{stem}_{i}.png")
            cropped.save(out_path)
            print(f"  {out_path.relative_to(root)}")
    print(f"Done: {img_path.relative_to(root)}")

---
name: crop-game-images
description: Crops student illustration scans into 4 sub-images (one per panel) for all games under apps/publishing_party/public/images/. Use when the user wants to (re)run the image cropper, adjust crop coordinates, or add new source images.
---

Crop `imageN.png` source scans into 4 panel sub-images (`imageN_1.png` … `imageN_4.png`) for every game under `apps/publishing_party/public/images/`.

## The script

The crop script lives at `apps/publishing_party/public/images/crop_images.py`. It:

1. Recursively finds files whose stem is exactly `image` + digits (e.g. `image1.png`, `image3.png`) — never previously-cropped outputs like `image1_1.png`. Supports `.png`, `.jpg`, `.jpeg`.
2. Crops each into 4 panels using `CROPS_PNG` or `CROPS_JPG` depending on file type (PIL `(left, top, right, bottom)` tuples).
3. Saves outputs as `imageN_1.png` … `imageN_4.png` alongside the source.

Current crop boxes (update these when the user asks to expand/shrink):

```python
CROPS_PNG = [
    (21, 154, 307, 422),   # top-left panel
    (310, 154, 596, 422),  # top-right panel
    (21, 431, 307, 700),   # bottom-left panel
    (310, 431, 596, 700),  # bottom-right panel
]

CROPS_JPG = [
    (21, 175, 318, 446),   # top-left panel
    (319, 175, 615, 446),  # top-right panel
    (21, 466, 319, 737),   # bottom-left panel
    (337, 466, 620, 737),  # bottom-right panel
]
```

JPGs have their own independent coordinate set — do not scale or derive them from `CROPS_PNG`.

## Running the cropper

When asked to run or rerun:

1. Update `CROPS_PNG` and/or `CROPS_JPG` in the script if the user specified coordinate changes. If the user says "just for jpgs" or "just for pngs", only update that list.
2. Delete existing outputs to avoid re-cropping outputs:
   ```
   find apps/publishing_party/public/images -name "image*_*.png" -delete
   ```
3. Run the script:
   ```
   python apps/publishing_party/public/images/crop_images.py
   ```

## Adjusting crop boxes

The user will often say things like "add N more on the right" or "shrink top by N". Apply deltas to the relevant edges across all 4 panels:

- **left**: subtract delta from the left coordinate (index 0) of all panels
- **right**: add delta to the right coordinate (index 2) of all panels
- **top**: subtract delta from the top coordinate (index 1) of the top two panels
- **bottom**: add delta to the bottom coordinate (index 3) of the bottom two panels

After updating the script, always delete old outputs and rerun.

## Dependencies

Requires Python + Pillow. If Pillow is missing, install it with `pip install Pillow` before running.

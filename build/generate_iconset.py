"""Generate a macOS .iconset from build/icon-1024.png."""

import shutil
from pathlib import Path
from PIL import Image

BUILD_DIR = Path(__file__).parent
SRC = BUILD_DIR / "icon-1024.png"
ICONSET = BUILD_DIR / "icon.iconset"

SIZES = [
    (16, "icon_16x16.png"),
    (32, "icon_16x16@2x.png"),
    (32, "icon_32x32.png"),
    (64, "icon_32x32@2x.png"),
    (128, "icon_128x128.png"),
    (256, "icon_128x128@2x.png"),
    (256, "icon_256x256.png"),
    (512, "icon_256x256@2x.png"),
    (512, "icon_512x512.png"),
    (1024, "icon_512x512@2x.png"),
]


def main() -> None:
    if ICONSET.exists():
        shutil.rmtree(ICONSET)
    ICONSET.mkdir(parents=True)

    src = Image.open(SRC).convert("RGBA")
    for size, name in SIZES:
        resized = src.resize((size, size), Image.LANCZOS)
        resized.save(ICONSET / name, format="PNG", optimize=True)
        print(f"  {name} ({size}x{size})")

    print(f"Wrote {ICONSET}")


if __name__ == "__main__":
    main()

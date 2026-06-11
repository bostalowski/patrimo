"""Generate a multi-size favicon.ico from build/icon-1024.png."""

from pathlib import Path
from PIL import Image

BUILD_DIR = Path(__file__).parent
SRC = BUILD_DIR / "icon-1024.png"
OUT = BUILD_DIR.parent / "src" / "app" / "favicon.ico"

SIZES = [(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]


def main() -> None:
    src = Image.open(SRC).convert("RGBA")
    src.save(OUT, format="ICO", sizes=SIZES)
    print(f"Wrote {OUT}")


if __name__ == "__main__":
    main()

"""Crop, square, and add alpha to the generated icon source."""

from pathlib import Path
from PIL import Image

BUILD_DIR = Path(__file__).parent
SRC = BUILD_DIR / "icon-source.png"
OUT = BUILD_DIR / "icon-1024.png"

WHITE_THRESHOLD = 240


def find_content_bbox(img: Image.Image) -> tuple[int, int, int, int]:
    rgb = img.convert("RGB")
    pixels = rgb.load()
    w, h = rgb.size
    left, top, right, bottom = w, h, 0, 0
    for y in range(h):
        for x in range(w):
            r, g, b = pixels[x, y]
            if r < WHITE_THRESHOLD or g < WHITE_THRESHOLD or b < WHITE_THRESHOLD:
                left = min(left, x)
                top = min(top, y)
                right = max(right, x)
                bottom = max(bottom, y)
    return left, top, right + 1, bottom + 1


def make_white_transparent(img: Image.Image) -> Image.Image:
    img = img.convert("RGBA")
    pixels = img.load()
    w, h = img.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = pixels[x, y]
            if r >= WHITE_THRESHOLD and g >= WHITE_THRESHOLD and b >= WHITE_THRESHOLD:
                pixels[x, y] = (r, g, b, 0)
    return img


def square_pad(img: Image.Image) -> Image.Image:
    w, h = img.size
    side = max(w, h)
    canvas = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    canvas.paste(img, ((side - w) // 2, (side - h) // 2))
    return canvas


def main() -> None:
    src = Image.open(SRC)
    bbox = find_content_bbox(src)
    cropped = src.crop(bbox)
    transparent = make_white_transparent(cropped)
    squared = square_pad(transparent)
    final = squared.resize((1024, 1024), Image.LANCZOS)
    final.save(OUT, format="PNG", optimize=True)
    print(f"Wrote {OUT} ({final.size[0]}x{final.size[1]})")


if __name__ == "__main__":
    main()

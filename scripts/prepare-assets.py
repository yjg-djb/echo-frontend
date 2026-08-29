from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets" / "source"
OUTPUT = ROOT / "assets" / "panoramas"
NAMES = (
    "courtyard-overlook-360",
    "courtyard-aerial",
    "gate-entry",
    "heart-tree",
    "hall-threshold",
    "hall-center",
    "memory-wall",
)


def prepare(name: str) -> None:
    source = SOURCE / f"{name}.png"
    target = OUTPUT / f"{name}.webp"
    thumb = OUTPUT / f"{name}-thumb.webp"

    with Image.open(source).convert("RGB") as image:
        if image.width != image.height * 2:
            image = image.resize((2048, 1024), Image.Resampling.LANCZOS)
        elif image.width != 2048:
            image = image.resize((2048, 1024), Image.Resampling.LANCZOS)

        image.save(target, "WEBP", quality=92, method=6)
        image.resize((512, 256), Image.Resampling.LANCZOS).save(
            thumb, "WEBP", quality=78, method=6
        )

        print(f"{name}: {image.width}x{image.height} -> {target.stat().st_size} bytes")


def main() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    for name in NAMES:
        prepare(name)


if __name__ == "__main__":
    main()

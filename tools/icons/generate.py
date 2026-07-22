"""
PWA 아이콘 생성 — favicon.svg의 책 글리프를 PNG로 재현한다.
manifest가 참조하는 icon-192.png / icon-512.png / maskable.

  python3 tools/icons/generate.py
"""

from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "public"

BLUE = (27, 75, 143)      # --spot
PAPER = (243, 245, 241)   # --paper
RED = (168, 52, 44)       # --gloss


def draw_icon(size: int, maskable: bool = False) -> Image.Image:
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    s = size / 64  # 64 기준 좌표를 스케일

    # 바탕: 파란 둥근 사각형. maskable은 안전영역 위해 여백 없이 꽉 채운다.
    radius = 0 if maskable else int(12 * s)
    d.rounded_rectangle([0, 0, size, size], radius=radius, fill=BLUE)

    # 펼친 책 (두 페이지) — favicon.svg 경로를 사각형으로 근사
    inset = 1.0 if maskable else 0.0
    pad = (10 + inset * 4) * s
    top = (16 + inset * 4) * s
    bot = (48 - inset * 2) * s
    mid = size / 2
    gap = 2 * s

    # 왼쪽 페이지
    d.polygon([(pad, top - 4 * s), (mid - gap, top), (mid - gap, bot), (pad, bot - 4 * s)], fill=PAPER)
    # 오른쪽 페이지
    d.polygon([(size - pad, top - 4 * s), (mid + gap, top), (mid + gap, bot), (size - pad, bot - 4 * s)], fill=PAPER)
    # 책등 (별색)
    d.line([(mid, top), (mid, bot)], fill=RED, width=max(2, int(2 * s)))
    return img


def main() -> None:
    OUT.mkdir(exist_ok=True)
    specs = [
        ("icon-192.png", 192, False),
        ("icon-512.png", 512, False),
        ("icon-maskable-512.png", 512, True),
        ("apple-touch-icon.png", 180, False),
    ]
    for name, size, maskable in specs:
        draw_icon(size, maskable).save(OUT / name)
        print(f"  {name} ({size}x{size}{' maskable' if maskable else ''})")
    print("완료:", OUT.relative_to(ROOT))


if __name__ == "__main__":
    main()

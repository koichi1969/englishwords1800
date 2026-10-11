# -*- coding: utf-8 -*-
"""アプリのアイコン画像（PNG）を作る。Pillow が必要。

    python tools/make_icons.py

作るもの（app/icons/）:
  icon-192.png, icon-512.png     … PWA 用
  icon-maskable-512.png          … Android 用（周りに余白）
  apple-touch-icon.png (180px)   … iPhone の「ホーム画面に追加」用
デザイン: 温かいオレンジの角丸の上に、白い「ふきだし」キャラクター。
"""
from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw

OUT = Path(__file__).resolve().parent.parent / "app" / "icons"
BG = (255, 107, 74)       # コーラル
BG2 = (255, 160, 90)      # グラデーションの明るい側
WHITE = (255, 255, 255)
INK = (43, 43, 59)
CHEEK = (255, 180, 170)


def gradient(size: int) -> Image.Image:
    img = Image.new("RGB", (size, size), BG)
    px = img.load()
    for y in range(size):
        t = y / max(size - 1, 1)
        for x in range(size):
            s = (x / max(size - 1, 1)) * 0.5 + t * 0.5
            px[x, y] = tuple(int(BG[i] * (1 - s) + BG2[i] * s) for i in range(3))
    return img


def draw_icon(size: int, pad_ratio: float = 0.0, rounded: bool = True) -> Image.Image:
    scale = 4  # なめらかにするため大きく描いて縮小
    S = size * scale
    base = gradient(S)
    mask = Image.new("L", (S, S), 0)
    md = ImageDraw.Draw(mask)
    if rounded:
        md.rounded_rectangle([0, 0, S - 1, S - 1], radius=int(S * 0.22), fill=255)
    else:
        md.rectangle([0, 0, S - 1, S - 1], fill=255)
    img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    img.paste(base, (0, 0), mask)

    d = ImageDraw.Draw(img)
    pad = S * pad_ratio
    # ふきだし本体
    bx0, by0 = S * 0.17 + pad * 0.6, S * 0.20 + pad * 0.6
    bx1, by1 = S * 0.83 - pad * 0.6, S * 0.70 - pad * 0.6
    d.rounded_rectangle([bx0, by0, bx1, by1], radius=int((bx1 - bx0) * 0.22), fill=WHITE)
    # しっぽ
    tx = bx0 + (bx1 - bx0) * 0.30
    d.polygon([(tx, by1 - 4), (tx + (bx1 - bx0) * 0.16, by1 - 4), (tx - (bx1 - bx0) * 0.02, by1 + (by1 - by0) * 0.26)], fill=WHITE)
    # 目
    w = bx1 - bx0
    cy = by0 + (by1 - by0) * 0.46
    r = w * 0.06
    for cx in (bx0 + w * 0.36, bx0 + w * 0.64):
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=INK)
        hr = r * 0.35
        d.ellipse([cx - r * 0.35 - hr, cy - r * 0.4 - hr, cx - r * 0.35 + hr, cy - r * 0.4 + hr], fill=WHITE)
    # ほっぺ
    cr = w * 0.045
    for cx in (bx0 + w * 0.24, bx0 + w * 0.76):
        d.ellipse([cx - cr, cy + r * 1.6 - cr, cx + cr, cy + r * 1.6 + cr], fill=CHEEK)
    # 口（にっこり）
    mx0, mx1 = bx0 + w * 0.42, bx0 + w * 0.58
    my = cy + r * 1.1
    d.arc([mx0, my - w * 0.05, mx1, my + w * 0.09], start=15, end=165, fill=INK, width=int(w * 0.03))

    return img.resize((size, size), Image.LANCZOS)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    draw_icon(192).save(OUT / "icon-192.png")
    draw_icon(512).save(OUT / "icon-512.png")
    draw_icon(512, pad_ratio=0.18, rounded=False).save(OUT / "icon-maskable-512.png")
    # iPhone はシステム側で角を丸めるので四角のまま
    draw_icon(180, rounded=False).save(OUT / "apple-touch-icon.png")
    print("作成:", ", ".join(p.name for p in sorted(OUT.glob("*.png"))))


if __name__ == "__main__":
    main()

"""
맛탐 로고 아이콘 생성기
주황색(#F97316) 위치핀 + 배경 = PWA 아이콘 192x192, 512x512 + favicon 32x32
"""
from PIL import Image, ImageDraw
import math
import os

ORANGE = (249, 115, 22)       # #F97316
WHITE  = (255, 255, 255)
BG     = (249, 115, 22)       # 배경도 주황 (아이콘용)
PIN_W  = (255, 255, 255)      # 핀 흰색

def draw_pin(draw, cx, cy, size):
    """위치 핀 그리기 (중심 cx,cy, 전체 높이 size)"""
    head_r = size * 0.32       # 핀 머리 반지름
    tail_h = size * 0.35       # 꼬리 높이
    head_cy = cy - size * 0.12  # 머리 중심 Y

    # 핀 머리 (원)
    draw.ellipse([
        cx - head_r, head_cy - head_r,
        cx + head_r, head_cy + head_r
    ], fill=PIN_W)

    # 꼬리 (삼각형)
    tip_y = head_cy + head_r + tail_h
    tri = [
        (cx - head_r * 0.6, head_cy + head_r * 0.4),
        (cx + head_r * 0.6, head_cy + head_r * 0.4),
        (cx, tip_y),
    ]
    draw.polygon(tri, fill=PIN_W)

    # 내부 원 (구멍)
    hole_r = head_r * 0.42
    draw.ellipse([
        cx - hole_r, head_cy - hole_r,
        cx + hole_r, head_cy + hole_r
    ], fill=BG)


def make_icon(size):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # 둥근 사각형 배경
    radius = size * 0.22
    draw.rounded_rectangle([0, 0, size, size], radius=radius, fill=BG)

    # 핀 (화면 중앙보다 약간 위)
    draw_pin(draw, size / 2, size / 2, size * 0.62)

    return img


def make_favicon(size=32):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    draw.rounded_rectangle([0, 0, size, size], radius=size * 0.22, fill=BG)
    draw_pin(draw, size / 2, size / 2, size * 0.7)
    return img


out_dir = os.path.join(os.path.dirname(__file__), "..", "public")

# 192x192
img192 = make_icon(192)
img192.save(os.path.join(out_dir, "pwa-icon-192.png"))
print("OK pwa-icon-192.png")

# 512x512
img512 = make_icon(512)
img512.save(os.path.join(out_dir, "pwa-icon-512.png"))
print("OK pwa-icon-512.png")

# favicon 32x32 (PNG, html에서 참조)
fav = make_favicon(32)
fav.save(os.path.join(out_dir, "favicon-32.png"))
print("OK favicon-32.png")

# favicon.ico (32x32 + 16x16 멀티사이즈)
fav16 = make_favicon(16)
fav.save(
    os.path.join(out_dir, "favicon.ico"),
    format="ICO",
    sizes=[(32, 32), (16, 16)],
    append_images=[fav16]
)
print("OK favicon.ico")

print("Done!")

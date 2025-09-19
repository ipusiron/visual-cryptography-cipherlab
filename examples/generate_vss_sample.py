from PIL import Image, ImageDraw, ImageFont
import random
import os

# --- 基本定義 ---
PATTERNS = [
    [1,1,0,0], [1,0,1,0], [1,0,0,1],
    [0,1,1,0], [0,1,0,1], [0,0,1,1]
]
BLACK = (0, 0, 0)
WHITE = (255, 255, 255)

# --- ユーティリティ ---
def is_black(px):
    """px が int / (r,g,b) / (r,g,b,a) いずれでも黒かを判定"""
    if isinstance(px, int):
        return px < 128
    if len(px) >= 3:
        r, g, b = px[:3]
        return (0.299*r + 0.587*g + 0.114*b) < 128
    return False

def load_base_image(samples_rel_path="../samples/mijinko.png"):
    """サンプル画像を読み込む"""
    if not os.path.exists(samples_rel_path):
        raise FileNotFoundError(f"Sample image not found: {samples_rel_path}")
    return Image.open(samples_rel_path).convert("RGB")

def _load_font(preferred_size):
    """フォントロード"""
    cand = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "DejaVuSans-Bold.ttf",
        "DejaVuSans.ttf",
    ]
    for path in cand:
        try:
            f = ImageFont.truetype(path, preferred_size)
            f.path = path
            return f
        except Exception:
            pass
    f = ImageFont.load_default()
    f.path = None
    return f

# --- テキスト合成（下に配置） ---
def compose_image_with_text(
    base_img: Image.Image,
    text: str = "Happy hacking!",
    position: str = "below",           # 'below' or 'right'
    gap_px: int = 12,
    margin_px: int = 12,
    width_ratio: float = 0.92,
    max_text_h_ratio: float = 0.28,
    stroke_width: int = 0      # ← デフォルトを 0 に
):
    w, h = base_img.size
    draw_probe = ImageDraw.Draw(base_img)
    font = _load_font(preferred_size=40)

    def choose_font_for_area(target_w, target_h):
        max_size = max(10, int(min(target_h, target_w) * 0.9))
        for size in range(max_size, 8, -1):
            try:
                f = ImageFont.truetype(font.path, size) if getattr(font, "path", None) else ImageFont.load_default()
            except Exception:
                f = ImageFont.load_default()
            # stroke を固定（潰れ防止）
            stroke = stroke_width
            bbox = draw_probe.textbbox((0,0), text, font=f, stroke_width=stroke)
            tw, th = bbox[2]-bbox[0], bbox[3]-bbox[1]
            if tw <= target_w and th <= target_h:
                return f, stroke, (tw, th)
        f = ImageFont.load_default()
        stroke = 1
        bbox = draw_probe.textbbox((0,0), text, font=f, stroke_width=stroke)
        return f, stroke, (bbox[2]-bbox[0], bbox[3]-bbox[1])

    if position == "right":
        text_area_w = int(w * max_text_h_ratio)
        text_area_w = max(text_area_w, 60)
        target_w = int(text_area_w - margin_px*2)
        target_h = int(h - margin_px*2)
        font_use, stroke, (tw, th) = choose_font_for_area(int(target_w*width_ratio), target_h)

        out = Image.new("RGB", (w + gap_px + text_area_w, h), WHITE)
        out.paste(base_img, (0, 0))
        draw = ImageDraw.Draw(out)
        ox = w + gap_px + margin_px + (target_w - tw)//2
        oy = margin_px + (target_h - th)//2
        draw.text((ox, oy), text, fill=BLACK, font=font_use, stroke_width=stroke, stroke_fill=BLACK)
        return out

    else:
        text_area_h = int(h * max_text_h_ratio)
        text_area_h = max(text_area_h, 40)
        target_w = int(w - margin_px*2)
        target_h = int(text_area_h - margin_px*2)
        font_use, stroke, (tw, th) = choose_font_for_area(int(target_w*width_ratio), target_h)

        out = Image.new("RGB", (w, h + gap_px + text_area_h), WHITE)
        out.paste(base_img, (0, 0))
        draw = ImageDraw.Draw(out)
        ox = margin_px + (target_w - tw)//2
        oy = h + gap_px + margin_px + (target_h - th)//2
        draw.text((ox, oy), text, fill=BLACK, font=font_use, stroke_width=stroke, stroke_fill=BLACK)
        return out

def make_secret_from_sample():
    base = load_base_image(samples_rel_path="./mijinko.png")
    secret_img = compose_image_with_text(
        base_img=base,
        text="Happy hacking!",
        position="below"  # または 'right'
    )
    return secret_img

# --- VSS 暗号化 ---
def vss_encrypt(img_rgb):
    w, h = img_rgb.size
    W, H = w*2, h*2
    shareA = Image.new("RGB", (W, H), WHITE)
    shareB = Image.new("RGB", (W, H), WHITE)
    src = img_rgb.load()
    a = shareA.load()
    b = shareB.load()

    def put_block(buf, x, y, block):
        buf[x,   y  ] = BLACK if block[0] else WHITE
        buf[x+1, y  ] = BLACK if block[1] else WHITE
        buf[x,   y+1] = BLACK if block[2] else WHITE
        buf[x+1, y+1] = BLACK if block[3] else WHITE

    for y in range(h):
        for x in range(w):
            v = is_black(src[x, y])
            p = random.choice(PATTERNS)
            inv = [1 - t for t in p]
            blockA = p
            blockB = inv if v else p
            put_block(a, x*2, y*2, blockA)
            put_block(b, x*2, y*2, blockB)

    return shareA, shareB

# --- シェア重ね合わせ ---
def overlay(shareA, shareB):
    assert shareA.size == shareB.size
    w, h = shareA.size
    out = Image.new("RGB", (w, h), WHITE)
    A = shareA.load(); B = shareB.load(); O = out.load()
    for y in range(h):
        for x in range(w):
            O[x, y] = BLACK if (is_black(A[x, y]) or is_black(B[x, y])) else WHITE
    return out

# --- メイン処理 ---
if __name__ == "__main__":
    outdir = "./"
    secret = make_secret_from_sample()
    secret.save(os.path.join(outdir, "secret.png"))
    print("Saved secret.png")

    shareA, shareB = vss_encrypt(secret)
    shareA.save(os.path.join(outdir, "shareA.png"))
    shareB.save(os.path.join(outdir, "shareB.png"))
    print("Saved shareA.png, shareB.png")

    ov = overlay(shareA, shareB)
    ov.save(os.path.join(outdir, "overlay.png"))
    print("Saved overlay.png")

    print("Done.")

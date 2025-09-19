# examples/generate_vss_sample.py
from PIL import Image, ImageDraw, ImageFont
import random
import os

# 2x2 サブピクセルパターン (1=黒, 0=白)
PATTERNS = [
    [1,1,0,0], [1,0,1,0], [1,0,0,1],
    [0,1,1,0], [0,1,0,1], [0,0,1,1]
]

BLACK = (0, 0, 0)
WHITE = (255, 255, 255)

def is_black(px):
    """px が int / (r,g,b) / (r,g,b,a) いずれでも黒かを判定"""
    if isinstance(px, int):
        return px < 128
    if len(px) >= 3:
        r, g, b = px[:3]
        return (0.299*r + 0.587*g + 0.114*b) < 128
    return False

def load_base_image(samples_rel_path="../samples/mijinko.png"):
    """samplesフォルダの画像を読み込み（存在確認）"""
    if not os.path.exists(samples_rel_path):
        raise FileNotFoundError(f"Sample image not found: {samples_rel_path}")
    img = Image.open(samples_rel_path).convert("RGB")
    return img

def draw_text_on_image(base_img, text="Happy hacking!", margin_ratio=0.06, width_ratio=0.82):
    """
    base_img 上に text をちょうど良い幅と太さで描画して返す（RGB）。
    - margin_ratio: 横の余白比率（画像幅に対する割合）
    - width_ratio: テキストが占める幅の目標比率
    """
    w, h = base_img.size
    margin = int(w * margin_ratio)
    target_width = int(w * width_ratio)  # 目標テキスト幅

    # フォント取得（環境によりパスが異なるが、DejaVuがあればそれを使う）
    font_name_candidates = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "DejaVuSans-Bold.ttf",
        "DejaVuSans.ttf",
    ]
    font = None
    for fn in font_name_candidates:
        try:
            font = ImageFont.truetype(fn, size=40)
            break
        except Exception:
            font = None
    if font is None:
        # フォールバック: デフォルトフォント（サイズ調整が限定的）
        font = ImageFont.load_default()

    draw = ImageDraw.Draw(base_img)

    # フォントサイズを動的に決定（大きめから縮めてフィットさせる）
    max_size = int(h * 0.25)  # 高さの25%を上限に
    min_size = 8
    chosen_font = None
    chosen_size = None
    for size in range(max_size, min_size - 1, -1):
        try:
            f = ImageFont.truetype(font.path, size) if hasattr(font, "path") else ImageFont.load_default()
        except Exception:
            try:
                f = ImageFont.truetype("DejaVuSans.ttf", size)
            except Exception:
                f = ImageFont.load_default()
        # stroke_width をサイズに応じて少し付ける（太さの調整）
        stroke = max(1, int(size * 0.06))
        # bbox を取得して実際の幅を計算
        bbox = draw.textbbox((0,0), text, font=f, stroke_width=stroke)
        text_w = bbox[2] - bbox[0]
        text_h = bbox[3] - bbox[1]
        if text_w <= target_width and text_h <= h * 0.6:
            chosen_font = f
            chosen_size = size
            chosen_stroke = stroke
            break

    # 万が一小さすぎて見えない場合は最小サイズを採用
    if chosen_font is None:
        chosen_size = max(min_size, int(max_size * 0.5))
        try:
            chosen_font = ImageFont.truetype(getattr(font, "path", "DejaVuSans.ttf"), chosen_size)
        except Exception:
            chosen_font = ImageFont.load_default()
        chosen_stroke = max(1, int(chosen_size * 0.06))

    # 再度bboxを取得して配置座標を決定（中央寄せ）
    bbox = draw.textbbox((0,0), text, font=chosen_font, stroke_width=chosen_stroke)
    text_w = bbox[2] - bbox[0]
    text_h = bbox[3] - bbox[1]
    x = (w - text_w) // 2
    # y は画像の上から少し下（上部に余白）、または下部に重ならないよう中央よりやや上目に配置
    y = int((h - text_h) * 0.20)

    # 背景との視認性を上げるために軽い白縁（stroke_fill）を入れるのではなく
    # 太さ（stroke_width）でテキストをはっきりさせる。
    draw.text((x, y), text, fill=BLACK, font=chosen_font, stroke_width=chosen_stroke, stroke_fill=BLACK)

    return base_img

def make_secret_from_sample():
    base = load_base_image(samples_rel_path="../samples/mijinko.png")
    secret_img = draw_text_on_image(base, text="Happy hacking!", margin_ratio=0.06, width_ratio=0.82)
    return secret_img

def vss_encrypt(img_rgb):
    """(2,2) VSSS で2枚のシェアを生成（常にRGBで処理）"""
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
            v = is_black(src[x, y])  # True=黒(文字等), False=白
            p = random.choice(PATTERNS)
            inv = [1 - t for t in p]
            blockA = p
            blockB = inv if v else p
            put_block(a, x*2, y*2, blockA)
            put_block(b, x*2, y*2, blockB)

    return shareA, shareB

def overlay(shareA, shareB):
    """2枚のシェアを論理的に重ね合わせ（黒優先OR）"""
    assert shareA.size == shareB.size
    w, h = shareA.size
    out = Image.new("RGB", (w, h), WHITE)
    A = shareA.load(); B = shareB.load(); O = out.load()
    for y in range(h):
        for x in range(w):
            O[x, y] = BLACK if (is_black(A[x, y]) or is_black(B[x, y])) else WHITE
    return out

if __name__ == "__main__":
    outdir = "./"  # Colab 上の examples/ フォルダ内に保存

    # 1) base image にテキストを載せた secret を作る
    secret = make_secret_from_sample()
    secret.save(os.path.join(outdir, "secret.png"))
    print("Saved secret.png")

    # 2) VSSS 暗号化
    shareA, shareB = vss_encrypt(secret)
    shareA.save(os.path.join(outdir, "shareA.png"))
    shareB.save(os.path.join(outdir, "shareB.png"))
    print("Saved shareA.png, shareB.png")

    # 3) 重ね合わせ（復号）を生成
    ov = overlay(shareA, shareB)
    ov.save(os.path.join(outdir, "overlay.png"))
    print("Saved overlay.png")

    print("Done.")

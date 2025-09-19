from PIL import Image, ImageDraw
import random

# 2x2 サブピクセルパターン
PATTERNS = [
    [1,1,0,0],[1,0,1,0],[1,0,0,1],
    [0,1,1,0],[0,1,0,1],[0,0,1,1]
]

def make_secret_image(text="HELLO", size=100):
    """白黒の秘密画像を作成"""
    img = Image.new("1", (size*len(text), size), 1)  # 白背景
    draw = ImageDraw.Draw(img)
    draw.text((10, 10), text, fill=0)  # 黒文字
    return img

def vss_encrypt(img):
    """2枚のシェアを生成"""
    w,h = img.size
    W,H = w*2,h*2
    shareA = Image.new("1", (W,H), 1)
    shareB = Image.new("1", (W,H), 1)
    pix = img.load()
    pixA, pixB = shareA.load(), shareB.load()

    for y in range(h):
        for x in range(w):
            v = 0 if pix[x,y] == 255 else 1  # 白=0, 黒=1
            p = random.choice(PATTERNS)
            inv = [1-b for b in p]
            if v == 0:  # 白画素: 同じパターン
                blockA, blockB = p, p
            else:       # 黒画素: 補パターン
                blockA, blockB = p, inv

            for dy in range(2):
                for dx in range(2):
                    idx = dy*2+dx
                    pixA[x*2+dx,y*2+dy] = 0 if blockA[idx] else 1
                    pixB[x*2+dx,y*2+dy] = 0 if blockB[idx] else 1

    return shareA.convert("RGB"), shareB.convert("RGB")

def overlay(shareA, shareB):
    """2枚のシェアを重ね合わせ"""
    w,h = shareA.size
    result = Image.new("RGB",(w,h),(255,255,255))
    pA,pB = shareA.load(), shareB.load()
    pix = result.load()
    for y in range(h):
        for x in range(w):
            if pA[x,y] == (0,0,0) or pB[x,y] == (0,0,0):
                pix[x,y] = (0,0,0)
            else:
                pix[x,y] = (255,255,255)
    return result

if __name__=="__main__":
    outdir = "./"  # Colab 上の examples/ フォルダ内

    secret = make_secret_image("KEY", size=80)
    secret.save(outdir + "secret.png")

    shareA, shareB = vss_encrypt(secret)
    shareA.save(outdir + "shareA.png")
    shareB.save(outdir + "shareB.png")

    overlay_img = overlay(shareA, shareB)
    overlay_img.save(outdir + "overlay.png")

    print("Generated secret.png, shareA.png, shareB.png, overlay.png in", outdir)

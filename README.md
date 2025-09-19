
<!--
---
title: VisualCryptography CipherLab
category: cryptography
difficulty: 1
description: A hands-on web tool to learn Visual Cryptography (VSS/VSSS) through simple 2-sheet share generation and overlay decoding.
tags: [visual-cryptography, vsss, secret-sharing, education, demo]
demo: https://ipusiron.github.io/visual-cryptography-cipherlab/
---
-->

# VisualCryptography CipherLab - 視覚暗号ツール

A hands-on web tool to learn **Visual Cryptography (VSS/VSSS)** with simple 2-sheet overlays.

![GitHub Repo stars](https://img.shields.io/github/stars/ipusiron/visual-cryptography-cipherlab?style=social)
![GitHub forks](https://img.shields.io/github/forks/ipusiron/visual-cryptography-cipherlab?style=social)
![GitHub last commit](https://img.shields.io/github/last-commit/ipusiron/visual-cryptography-cipherlab)
![GitHub license](https://img.shields.io/github/license/ipusiron/visual-cryptography-cipherlab)
[![GitHub Pages](https://img.shields.io/badge/demo-GitHub%20Pages-blue?logo=github)](https://ipusiron.github.io/visual-cryptography-cipherlab/)


**Day070 - 生成AIで作るセキュリティツール100**

**VisualCryptography CipherLab**は、視覚暗号（Visual Cryptography / VSSS: Visual Secret Sharing Scheme）の基本を体験できるWebツールです。

画像を2枚のシェアに分離し、それぞれ単独では意味を持たないが、重ね合わせることで秘密の画像が浮かび上がります。

>視覚暗号の技術は複数シェアに対応していますが、本ツールではシンプルに2枚のシェアのみに対応しています。

---

## 🌐 デモページ

👉 **[https://ipusiron.github.io/visual-cryptography-cipherlab/](https://ipusiron.github.io/visual-cryptography-cipherlab/)**

ブラウザーで直接お試しいただけます。

---

## 📸 スクリーンショット

>![2枚のシェアを重ね合わせることで原画像を目視で読み取れる](assets/screenshot.png)  
>*2枚のシェアを重ね合わせることで原画像を目視で読み取れる*

---

## Features
- **Basics tab** — What is visual cryptography (VSS/VSSS), why single share leaks nothing.
- **Encrypt tab** — Upload an image → generate two shares (2×2 pixel expansion).
- **Decode tab** — Overlay two shares on canvas for visual decryption (with fine alignment).
- **Theory tab** — Greyscale/color variants, (3,3) → (k,n) threshold schemes, and applications unique to VSSS.

---

## Visual Cryptographyとは？

視覚暗号（Visual Cryptography）は、1994年に **Moni Naor** と **Adi Shamir** によって提案された暗号方式です。  
通常の暗号は「暗号文＋鍵→復号アルゴリズム→平文」という流れを取りますが、視覚暗号では **復号に計算処理を必要とせず、人間の目そのものが復号器** となります。

- 秘密画像を複数のシェア（透明フィルムや画像ファイル）に分割。  
- 単独のシェアは完全にランダムノイズのように見え、秘密は読み取れない。  
- 規定枚数のシェアを重ね合わせると、黒と白の濃淡差によって秘密画像が浮かび上がる。  

### 図解イメージ

視覚暗号では、元画像を **2枚のシェア** に分割します。  
それぞれはランダムノイズのように見えますが、重ね合わせると秘密が浮かび上がります。

| 元画像 | シェアA | シェアB | 重ね合わせ（復号結果） |
|--------|--------|--------|-------------------------|
| ![Secret](assets/secret.png) | ![ShareA](assets/shareA.png) | ![ShareB](assets/shareB.png) | ![Overlay](assets/overlay.png) |

---

## 単純な例：視覚暗号の基本原理

白黒の二値画像を2枚のシート（シェア）に分けて記録することを考えます。

- **黒いピクセル**  
  - シートA: ■□
  - シートB: □■

- **白いピクセル**  
  - シートA: ■□
  - シートB: ■□

### 単独のシート
- 各シートは「■」と「□」が半々の砂嵐のような無意味な像になる。  
- 一方のシートだけからは、元画像が黒なのか白なのかを判別できない。  

### 2枚を重ね合わせたとき
- **黒ピクセル**  
  - (■□ と □■) を重ねる → 「■■」となり黒く見える。  
- **白ピクセル**  
  - (■□ と ■□) を重ねる → 「■□」のまま → 灰色っぽく見える。  

### 結果
- 黒は黒、白は灰色に見えるため、コントラスト差によって秘密の画像が人間の目で判読できる。  

👉 この「黒＝濃く見える」「白＝灰色に見える」という単純な仕組みが、視覚暗号の基本原理です。

---

## 視覚暗号の特徴

- **人間の目で復号**  
  PCやアルゴリズム不要。シェアを重ねるだけで秘密が復元できる。
- **単独シェアは情報を持たない**  
  完全にランダムに見えるため、安全性が高い。
- **ピクセル拡張**  
  秘密画像の1ピクセルを複数のサブピクセルに置き換えるため、シェアが大きくなる。
- **白黒画像向け**  
  基本は2値画像。グレースケールやカラー対応は拡張手法が必要。

---

## VSSS（視覚復号型秘密分散法）への発展

- **(2,2) スキーム → (k,n) スキーム**  
  2枚で復元する方式から、n枚のうちk枚以上で復元できる方式へ一般化。
- **秘密分散共有との融合**  
  暗号理論の秘密分散法と同様、複数人がシェアを持ち寄らないと復元できない。
- **拡張スキーム**  
  グレースケール・カラー対応、効率的な非拡張型スキームなどの研究が進展。

---

## VSSSの応用例

- **認証・アクセス制御**  
  2要素認証や入場確認に利用可能。シェアを重ねると認証マークが現れる。  
- **偽造防止・透かし**  
  チケット、商品ラベル、証明書に仕込み、真偽判定に活用。  
- **セキュア情報配布**  
  新聞・雑誌に片方のシェアを印刷、会員カードを重ねると秘密が見える。  
- **QRコードとの融合**  
  複数シェアを重ねると有効なQRコードが読める仕組み。BEC防止やユーザ認証に応用。  
- **教育用途**  
  「複数人で秘密を守る」仕組みを直感的に体験でき、暗号教育に適する。  

---

## 本ツールの構成（4タブ）

1. **Basics** — 視覚暗号の基礎概念と特徴を解説。  
2. **Encrypt** — アップロードした画像を2枚のシェアに分離。単独では情報が読めない。  
3. **Decode** — 2枚のシェアを重ね合わせ、目視で秘密を確認。  
4. **Theory** — グレースケールやカラー拡張、(k,n) スキーム、応用例を紹介。  
---

## 📁 ディレクトリー構成

```
```

---

## 📄 ライセンス

MIT License – 詳細は [LICENSE](LICENSE) を参照してください。

---

## 🛠 このツールについて

本ツールは、「生成AIで作るセキュリティツール100」プロジェクトの一環として開発されました。 
このプロジェクトでは、AIの支援を活用しながら、セキュリティに関連するさまざまなツールを100日間にわたり制作・公開していく取り組みを行っています。

プロジェクトの詳細や他のツールについては、以下のページをご覧ください。  

🔗 [https://akademeia.info/?page_id=42163](https://akademeia.info/?page_id=42163)

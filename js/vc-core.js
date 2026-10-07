// VisualCryptography CipherLab の計算部（DOM を使わない通常のスクリプト。globalThis.VCCore に置く）
// (2,2) 視覚暗号: 秘密画像の各ピクセルを 2×2 に拡張し、4サブピクセル中2つが黒の6パターンから1つを選ぶ。
// 白（v=0）は両シェアに同じパターン（重ねると2黒＝灰）、黒（v=1）は片方を反転（重ねると4黒）。
// 乱数は呼び出し側から渡す（crypto.getRandomValues を注入）。テストは決定的な列を渡して確かめる。
(function (root) {
  'use strict';

  // 6パターン（長さ4、1が黒。4サブピクセル中ちょうど2つが黒）
  const PATTERNS = [
    [1, 1, 0, 0], [1, 0, 1, 0], [1, 0, 0, 1],
    [0, 1, 1, 0], [0, 1, 0, 1], [0, 0, 1, 1],
  ];

  const invert = (p) => p.map((b) => (b ? 0 : 1));

  // RGBA の配列を2値化する。輝度 >= thr を白(0)、それ未満を黒(1)にする（元実装と同じ）
  function binarize(rgba, width, height, thr) {
    const t = Number.isFinite(thr) ? thr : 128;
    const bin = new Uint8Array(width * height);
    for (let i = 0; i < width * height; i++) {
      const y = 0.299 * rgba[i * 4] + 0.587 * rgba[i * 4 + 1] + 0.114 * rgba[i * 4 + 2];
      bin[i] = y >= t ? 0 : 1;
    }
    return bin;
  }

  // 余りの偏りを除いて [0, n) の整数を1つ返す。bytesFn(count) は Uint8Array を返す乱数源。
  // n は 1..256。256 を n で割った余りの範囲（限界以上）は捨てて引き直す（rejection sampling）
  function randomIndex(n, bytesFn) {
    if (!Number.isInteger(n) || n < 1 || n > 256) throw new RangeError('n must be 1..256');
    const limit = Math.floor(256 / n) * n;
    for (let guard = 0; guard < 10000; guard++) {
      const b = bytesFn(1)[0];
      if (b < limit) return b % n;
    }
    throw new Error('randomIndex: too many rejections');
  }

  // パターンを1つ選ぶ（偏りなし）
  const pickPattern = (bytesFn) => PATTERNS[randomIndex(PATTERNS.length, bytesFn)];

  // 1ピクセル分の2つのシェアのブロック。v=0(白): 両方 p、v=1(黒): B を反転
  function sharesForPixel(v, p) {
    return { a: p.slice(), b: v ? invert(p) : p.slice() };
  }

  // 2つのブロックを重ねる（darken＝どちらかが黒なら黒）。長さ4の配列を返す
  const overlayBlock = (a, b) => a.map((x, i) => (x || b[i] ? 1 : 0));

  // crypto.getRandomValues を bytesFn の形にする（ブラウザー用）
  function cryptoBytes(cryptoObj) {
    const c = cryptoObj || (typeof root !== 'undefined' ? root.crypto : undefined);
    return (count) => c.getRandomValues(new Uint8Array(count));
  }

  // ---- 乱数の弱さのデモ（第2弾） ----
  // 予測可能な擬似乱数（線形合同法 LCG）。シードから同じ列を再現できる＝攻撃者も再現できる。
  // bytesFn（count→Uint8Array）の形で返す。パラメータは glibc の rand と同じ系列
  function lcgBytes(seed) {
    let state = (seed >>> 0) || 1;
    return (count) => {
      const out = new Uint8Array(count);
      for (let i = 0; i < count; i++) {
        state = (Math.imul(state, 1103515245) + 12345) >>> 0;
        out[i] = (state >>> 16) & 0xff; // 上位側のビットを使う（下位は周期が短い）
      }
      return out;
    };
  }

  // count ピクセル分のパターン番号の列を、与えた乱数源から作る（生成と攻撃で同じ列を得るため）
  function patternIndices(count, bytesFn) {
    const out = new Uint8Array(count);
    for (let i = 0; i < count; i++) out[i] = randomIndex(PATTERNS.length, bytesFn);
    return out;
  }

  // 攻撃: シェアB のブロック列と、再現したパターン番号の列から、秘密（0=白,1=黒）を復元する。
  // シェアB は白なら PATTERNS[idx]、黒なら invert(PATTERNS[idx])。どちらとも違えば null（復元失敗）
  function recoverFromShareB(shareBBlocks, indices) {
    const n = indices.length;
    const bin = new Uint8Array(n);
    for (let i = 0; i < n; i++) {
      const p = PATTERNS[indices[i]];
      const blk = shareBBlocks[i];
      if (p.every((x, k) => x === blk[k])) bin[i] = 0;
      else if (invert(p).every((x, k) => x === blk[k])) bin[i] = 1;
      else return null;
    }
    return bin;
  }

  root.VCCore = {
    PATTERNS, invert, binarize, randomIndex, pickPattern, sharesForPixel, overlayBlock, cryptoBytes,
    lcgBytes, patternIndices, recoverFromShareB,
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);

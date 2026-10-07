import test from 'node:test';
import assert from 'node:assert/strict';
import { core, read } from './load.js';

const C = core();
// 決定的な乱数源: 渡したバイト列を順に返す
const bytesFrom = (arr) => {
  let i = 0;
  return (count) => {
    const out = new Uint8Array(count);
    for (let k = 0; k < count; k++) out[k] = arr[i++ % arr.length];
    return out;
  };
};

test('6パターンは、それぞれ4サブピクセル中ちょうど2つが黒。互いに異なる', () => {
  assert.equal(C.PATTERNS.length, 6);
  const seen = new Set();
  for (const p of C.PATTERNS) {
    assert.equal(p.length, 4);
    assert.equal(p.reduce((a, b) => a + b, 0), 2, JSON.stringify(p));
    seen.add(p.join(''));
  }
  assert.equal(seen.size, 6);
});

test('反転は6パターンの上の全単射（単独シェアの分布が白黒で同じになる根拠）', () => {
  const set = new Set(C.PATTERNS.map((p) => p.join('')));
  const inv = C.PATTERNS.map((p) => C.invert(p).join(''));
  assert.equal(new Set(inv).size, 6, '反転後も重複しない');
  for (const s of inv) assert.ok(set.has(s), `反転 ${s} が6パターンに含まれる`);
  assert.deepEqual(C.invert([1, 1, 0, 0]), [0, 0, 1, 1]);
});

test('2値化: 輝度がしきい値以上は白(0)、未満は黒(1)。しきい値0も効く', () => {
  // 2px: 白(255,255,255) と 黒(0,0,0)
  const rgba = [255, 255, 255, 255, 0, 0, 0, 255];
  assert.deepEqual([...C.binarize(rgba, 2, 1, 128)], [0, 1]);
  // しきい値0: 輝度0の黒も「0以上」で白(0)になる（0 が 128 に化けない）
  assert.deepEqual([...C.binarize(rgba, 2, 1, 0)], [0, 0]);
  // しきい値256: すべて黒(1)
  assert.deepEqual([...C.binarize(rgba, 2, 1, 256)], [1, 1]);
  // 不正なしきい値は128扱い
  assert.deepEqual([...C.binarize(rgba, 2, 1, NaN)], [0, 1]);
});

test('白(v=0)は両シェア同じ、黒(v=1)はBを反転。重ねると白=2黒・黒=4黒', () => {
  for (const p of C.PATTERNS) {
    const white = C.sharesForPixel(0, p);
    assert.deepEqual(white.a, p);
    assert.deepEqual(white.b, p);
    assert.equal(C.overlayBlock(white.a, white.b).reduce((a, b) => a + b, 0), 2, '白は重ねて2黒（灰）');

    const black = C.sharesForPixel(1, p);
    assert.deepEqual(black.a, p);
    assert.deepEqual(black.b, C.invert(p));
    assert.equal(C.overlayBlock(black.a, black.b).reduce((a, b) => a + b, 0), 4, '黒は重ねて4黒');
  }
});

test('重ね合わせは darken（どちらかが黒なら黒）', () => {
  assert.deepEqual(C.overlayBlock([1, 0, 0, 0], [0, 1, 0, 0]), [1, 1, 0, 0]);
  assert.deepEqual(C.overlayBlock([0, 0, 0, 0], [0, 0, 0, 0]), [0, 0, 0, 0]);
});

test('乱数のパターン選択は剰余の偏りを除く（rejection sampling）', () => {
  // n=6 なら limit = floor(256/6)*6 = 252。252..255 は捨てて引き直す
  assert.equal(C.randomIndex(6, bytesFrom([0])), 0);
  assert.equal(C.randomIndex(6, bytesFrom([251])), 251 % 6);
  assert.equal(C.randomIndex(6, bytesFrom([252, 253, 254, 255, 7])), 7 % 6, '限界以上は捨てて次を使う');
  // 全256バイトを流すと、0..5 がそれぞれ42回（252/6）ずつ＝偏りなし
  const counts = new Array(6).fill(0);
  const src = bytesFrom([...Array(256).keys()]);
  for (let i = 0; i < 252; i++) counts[C.randomIndex(6, src)]++;
  assert.deepEqual(counts, new Array(6).fill(42));
  assert.throws(() => C.randomIndex(0, bytesFrom([0])), RangeError);
  assert.throws(() => C.randomIndex(300, bytesFrom([0])), RangeError);
});

test('pickPattern は注入した乱数でパターンを選ぶ。cryptoBytes は getRandomValues を使う', () => {
  assert.deepEqual(C.pickPattern(bytesFrom([0])), C.PATTERNS[0]);
  assert.deepEqual(C.pickPattern(bytesFrom([5])), C.PATTERNS[5]);
  // cryptoBytes: 渡した crypto 風オブジェクトの getRandomValues を呼ぶ
  let asked = 0;
  const fakeCrypto = { getRandomValues: (a) => { asked = a.length; a[0] = 3; return a; } };
  const bytes = C.cryptoBytes(fakeCrypto);
  assert.equal(bytes(1)[0], 3);
  assert.equal(asked, 1);
});

test('vc-core.js に innerHTML などの危険な書き込みがない', () => {
  const src = read('js/vc-core.js');
  assert.doesNotMatch(src, /innerHTML|outerHTML|document\.write|eval\(|new Function|Math\.random/);
});

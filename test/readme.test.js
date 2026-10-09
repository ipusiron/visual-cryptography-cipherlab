import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { core } from './load.js';

const C = core();
const root = new URL('../', import.meta.url);
const readme = fs.readFileSync(new URL('README.md', root), 'utf8');
const readmeEn = fs.readFileSync(new URL('README.en.md', root), 'utf8');
const sum = (a) => a.reduce((s, x) => s + x, 0);

test('README の「このツールならではの使い方」を計算部で再計算（日英）', () => {
  const p = C.PATTERNS[0];
  assert.equal(sum(p), 2);
  const white = C.sharesForPixel(0, p);
  const black = C.sharesForPixel(1, p);
  assert.equal(sum(C.overlayBlock(white.a, white.b)), 2);
  assert.equal(sum(C.overlayBlock(black.a, black.b)), 4);
  assert.deepEqual(white.a, black.a);
  assert.equal(C.PATTERNS.length, 6);
  for (const md of [readme, readmeEn]) {
    assert.ok(md.includes('2x2') || md.includes('2×2'));
    assert.ok(md.includes('6'));
  }
});

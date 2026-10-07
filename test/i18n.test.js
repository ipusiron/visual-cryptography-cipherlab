import test from 'node:test';
import assert from 'node:assert/strict';
import { read, load } from './load.js';

const { MESSAGES } = load('js/messages.js').VCMessages;
const I18N = load('js/i18n.js').VCI18n;
const html = read('index.html');
const JAPANESE = new RegExp('[' + [[0x3040, 0x30ff], [0x3400, 0x9fff], [0xff00, 0xffef]]
  .map(([a, b]) => String.fromCharCode(a) + '-' + String.fromCharCode(b)).join('') + ']');
// 図の記号（■□／）は言語共通なので、英語の判定からは除く
const stripSymbols = (s) => s.replace(/[■□／]/g, '');

test('日本語と英語の辞書は同じキーを持ち、置き場所（{name}）もそろう', () => {
  const ja = Object.keys(MESSAGES.ja);
  assert.deepEqual(Object.keys(MESSAGES.en).sort(), [...ja].sort());
  const ph = (s) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',');
  for (const k of ja) assert.equal(ph(MESSAGES.en[k]), ph(MESSAGES.ja[k]), k);
  assert.ok(ja.length >= 120, String(ja.length));
});

test('英語の文言に日本語の文字がない（言語の切り替えボタンの「日本語」と図の記号は例外）', () => {
  for (const [k, v] of Object.entries(MESSAGES.en)) {
    if (k === 'ui.langButton') continue;
    assert.doesNotMatch(stripSymbols(v), JAPANESE, k);
  }
  assert.equal(MESSAGES.en['ui.langButton'], '日本語');
  assert.equal(MESSAGES.ja['ui.langButton'], 'EN');
});

test('index.html の data-i18n のキーは辞書にあり、書いた日本語は辞書の日本語と同じ', () => {
  const pairs = [...html.matchAll(/data-i18n="([\w.]+)"[^>]*>([^<]*)</g)].map((m) => [m[1], m[2]]);
  assert.ok(pairs.length > 80, String(pairs.length));
  for (const [k, text] of pairs) {
    assert.ok(k in MESSAGES.ja, `辞書にないキー: ${k}`);
    assert.equal(text.trim(), MESSAGES.ja[k].trim(), k);
  }
  for (const m of html.matchAll(/data-i18n-attr="([^"]+)"/g)) {
    for (const part of m[1].split(';')) assert.ok(part.split(':')[1] in MESSAGES.ja, part);
  }
});

test('初期の言語: ?lang= → 保存した選択 → ブラウザーの言語（日本語以外は英語）', () => {
  assert.equal(I18N.KEY, 'visual-cryptography-cipherlab-lang');
  assert.equal(I18N.initialLanguage('?lang=en', 'ja', ['ja-JP']), 'en');
  assert.equal(I18N.initialLanguage('?x=1&lang=ja', 'en', ['en-US']), 'ja');
  assert.equal(I18N.initialLanguage('?lang=fr', null, ['ja-JP']), 'ja');
  assert.equal(I18N.initialLanguage('', 'en', ['ja-JP']), 'en');
  assert.equal(I18N.initialLanguage('', null, ['ja']), 'ja');
  assert.equal(I18N.initialLanguage('', null, ['fr-FR', 'ja']), 'en');
  assert.equal(I18N.initialLanguage('', 'xx', []), 'en');
});

test('乱数のわなの動的メッセージ・タブ・ツールチップのキーがそろう', () => {
  for (const k of ['msg.needUpload', 'msg.loadFail', 'msg.needBoth', 'msg.overlayFail',
    'msg.rngNeedGen', 'msg.rngGenerated', 'msg.rngRecovered', 'msg.rngWrongSeed', 'msg.rngPartial']) {
    assert.ok(k in MESSAGES.ja && k in MESSAGES.en, k);
  }
  for (const k of ['ui.tabBasics', 'ui.tabEncrypt', 'ui.tabDecode', 'ui.tabRng', 'ui.tabTheory']) assert.ok(k in MESSAGES.ja, k);
});

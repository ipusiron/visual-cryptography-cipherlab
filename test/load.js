// 画面と同じ通常のスクリプト（js/*.js）を、テストの実行環境に読み込む。
import fs from 'node:fs';
import vm from 'node:vm';

export const read = (f) => fs.readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');

const loaded = new Set();
export function load(file) {
  if (!loaded.has(file)) {
    vm.runInThisContext(read(file), { filename: file });
    loaded.add(file);
  }
  return globalThis;
}

export const core = () => load('js/vc-core.js').VCCore;

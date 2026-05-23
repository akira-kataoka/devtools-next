// v3.454.0 Phase 544: sf-format-helpers.js の純粋関数ユニットテスト

import { test } from "node:test";
import assert from "node:assert/strict";
import { tsForFilename, formatError } from "../js/sf-format-helpers.js";

// --- tsForFilename ------------------------------------------------------------

test("tsForFilename: 引数なしは現在時刻ベースで 'YYYYMMDD-HHmm' 形式の 13 文字", () => {
  const out = tsForFilename();
  assert.equal(out.length, 13, `expected 13 chars: ${out}`);
  assert.match(out, /^\d{8}-\d{4}$/);
});

test("tsForFilename: 固定 Date 注入: 2026-05-23 15:09", () => {
  // JS Date は month が 0-based
  const d = new Date(2026, 4, 23, 15, 9, 30);
  assert.equal(tsForFilename(d), "20260523-1509");
});

test("tsForFilename: 1 桁月日時分はゼロ埋め", () => {
  const d = new Date(2026, 0, 1, 1, 5);
  assert.equal(tsForFilename(d), "20260101-0105");
});

test("tsForFilename: 12 月 31 日 23:59 境界", () => {
  const d = new Date(2099, 11, 31, 23, 59);
  assert.equal(tsForFilename(d), "20991231-2359");
});

test("tsForFilename: 秒・ミリ秒は出力に含まれない", () => {
  const d1 = new Date(2026, 4, 23, 15, 9, 0);
  const d2 = new Date(2026, 4, 23, 15, 9, 59);
  assert.equal(tsForFilename(d1), tsForFilename(d2));
});

// --- formatError --------------------------------------------------------------

test("formatError: REST 標準配列 → 'errorCode message'", () => {
  const d = [{ errorCode: "INVALID_FIELD", message: "No such column 'Foo'" }];
  assert.equal(formatError(d), "INVALID_FIELD No such column 'Foo'");
});

test("formatError: errorCode のみ (message なし) → 末尾空白なし", () => {
  assert.equal(formatError([{ errorCode: "TIMEOUT" }]), "TIMEOUT");
});

test("formatError: message のみ (errorCode なし) → 先頭空白なし", () => {
  assert.equal(formatError([{ message: "Network error" }]), "Network error");
});

test("formatError: 空配列 → JSON.stringify フォールバック '[]'", () => {
  assert.equal(formatError([]), "[]");
});

test("formatError: 配列の先頭が falsy (null) → JSON.stringify フォールバック", () => {
  // d[0] が null だと最初の分岐に入らない (現状の実装挙動を確定)
  assert.equal(formatError([null]), "[null]");
});

test("formatError: OAuth エラー (error_description あり) → description を返す", () => {
  const d = { error: "invalid_grant", error_description: "authentication failure" };
  assert.equal(formatError(d), "authentication failure");
});

test("formatError: OAuth エラー (error のみ) → error を返す", () => {
  assert.equal(formatError({ error: "invalid_grant" }), "invalid_grant");
});

test("formatError: null → 'null' (JSON.stringify)", () => {
  assert.equal(formatError(null), "null");
});

test("formatError: undefined → undefined (JSON.stringify(undefined) = undefined)", () => {
  // JSON.stringify(undefined) は undefined を返す。formatError も undefined を返す。
  assert.equal(formatError(undefined), undefined);
});

test("formatError: 任意オブジェクト → JSON.stringify", () => {
  assert.equal(formatError({ foo: 1 }), '{"foo":1}');
});

test("formatError: 文字列 → JSON.stringify でクォート付き", () => {
  assert.equal(formatError("just a string"), '"just a string"');
});

// v3.451.0 Phase 541: sf-connections.js の純粋関数ユニットテスト
// Node 組み込み test ランナー (node --test) を使うため、外部依存ゼロ
//
// 実行:
//   node --test tests/
//
// CI ゲートとして導入する前に、まずローカルで全 pass を確認できることが目的。

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  maskSecret,
  formatAuthAge,
  isAuthStale,
  AUTH_STALE_THRESHOLD_MS,
  makeConnectionId,
} from "../js/sf-connections.js";

// --- maskSecret ---------------------------------------------------------------

test("maskSecret: 空文字は空文字を返す", () => {
  assert.equal(maskSecret(""), "");
  assert.equal(maskSecret(null), "");
  assert.equal(maskSecret(undefined), "");
});

test("maskSecret: 6 文字以下は *** を返す", () => {
  assert.equal(maskSecret("a"), "***");
  assert.equal(maskSecret("abcdef"), "***");
});

test("maskSecret: 7 文字以上は前 3 文字 + *** + 末尾 2 文字", () => {
  assert.equal(maskSecret("abcdefg"), "abc***fg");
  assert.equal(maskSecret("00D000000000000ABCDEF"), "00D***EF");
});

// --- formatAuthAge ------------------------------------------------------------

test("formatAuthAge: undefined / null は空文字", () => {
  assert.equal(formatAuthAge(undefined), "");
  assert.equal(formatAuthAge(null), "");
  assert.equal(formatAuthAge(0), "");
});

test("formatAuthAge: 未来の時刻は 'now'", () => {
  const future = Date.now() + 60_000;
  assert.equal(formatAuthAge(future), "now");
});

test("formatAuthAge: 30 秒前は <1分前", () => {
  const ts = Date.now() - 30_000;
  assert.equal(formatAuthAge(ts), "<1分前");
});

test("formatAuthAge: 5 分前", () => {
  const ts = Date.now() - 5 * 60_000;
  assert.equal(formatAuthAge(ts), "5分前");
});

test("formatAuthAge: 59 分前", () => {
  const ts = Date.now() - 59 * 60_000;
  assert.equal(formatAuthAge(ts), "59分前");
});

test("formatAuthAge: 3 時間前", () => {
  const ts = Date.now() - 3 * 60 * 60_000;
  assert.equal(formatAuthAge(ts), "3時間前");
});

test("formatAuthAge: 23 時間前", () => {
  const ts = Date.now() - 23 * 60 * 60_000;
  assert.equal(formatAuthAge(ts), "23時間前");
});

test("formatAuthAge: 2 日前", () => {
  const ts = Date.now() - 2 * 24 * 60 * 60_000;
  assert.equal(formatAuthAge(ts), "2日前");
});

// --- isAuthStale --------------------------------------------------------------

test("isAuthStale: null / 未認証は false (stale 判定対象外)", () => {
  assert.equal(isAuthStale(null), false);
  assert.equal(isAuthStale({}), false);
  assert.equal(isAuthStale({ accessToken: null }), false);
  assert.equal(isAuthStale({ accessToken: "" }), false);
});

test("isAuthStale: accessToken はあるが tokenIssuedAt 不明 → stale", () => {
  assert.equal(isAuthStale({ accessToken: "tok" }), true);
  assert.equal(isAuthStale({ accessToken: "tok", tokenIssuedAt: null }), true);
});

test("isAuthStale: 5 時間前は鮮度 OK (false)", () => {
  const ts = Date.now() - 5 * 60 * 60_000;
  assert.equal(isAuthStale({ accessToken: "tok", tokenIssuedAt: ts }), false);
});

test("isAuthStale: 6 時間 1 分前は stale (true)", () => {
  const ts = Date.now() - (6 * 60 * 60_000 + 60_000);
  assert.equal(isAuthStale({ accessToken: "tok", tokenIssuedAt: ts }), true);
});

test("isAuthStale: 閾値ぴったり (6h) は false (>のみ true)", () => {
  // > 比較なので、ぴったり境界は stale 扱いしない
  const ts = Date.now() - AUTH_STALE_THRESHOLD_MS;
  assert.equal(isAuthStale({ accessToken: "tok", tokenIssuedAt: ts }), false);
});

test("AUTH_STALE_THRESHOLD_MS は 6 時間 (21,600,000 ms)", () => {
  assert.equal(AUTH_STALE_THRESHOLD_MS, 21_600_000);
});

// --- makeConnectionId ---------------------------------------------------------

test("makeConnectionId: 'c' プレフィックス + ベース 36 (時間 + ランダム)", () => {
  const id = makeConnectionId();
  assert.ok(id.startsWith("c"), `id should start with 'c': ${id}`);
  assert.ok(id.length >= 8, `id should be >=8 chars: ${id}`);
});

test("makeConnectionId: 連続呼出で重複しない", () => {
  const ids = new Set();
  for (let i = 0; i < 100; i++) ids.add(makeConnectionId());
  assert.equal(ids.size, 100, "100 連続生成で全 ID がユニークであること");
});

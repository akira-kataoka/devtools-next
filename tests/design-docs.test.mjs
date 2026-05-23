// v3.459.0 Phase 549: design-docs.js の純粋整形関数ユニットテスト
// 対象: fmtNum / fmtBytes / fmtTrunc / fmtPercent / fieldTypeJa / FIELD_TYPE_JA /
//       xmlText / xmlAttr / md / esc / splitMd (11 シンボル、累計 +30 ケース → 110)

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  fmtNum,
  fmtBytes,
  fmtTrunc,
  fmtPercent,
  fieldTypeJa,
  FIELD_TYPE_JA,
  xmlText,
  xmlAttr,
  md,
  esc,
  splitMd,
} from "../js/design-docs.js";

// --- fmtNum -------------------------------------------------------------------

test("fmtNum: null / undefined / 空文字は空文字を返す", () => {
  assert.equal(fmtNum(null), "");
  assert.equal(fmtNum(undefined), "");
  assert.equal(fmtNum(""), "");
});

test("fmtNum: 数値は ja-JP locale で 3 桁区切り (12345 → '12,345')", () => {
  assert.equal(fmtNum(12345), "12,345");
  assert.equal(fmtNum(1000000), "1,000,000");
  assert.equal(fmtNum(0), "0");
});

test("fmtNum: 文字列でも Number 変換できれば整形 ('12345' → '12,345')", () => {
  assert.equal(fmtNum("12345"), "12,345");
});

test("fmtNum: 非有限値 (NaN / Infinity) は元値の String 表現を返す", () => {
  assert.equal(fmtNum("abc"), "abc");
  assert.equal(fmtNum(Infinity), "Infinity");
});

// --- fmtBytes -----------------------------------------------------------------

test("fmtBytes: 1024 未満は 'N B' (fmtNum 経由で 3 桁区切り)", () => {
  assert.equal(fmtBytes(0), "0 B");
  assert.equal(fmtBytes(1023), "1,023 B");
});

test("fmtBytes: KB スケール (12345 → '12.1 KB')", () => {
  assert.equal(fmtBytes(12345), "12.1 KB");
  assert.equal(fmtBytes(1024), "1.0 KB");
});

test("fmtBytes: MB スケール (小数 2 桁: 1234567 → '1.18 MB')", () => {
  assert.equal(fmtBytes(1234567), "1.18 MB");
});

test("fmtBytes: GB スケール (1024^3 → '1.00 GB')", () => {
  assert.equal(fmtBytes(1024 * 1024 * 1024), "1.00 GB");
});

test("fmtBytes: null / 空文字は空文字、非数値文字列はそのまま", () => {
  assert.equal(fmtBytes(null), "");
  assert.equal(fmtBytes(""), "");
  assert.equal(fmtBytes("xyz"), "xyz");
});

// --- fmtTrunc -----------------------------------------------------------------

test("fmtTrunc: 上限以下はそのまま返す", () => {
  assert.equal(fmtTrunc("hello", 200), "hello");
  assert.equal(fmtTrunc("a".repeat(200), 200), "a".repeat(200));
});

test("fmtTrunc: 上限超過は ' … [+N 文字省略]' を付加 (fmtNum で 3 桁区切り)", () => {
  const s = "a".repeat(1234);
  const out = fmtTrunc(s, 200);
  assert.equal(out.length, 200 + " … [+1,034 文字省略]".length);
  assert.ok(out.startsWith("a".repeat(200)));
  assert.ok(out.endsWith(" … [+1,034 文字省略]"));
});

test("fmtTrunc: null は空文字", () => {
  assert.equal(fmtTrunc(null), "");
});

test("fmtTrunc: max 既定値は 200", () => {
  const s = "a".repeat(201);
  assert.ok(fmtTrunc(s).endsWith("[+1 文字省略]"));
});

// --- fmtPercent ---------------------------------------------------------------

test("fmtPercent: 比率 → '%' (0.123 → '12.3%')", () => {
  assert.equal(fmtPercent(0.123), "12.3%");
  assert.equal(fmtPercent(0.456), "45.6%");
  assert.equal(fmtPercent(1), "100.0%");
});

test("fmtPercent: decimals 指定で桁数変更", () => {
  assert.equal(fmtPercent(0.12345, 2), "12.35%");
  assert.equal(fmtPercent(0.5, 0), "50%");
});

test("fmtPercent: null / 空文字は空文字", () => {
  assert.equal(fmtPercent(null), "");
  assert.equal(fmtPercent(""), "");
});

// --- fieldTypeJa / FIELD_TYPE_JA ---------------------------------------------

test("fieldTypeJa: 既知の type は日本語に変換", () => {
  assert.equal(fieldTypeJa("string"), "文字列");
  assert.equal(fieldTypeJa("boolean"), "チェックボックス");
  assert.equal(fieldTypeJa("currency"), "通貨");
});

test("fieldTypeJa: reference + referenceTo → '参照関係(Account)' 形式", () => {
  assert.equal(fieldTypeJa("reference", "Account"), "参照関係(Account)");
  assert.equal(fieldTypeJa("reference", "Custom__c"), "参照関係(Custom__c)");
});

test("fieldTypeJa: reference 単独 (referenceTo なし) は '参照関係' のみ", () => {
  assert.equal(fieldTypeJa("reference"), "参照関係");
  assert.equal(fieldTypeJa("reference", ""), "参照関係");
});

test("fieldTypeJa: 未知の type はそのまま返す", () => {
  assert.equal(fieldTypeJa("unknownType"), "unknownType");
});

test("fieldTypeJa: 空文字 / null は空文字", () => {
  assert.equal(fieldTypeJa(""), "");
  assert.equal(fieldTypeJa(null), "");
});

test("FIELD_TYPE_JA: SF 主要 field type を網羅 (27 エントリ確定)", () => {
  assert.equal(Object.keys(FIELD_TYPE_JA).length, 27);
  // 代表的な entry
  assert.equal(FIELD_TYPE_JA.id, "ID");
  assert.equal(FIELD_TYPE_JA.picklist, "選択リスト");
  assert.equal(FIELD_TYPE_JA.location, "地理位置情報");
});

// --- xmlText / xmlAttr --------------------------------------------------------

test("xmlText: & < > \" ' をエンティティ化", () => {
  assert.equal(xmlText("a & b"), "a &amp; b");
  assert.equal(xmlText("<tag>"), "&lt;tag&gt;");
  assert.equal(xmlText(`"q"`), "&quot;q&quot;");
  assert.equal(xmlText("'q'"), "&apos;q&apos;");
});

test("xmlText: 改行 (\\n / \\r\\n) は &#10; に統一", () => {
  assert.equal(xmlText("a\nb"), "a&#10;b");
  assert.equal(xmlText("a\r\nb"), "a&#10;b");
});

test("xmlText: 制御文字 (\\x00-\\x1F の一部) は除去", () => {
  assert.equal(xmlText("a\x00b\x07c"), "abc");
  assert.equal(xmlText("\x0Ehello\x1F"), "hello");
});

test("xmlText: null / undefined は空文字", () => {
  assert.equal(xmlText(null), "");
  assert.equal(xmlText(undefined), "");
});

test("xmlAttr: xmlText と同じ挙動 (alias)", () => {
  assert.equal(xmlAttr("<a&b>"), xmlText("<a&b>"));
  assert.equal(xmlAttr(null), "");
});

// --- md -----------------------------------------------------------------------

test("md: 改行をスペースに、| をエスケープ", () => {
  assert.equal(md("a\nb"), "a b");
  assert.equal(md("a\r\nb"), "a b");
  assert.equal(md("a|b"), "a\\|b");
  assert.equal(md("a|b\nc|d"), "a\\|b c\\|d");
});

test("md: null / undefined は空文字", () => {
  assert.equal(md(null), "");
  assert.equal(md(undefined), "");
});

// --- esc ----------------------------------------------------------------------

test("esc: HTML 特殊文字 5 種をエンティティ化", () => {
  assert.equal(esc("<div>"), "&lt;div&gt;");
  assert.equal(esc("a & b"), "a &amp; b");
  assert.equal(esc(`"x"`), "&quot;x&quot;");
  assert.equal(esc("'x'"), "&#39;x&#39;");
});

test("esc: null / undefined は空文字", () => {
  assert.equal(esc(null), "");
  assert.equal(esc(undefined), "");
});

// --- splitMd ------------------------------------------------------------------

test("splitMd: '| a | b | c |' → ['a','b','c']", () => {
  assert.deepEqual(splitMd("| a | b | c |"), ["a", "b", "c"]);
});

test("splitMd: 区切り行 ('|---|---|') は空文字配列に変換", () => {
  assert.deepEqual(splitMd("|---|---|---|"), ["", "", ""]);
});

test("splitMd: 前後空白はトリム、先頭/末尾 | は除去", () => {
  assert.deepEqual(splitMd("|  foo  |  bar  |"), ["foo", "bar"]);
});

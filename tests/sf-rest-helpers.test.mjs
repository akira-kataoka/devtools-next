// v3.453.0 Phase 543: sf-rest-helpers.js の純粋関数ユニットテスト
//
// 実行: npm test  (root の package.json scripts.test を参照)

import { test } from "node:test";
import assert from "node:assert/strict";
import { parseRestHeaders, wrapSoapEnvelope } from "../js/sf-rest-helpers.js";

// --- parseRestHeaders ---------------------------------------------------------

test("parseRestHeaders: null / 空 / 非文字列は {} を返す", () => {
  assert.deepEqual(parseRestHeaders(null), {});
  assert.deepEqual(parseRestHeaders(undefined), {});
  assert.deepEqual(parseRestHeaders(""), {});
  assert.deepEqual(parseRestHeaders(123), {});
  assert.deepEqual(parseRestHeaders({}), {});
});

test("parseRestHeaders: 単一ヘッダー", () => {
  assert.deepEqual(parseRestHeaders("Content-Type: application/json"), {
    "Content-Type": "application/json",
  });
});

test("parseRestHeaders: 複数行 (LF) で複数ヘッダー", () => {
  const text = "Content-Type: application/json\nAccept: application/json\nX-Foo: bar";
  assert.deepEqual(parseRestHeaders(text), {
    "Content-Type": "application/json",
    "Accept": "application/json",
    "X-Foo": "bar",
  });
});

test("parseRestHeaders: CRLF 改行も同じ結果", () => {
  const text = "Content-Type: application/json\r\nAccept: text/plain";
  assert.deepEqual(parseRestHeaders(text), {
    "Content-Type": "application/json",
    "Accept": "text/plain",
  });
});

test("parseRestHeaders: 空行は無視", () => {
  const text = "\nA: 1\n\nB: 2\n\n";
  assert.deepEqual(parseRestHeaders(text), { A: "1", B: "2" });
});

test("parseRestHeaders: # で始まる行はコメント扱いで無視", () => {
  const text = "# this is a comment\nA: 1\n# another\nB: 2";
  assert.deepEqual(parseRestHeaders(text), { A: "1", B: "2" });
});

test("parseRestHeaders: コロンなしの行は無視", () => {
  const text = "no-colon-line\nA: 1";
  assert.deepEqual(parseRestHeaders(text), { A: "1" });
});

test("parseRestHeaders: key 空 (先頭がコロン) の行は無視", () => {
  const text = ": empty-key\nA: 1";
  assert.deepEqual(parseRestHeaders(text), { A: "1" });
});

test("parseRestHeaders: key/value 前後の空白はトリム", () => {
  const text = "   Content-Type   :    application/json   \n  A  :  b  ";
  assert.deepEqual(parseRestHeaders(text), {
    "Content-Type": "application/json",
    "A": "b",
  });
});

test("parseRestHeaders: value にコロンが含まれてもよい (URL や時刻)", () => {
  const text = "X-URL: https://example.com:8080/api\nTime: 2026-01-01T12:34:56Z";
  assert.deepEqual(parseRestHeaders(text), {
    "X-URL": "https://example.com:8080/api",
    "Time": "2026-01-01T12:34:56Z",
  });
});

test("parseRestHeaders: 同一 key は後勝ち", () => {
  const text = "A: 1\nA: 2\nA: 3";
  assert.deepEqual(parseRestHeaders(text), { A: "3" });
});

test("parseRestHeaders: 空 value は許容 (空文字)", () => {
  const text = "A:\nB: ";
  assert.deepEqual(parseRestHeaders(text), { A: "", B: "" });
});

// --- wrapSoapEnvelope ---------------------------------------------------------

test("wrapSoapEnvelope: XML 宣言付きの SOAP 1.1 Envelope を返す", () => {
  const result = wrapSoapEnvelope("<urn:hello/>");
  assert.ok(result.startsWith(`<?xml version="1.0" encoding="UTF-8"?>`));
  assert.ok(result.includes(`xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"`));
  assert.ok(result.includes("<soap:Body>"));
  assert.ok(result.includes("</soap:Body>"));
  assert.ok(result.includes("</soap:Envelope>"));
  assert.ok(result.includes("<urn:hello/>"));
});

test("wrapSoapEnvelope: inner body は <soap:Body> 内にそのまま挿入", () => {
  const inner = `<urn:create><record><Name>X</Name></record></urn:create>`;
  const result = wrapSoapEnvelope(inner);
  const bodyStart = result.indexOf("<soap:Body>");
  const bodyEnd = result.indexOf("</soap:Body>");
  assert.ok(bodyStart >= 0 && bodyEnd > bodyStart);
  const between = result.substring(bodyStart + "<soap:Body>".length, bodyEnd);
  assert.ok(between.includes(inner));
});

test("wrapSoapEnvelope: 空文字でも有効な Envelope を返す", () => {
  const result = wrapSoapEnvelope("");
  assert.ok(result.includes("<soap:Body>"));
  assert.ok(result.includes("</soap:Body>"));
  // 構造的に妥当な XML (Envelope/Body の閉じタグ順序)
  assert.ok(result.indexOf("</soap:Body>") < result.indexOf("</soap:Envelope>"));
});

// --- wrapSoapEnvelope edge cases (Phase 569) ----------------------------------

test("wrapSoapEnvelope: XML 宣言は必ず先頭", () => {
  const result = wrapSoapEnvelope("<x/>");
  assert.equal(result.indexOf("<?xml"), 0);
  assert.ok(result.includes(`encoding="UTF-8"`));
});

test("wrapSoapEnvelope: soap namespace 宣言を含む", () => {
  const result = wrapSoapEnvelope("<x/>");
  assert.ok(result.includes(`xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"`));
});

test("wrapSoapEnvelope: 複数行 innerBody は改行を保持して挿入", () => {
  const inner = "<urn:method1/>\n  <urn:method2/>";
  const result = wrapSoapEnvelope(inner);
  assert.ok(result.includes(inner));
});

test("wrapSoapEnvelope: innerBody の XML 特殊文字はエスケープしない (呼出側で escXml 済を想定)", () => {
  // 関数仕様 = 「`innerBody` をそのまま挿入」。生の `<` `>` は escape しない。
  // 呼出側が値を含める時は事前に escXml が必要。これは契約の確定。
  const inner = "<urn:msg>&amp;hello</urn:msg>";
  const result = wrapSoapEnvelope(inner);
  assert.ok(result.includes("&amp;hello"));
  assert.ok(!result.includes("&amp;amp;hello")); // 二重エスケープしないことを verify
});

test("wrapSoapEnvelope: null は JS template literal 仕様により 'null' 文字列化", () => {
  // 防御コードを入れていない実装挙動を確定。呼出側の責任。
  const result = wrapSoapEnvelope(null);
  assert.ok(result.includes("\nnull\n"));
});

test("wrapSoapEnvelope: undefined も 'undefined' 文字列化", () => {
  const result = wrapSoapEnvelope(undefined);
  assert.ok(result.includes("\nundefined\n"));
});

test("wrapSoapEnvelope: 数値 innerBody は文字列化 (テンプレートリテラル仕様)", () => {
  const result = wrapSoapEnvelope(42);
  assert.ok(result.includes("\n42\n"));
});

test("wrapSoapEnvelope: 出力は <soap:Envelope> でラップされ </soap:Envelope> で閉じる", () => {
  const result = wrapSoapEnvelope("X");
  const open = result.indexOf("<soap:Envelope");
  const close = result.indexOf("</soap:Envelope>");
  assert.ok(open > 0);
  assert.ok(close > open);
  // close より後ろには改行や空白のみ
  assert.equal(result.substring(close + "</soap:Envelope>".length).trim(), "");
});

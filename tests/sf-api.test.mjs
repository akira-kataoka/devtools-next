// v3.458.0 Phase 548: sf-api.js の純粋関数ユニットテスト
// 対象: isSalesforceHost / toApiHost / parseOrgIdFromSid / to18CharId / lookupPrefix
// 副作用関数 (sfFetch / runSoql / getUserInfo / getSessionId / getActiveSfTab) は chrome.* / fetch に依存するため対象外。
// recordsToCsv は別ファイルで扱う想定 (列順・ネスト・日時整形が複雑なため)。

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  SF_DOMAINS,
  isSalesforceHost,
  toApiHost,
  parseOrgIdFromSid,
  to18CharId,
  lookupPrefix,
  KEY_PREFIX_MAP,
} from "../js/sf-api.js";

// --- SF_DOMAINS 定数チェック --------------------------------------------------

test("SF_DOMAINS: 想定 6 ドメインがすべて含まれる", () => {
  // Phase 426 documentation と整合性確認 (isSalesforceHost の対象)
  const expected = [
    "salesforce.com",
    "force.com",
    "lightning.force.com",
    "my.salesforce.com",
    "cloudforce.com",
    "visualforce.com",
  ];
  assert.equal(SF_DOMAINS.length, 6);
  for (const d of expected) {
    assert.ok(SF_DOMAINS.includes(d), `SF_DOMAINS に ${d} が含まれていない`);
  }
});

// --- isSalesforceHost ---------------------------------------------------------

test("isSalesforceHost: Lightning ホストは true", () => {
  assert.equal(isSalesforceHost("acme.lightning.force.com"), true);
});

test("isSalesforceHost: my.salesforce.com 系は true", () => {
  assert.equal(isSalesforceHost("acme.my.salesforce.com"), true);
});

test("isSalesforceHost: sandbox.my.salesforce.com も endsWith マッチで true", () => {
  // Phase 426 documentation の例
  assert.equal(isSalesforceHost("acme--dev.sandbox.my.salesforce.com"), true);
});

test("isSalesforceHost: develop ドメインも force.com に endsWith マッチ", () => {
  assert.equal(isSalesforceHost("acme.develop.lightning.force.com"), true);
});

test("isSalesforceHost: visualforce.com は true (VisualForce ページ)", () => {
  assert.equal(isSalesforceHost("acme--c.vf.force.com"), true);
  assert.equal(isSalesforceHost("acme.visualforce.com"), true);
});

test("isSalesforceHost: 無関係ホストは false", () => {
  assert.equal(isSalesforceHost("example.com"), false);
  assert.equal(isSalesforceHost("github.io"), false);
});

test("isSalesforceHost: salesforce-setup / -experience は SF_DOMAINS 6 に含まれない (host_permissions 寛容判定との差)", () => {
  // Phase 426 documentation: SF_DOMAINS 6 vs host_permissions 9 の差
  assert.equal(isSalesforceHost("acme.salesforce-setup.com"), false);
  assert.equal(isSalesforceHost("acme.salesforce-experience.com"), false);
});

// --- toApiHost ---------------------------------------------------------------

test("toApiHost: Lightning → my.salesforce.com 置換", () => {
  assert.equal(toApiHost("acme.lightning.force.com"), "acme.my.salesforce.com");
});

test("toApiHost: develop.lightning.force.com → develop.my.salesforce.com", () => {
  assert.equal(
    toApiHost("acme.develop.lightning.force.com"),
    "acme.develop.my.salesforce.com",
  );
});

test("toApiHost: 既に my.salesforce.com ならそのまま", () => {
  assert.equal(toApiHost("acme.my.salesforce.com"), "acme.my.salesforce.com");
});

test("toApiHost: sandbox ホストはそのまま (置換対象外)", () => {
  const h = "acme--dev.sandbox.my.salesforce.com";
  assert.equal(toApiHost(h), h);
});

test("toApiHost: SF 関係ない host もそのまま (例外を投げない)", () => {
  assert.equal(toApiHost("example.com"), "example.com");
});

test("toApiHost: 部分一致は置換しない (lightning.force.com.evil.com 等の偽装防止)", () => {
  // endsWith 厳格判定なので途中に挟まっていてもマッチしない
  assert.equal(toApiHost("acme.lightning.force.com.evil.com"), "acme.lightning.force.com.evil.com");
});

// --- parseOrgIdFromSid -------------------------------------------------------

test("parseOrgIdFromSid: 標準フォーマット <OrgId15>!<Token> → 先頭 15 文字", () => {
  const sid = "00D5g0000000XYZ!ARgAQEbcdef.tokenpart";
  assert.equal(parseOrgIdFromSid(sid), "00D5g0000000XYZ");
});

test("parseOrgIdFromSid: ! を含まない sid は null", () => {
  assert.equal(parseOrgIdFromSid("notarealsid"), null);
});

test("parseOrgIdFromSid: 空文字 / null / undefined は null", () => {
  assert.equal(parseOrgIdFromSid(""), null);
  assert.equal(parseOrgIdFromSid(null), null);
  assert.equal(parseOrgIdFromSid(undefined), null);
});

test("parseOrgIdFromSid: ! が先頭の場合は空文字 (現状実装挙動を確定)", () => {
  // OrgId 部分が空の異常 sid だが indexOf('!') = 0 で substring(0, 0) = ''
  assert.equal(parseOrgIdFromSid("!token"), "");
});

// --- to18CharId --------------------------------------------------------------

test("to18CharId: 手計算検証ケース ABCDEabcde00000 → suffix '5AA'", () => {
  // chunk 0: 'A','B','C','D','E' 全て大文字 → bits=11111=31 → '5'
  // chunk 1: 'a','b','c','d','e' 全て小文字 → bits=0 → 'A'
  // chunk 2: '0','0','0','0','0' 全て digit → bits=0 → 'A'
  // 補完文字表: "ABCDEFGHIJKLMNOPQRSTUVWXYZ012345"
  assert.equal(to18CharId("ABCDEabcde00000"), "ABCDEabcde000005AA");
});

test("to18CharId: 単一 bit セット (1 位置だけ大文字) → 補完表の対応文字", () => {
  // 'A' を j=0 に置くと bit 0 のみ → bits=1 → 'B'
  assert.equal(to18CharId("Aaaaaaaaaaaaaaa"), "AaaaaaaaaaaaaaaBAA");
  // 'A' を j=1 に置くと bit 1 のみ → bits=2 → 'C'
  assert.equal(to18CharId("aAaaaaaaaaaaaaa"), "aAaaaaaaaaaaaaaCAA");
});

test("to18CharId: 全て小文字 → suffix は AAA", () => {
  // 大文字 bit が一つも立たないので index 0 = 'A' が 3 つ
  assert.equal(to18CharId("aaaaaaaaaaaaaaa"), "aaaaaaaaaaaaaaaAAA");
});

test("to18CharId: 全て大文字 → suffix は 555 (全 bit 立つ = index 31 = '5')", () => {
  // 5 bit すべて立つと 0b11111 = 31 → "ABCDEFGHIJKLMNOPQRSTUVWXYZ012345"[31] = '5'
  assert.equal(to18CharId("AAAAAAAAAAAAAAA"), "AAAAAAAAAAAAAAA555");
});

test("to18CharId: 15 文字以外は null", () => {
  assert.equal(to18CharId("001"), null);
  assert.equal(to18CharId("0015000000009WArXX"), null); // 18 文字を入れても null
  assert.equal(to18CharId(""), null);
  assert.equal(to18CharId(null), null);
  assert.equal(to18CharId(undefined), null);
});

test("to18CharId: User Id (005...) も標準算法で変換できる", () => {
  // 005で始まる User Id の代表例 (大文字パターン違いで suffix が変わる)
  // パターンを実装の式で計算して期待値を取得
  const id15 = "0055g00000ABCdE";
  const out = to18CharId(id15);
  assert.ok(out !== null);
  assert.equal(out.length, 18);
  assert.ok(out.startsWith(id15));
});

// --- lookupPrefix ------------------------------------------------------------

test("lookupPrefix: 001 → Account", () => {
  assert.equal(lookupPrefix("0015g00000ABCDEF"), "Account");
});

test("lookupPrefix: 003 → Contact / 005 → User / 006 → Opportunity / 00Q → Lead / 500 → Case", () => {
  assert.equal(lookupPrefix("003abc"), "Contact");
  assert.equal(lookupPrefix("005xyz"), "User");
  assert.equal(lookupPrefix("006foo"), "Opportunity");
  assert.equal(lookupPrefix("00Qlead"), "Lead");
  assert.equal(lookupPrefix("500case"), "Case");
});

test("lookupPrefix: 未知の prefix は 'Custom or Unknown'", () => {
  assert.equal(lookupPrefix("ZZZcustom"), "Custom or Unknown");
});

test("lookupPrefix: 空 / null は null", () => {
  assert.equal(lookupPrefix(""), null);
  assert.equal(lookupPrefix(null), null);
  assert.equal(lookupPrefix(undefined), null);
});

test("lookupPrefix: case-sensitive (00q ≠ 00Q)", () => {
  // KEY_PREFIX_MAP は 00Q (大文字) のみ定義。小文字 00q は未登録なので Unknown
  assert.equal(lookupPrefix("00qabc"), "Custom or Unknown");
  assert.equal(lookupPrefix("00Qabc"), "Lead");
});

test("KEY_PREFIX_MAP: 主要標準オブジェクトキーが揃っている", () => {
  // 業務でよく使う一覧の存在チェック
  const required = ["001", "003", "005", "006", "00Q", "500", "701", "800", "01p", "012"];
  for (const k of required) {
    assert.ok(KEY_PREFIX_MAP[k], `KEY_PREFIX_MAP に ${k} がない`);
  }
});

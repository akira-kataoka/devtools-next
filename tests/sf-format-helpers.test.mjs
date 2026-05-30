// v3.454.0 Phase 544: sf-format-helpers.js の純粋関数ユニットテスト
// v3.462.0 Phase 552: escHtml を追加 (panel/popup/picker/design-docs の重複実装を集約)
// v3.463.0 Phase 553: 現在ユーザーリアルタイム表示の純粋関数 (userInitials / relativeTimeJa / formatCurrentUser) を追加

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  tsForFilename, tsForFilenameCompact, formatError, escHtml,
  userInitials, relativeTimeJa, formatCurrentUser,
  escapeSoqlLiteral,
  userChipStateClasses,
  popoverPosition,
  formatSfDateTime,
  formatSfDateTimeLoose,
  escXml,
  escSoslKeyword,
  escMdTableCell,
  parseClipboardRecords,
  validateBulkOpRequiredColumns,
  summarizeBulkResults,
  bulkOpEmoji, bulkOpLabel,
  filterByNameLabel,
  safeJsonParse,
  csvEscapeCell,
} from "../js/sf-format-helpers.js";

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

// --- tsForFilenameCompact (Phase 574) -----------------------------------------

test("tsForFilenameCompact: 引数なしは現在時刻ベース、14 文字、'YYYYMMDDHHmmss' 形式", () => {
  const out = tsForFilenameCompact();
  assert.equal(out.length, 14, `expected 14 chars: ${out}`);
  assert.match(out, /^\d{14}$/);
});

test("tsForFilenameCompact: UTC ベース (toISOString)、tsForFilename とは異なるロジック", () => {
  // toISOString() は常に UTC を返すため、local timezone の影響を受けない
  const d = new Date(Date.UTC(2026, 4, 23, 15, 9, 30));
  assert.equal(tsForFilenameCompact(d), "20260523150930");
});

test("tsForFilenameCompact: 秒精度 (tsForFilename と違い秒を含む)", () => {
  const d1 = new Date(Date.UTC(2026, 4, 23, 15, 9, 0));
  const d2 = new Date(Date.UTC(2026, 4, 23, 15, 9, 59));
  assert.notEqual(tsForFilenameCompact(d1), tsForFilenameCompact(d2));
  assert.equal(tsForFilenameCompact(d1), "20260523150900");
  assert.equal(tsForFilenameCompact(d2), "20260523150959");
});

test("tsForFilenameCompact: 1 桁月日時分秒はゼロ埋め", () => {
  const d = new Date(Date.UTC(2026, 0, 1, 1, 5, 7));
  assert.equal(tsForFilenameCompact(d), "20260101010507");
});

test("tsForFilenameCompact: 区切り文字 (- T :) は全て除去される", () => {
  const out = tsForFilenameCompact();
  assert.ok(!out.includes("-"));
  assert.ok(!out.includes("T"));
  assert.ok(!out.includes(":"));
});

test("tsForFilenameCompact: tsForFilename とは戻り値の長さ / 形式が違うことを verify", () => {
  const d = new Date();
  assert.equal(tsForFilename(d).length, 13);   // YYYYMMDD-HHmm
  assert.equal(tsForFilenameCompact(d).length, 14); // YYYYMMDDHHmmss
  assert.notEqual(tsForFilename(d), tsForFilenameCompact(d));
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

// --- formatError 循環参照防御 (Phase 572) -------------------------------------

test("formatError: 循環参照オブジェクトでも TypeError を投げず String(d) フォールバック", () => {
  const circ = { name: "outer" };
  circ.self = circ;
  // 旧実装は JSON.stringify(circ) で TypeError を投げて panel.js displayApiError 全体が
  // 破綻していた。新実装は try/catch で String(circ) = "[object Object]" を返す。
  assert.doesNotThrow(() => formatError(circ));
  assert.equal(formatError(circ), "[object Object]");
});

test("formatError: 深いネスト循環参照も安全", () => {
  const a = { name: "a" };
  const b = { name: "b" };
  a.next = b;
  b.next = a;
  assert.doesNotThrow(() => formatError(a));
});

// --- formatError 単一オブジェクトエラー形式 (Phase 587) -----------------------

test("formatError: SF 単一オブジェクト {errorCode, message} → 'errorCode message'", () => {
  assert.equal(
    formatError({ errorCode: "INVALID_FIELD", message: "No such column 'Foo'" }),
    "INVALID_FIELD No such column 'Foo'",
  );
});

test("formatError: 単一オブジェクト errorCode のみ → trim でスペースなし", () => {
  assert.equal(formatError({ errorCode: "TIMEOUT" }), "TIMEOUT");
});

test("formatError: 単一オブジェクト message のみ → 先頭スペースなし", () => {
  assert.equal(formatError({ message: "Network error" }), "Network error");
});

test("formatError: 単一オブジェクト {error: ...} は OAuth として優先処理 (新分岐より先)", () => {
  // 旧 OAuth ハンドリングが先に勝つことを verify (新分岐の前に評価される)
  assert.equal(
    formatError({ error: "invalid_grant", error_description: "auth failure", message: "ignored" }),
    "auth failure",
  );
});

test("formatError: errorCode も message もない object → 既存通り JSON.stringify", () => {
  assert.equal(formatError({ foo: 1 }), '{"foo":1}');
});

test("formatError: 配列形式は新分岐に先取られず既存通り処理 (Phase 563 互換性)", () => {
  const d = [{ errorCode: "E1", message: "m1" }];
  assert.equal(formatError(d), "E1 m1");
});

// --- formatError statusCode フォールバック (Phase 597) -------------------------

test("formatError: Composite API の {statusCode, message} 形式 → 'statusCode message'", () => {
  assert.equal(
    formatError({ statusCode: "DUPLICATE_VALUE", message: "duplicate value found" }),
    "DUPLICATE_VALUE duplicate value found",
  );
});

test("formatError: errorCode と statusCode 両方ある場合は errorCode 優先", () => {
  assert.equal(
    formatError({ errorCode: "INVALID_FIELD", statusCode: "FIELD_ERROR", message: "x" }),
    "INVALID_FIELD x",
  );
});

test("formatError: statusCode のみ (message なし) → trim でスペースなし", () => {
  assert.equal(formatError({ statusCode: "REQUIRED_FIELD_MISSING" }), "REQUIRED_FIELD_MISSING");
});

test("formatError: statusCode 空 / errorCode 空でも message があれば表示", () => {
  // 既存の Phase 587 test と整合: message のみは「message」のみ表示
  assert.equal(formatError({ statusCode: "", message: "fallback" }), "fallback");
});

// --- formatError multi-error (Phase 563) --------------------------------------

test("formatError: 配列 2 件 → '[2件のエラー] code1 msg1 / code2 msg2'", () => {
  const d = [
    { errorCode: "INVALID_FIELD", message: "No such column 'Foo'" },
    { errorCode: "MALFORMED_QUERY", message: "Unexpected token" },
  ];
  assert.equal(
    formatError(d),
    "[2件のエラー] INVALID_FIELD No such column 'Foo' / MALFORMED_QUERY Unexpected token",
  );
});

test("formatError: 配列 3 件 → 全部表示 (MAX=3 で省略なし)", () => {
  const d = [
    { errorCode: "E1", message: "m1" },
    { errorCode: "E2", message: "m2" },
    { errorCode: "E3", message: "m3" },
  ];
  assert.equal(formatError(d), "[3件のエラー] E1 m1 / E2 m2 / E3 m3");
});

test("formatError: 配列 4 件以上 → 先頭 3 件 + '[...他N件]' 表記", () => {
  const d = [
    { errorCode: "E1", message: "m1" },
    { errorCode: "E2", message: "m2" },
    { errorCode: "E3", message: "m3" },
    { errorCode: "E4", message: "m4" },
    { errorCode: "E5", message: "m5" },
  ];
  assert.equal(formatError(d), "[5件のエラー] E1 m1 / E2 m2 / E3 m3 [...他2件]");
});

test("formatError: 配列複数件で一部要素が null や空でも skip して継続", () => {
  const d = [
    { errorCode: "OK", message: "first" },
    null,
    { errorCode: "OK2", message: "third" },
  ];
  // null は fmt() で "" を返し filter(Boolean) で除外、件数は元の 3 のまま
  assert.equal(formatError(d), "[3件のエラー] OK first / OK2 third");
});

// --- escHtml (Phase 552) ------------------------------------------------------

test("escHtml: 5 種の HTML 特殊文字を実体参照に置換", () => {
  assert.equal(escHtml("<div>"), "&lt;div&gt;");
  assert.equal(escHtml("a & b"), "a &amp; b");
  assert.equal(escHtml(`"x"`), "&quot;x&quot;");
  assert.equal(escHtml("'x'"), "&#39;x&#39;");
});

test("escHtml: 通常文字はそのまま (英数字・日本語)", () => {
  assert.equal(escHtml("hello world"), "hello world");
  assert.equal(escHtml("こんにちは"), "こんにちは");
});

test("escHtml: null / undefined は空文字 (旧 panel/popup の 'null' バグを修正)", () => {
  assert.equal(escHtml(null), "");
  assert.equal(escHtml(undefined), "");
});

test("escHtml: 空文字はそのまま", () => {
  assert.equal(escHtml(""), "");
});

test("escHtml: 数値は String() 経由でそのまま (HTML 特殊なし)", () => {
  assert.equal(escHtml(123), "123");
  assert.equal(escHtml(0), "0");
});

test("escHtml: 連続する特殊文字も全部置換 ('<<&&>>' → '&lt;&lt;&amp;&amp;&gt;&gt;')", () => {
  assert.equal(escHtml("<<&&>>"), "&lt;&lt;&amp;&amp;&gt;&gt;");
});

test("escHtml: 混在 (XSS 想定 '<script>alert(\"x\")</script>')", () => {
  assert.equal(
    escHtml(`<script>alert("x")</script>`),
    "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;",
  );
});

// --- userInitials (Phase 553) -------------------------------------------------

test("userInitials: 英語フルネーム → 各単語先頭の大文字 2 文字", () => {
  assert.equal(userInitials("Jane Doe"), "JD");
  assert.equal(userInitials("john smith"), "JS"); // 小文字も大文字化
});

test("userInitials: 3 単語以上は先頭 2 単語のみ", () => {
  assert.equal(userInitials("Mary Jane Watson"), "MJ");
});

test("userInitials: 日本語スペース区切り (姓 名) → 各先頭 1 文字", () => {
  assert.equal(userInitials("山田 太郎"), "山太");
});

test("userInitials: 1 トークンは先頭 2 文字", () => {
  assert.equal(userInitials("Madonna"), "MA");
  assert.equal(userInitials("admin"), "AD");
});

test("userInitials: 日本語 1 トークン (スペースなし) は先頭 2 文字", () => {
  assert.equal(userInitials("山田太郎"), "山田");
});

test("userInitials: サロゲートペア (絵文字) を 1 文字として扱う", () => {
  // Array.from で分割するため 🙂 は 1 文字
  assert.equal(userInitials("🙂😀"), "🙂😀");
});

test("userInitials: 空 / null / 空白のみ → '?'", () => {
  assert.equal(userInitials(""), "?");
  assert.equal(userInitials(null), "?");
  assert.equal(userInitials(undefined), "?");
  assert.equal(userInitials("   "), "?");
});

test("userInitials: 前後の空白・連続空白を無視", () => {
  assert.equal(userInitials("  Jane   Doe  "), "JD");
});

// --- relativeTimeJa (Phase 553) -----------------------------------------------

const NOW = new Date("2026-05-27T12:00:00Z");

test("relativeTimeJa: 60 秒未満は 'たった今'", () => {
  assert.equal(relativeTimeJa(new Date(NOW.getTime() - 30 * 1000), NOW), "たった今");
});

test("relativeTimeJa: 分単位", () => {
  assert.equal(relativeTimeJa(new Date(NOW.getTime() - 5 * 60 * 1000), NOW), "5分前");
  assert.equal(relativeTimeJa(new Date(NOW.getTime() - 59 * 60 * 1000), NOW), "59分前");
});

test("relativeTimeJa: 時間単位", () => {
  assert.equal(relativeTimeJa(new Date(NOW.getTime() - 3 * 3600 * 1000), NOW), "3時間前");
  assert.equal(relativeTimeJa(new Date(NOW.getTime() - 23 * 3600 * 1000), NOW), "23時間前");
});

test("relativeTimeJa: 日単位", () => {
  assert.equal(relativeTimeJa(new Date(NOW.getTime() - 2 * 86400 * 1000), NOW), "2日前");
  assert.equal(relativeTimeJa(new Date(NOW.getTime() - 29 * 86400 * 1000), NOW), "29日前");
});

test("relativeTimeJa: 30 日以上は YYYY-MM-DD 絶対表記", () => {
  const old = new Date(2026, 0, 1, 9, 30); // ローカル時刻ベース (getFullYear 等)
  assert.equal(relativeTimeJa(old, NOW), "2026-01-01");
});

test("relativeTimeJa: 60秒以上未来 → '未来' (時計ずれの範囲を超える)", () => {
  // Phase 562 で境界変更: 60s 未来は |diff|=60 で >=60 なので「未来」のまま
  assert.equal(relativeTimeJa(new Date(NOW.getTime() + 60 * 1000), NOW), "未来");
  assert.equal(relativeTimeJa(new Date(NOW.getTime() + 5 * 60 * 1000), NOW), "未来");
});

test("relativeTimeJa: Phase 562 — 60秒未満の未来 (時計ずれ) は '未来' でなく 'たった今'", () => {
  // 旧実装: -1秒 → "未来"。新実装: |diff|<60 で「たった今」
  assert.equal(relativeTimeJa(new Date(NOW.getTime() + 1 * 1000), NOW), "たった今");
  assert.equal(relativeTimeJa(new Date(NOW.getTime() + 30 * 1000), NOW), "たった今");
  assert.equal(relativeTimeJa(new Date(NOW.getTime() + 59 * 1000), NOW), "たった今");
});

test("relativeTimeJa: null / 空 / パース不能 → '-'", () => {
  assert.equal(relativeTimeJa(null, NOW), "-");
  assert.equal(relativeTimeJa("", NOW), "-");
  assert.equal(relativeTimeJa("not-a-date", NOW), "-");
});

test("relativeTimeJa: ISO 文字列も受け付ける", () => {
  assert.equal(relativeTimeJa("2026-05-27T11:00:00Z", NOW), "1時間前");
});

// --- formatCurrentUser (Phase 553) --------------------------------------------

test("formatCurrentUser: User レコード優先でマージ", () => {
  const out = formatCurrentUser({
    userInfo: { user_id: "005xxx", name: "UI Name", preferred_username: "ui@x.com", email: "ui@x.com", via: "chatter" },
    userRecord: {
      Id: "005AAA", Name: "山田 太郎", Username: "taro@example.com", Email: "taro@example.com",
      Alias: "tyamada", IsActive: true, LastLoginDate: "2026-05-27T11:00:00.000+0000",
      TimeZoneSidKey: "Asia/Tokyo", LanguageLocaleKey: "ja", UserType: "Standard",
      Profile: { Name: "システム管理者" }, UserRole: { Name: "営業部長" },
    },
  });
  assert.equal(out.id, "005AAA");
  assert.equal(out.name, "山田 太郎");
  assert.equal(out.username, "taro@example.com");
  assert.equal(out.profile, "システム管理者");
  assert.equal(out.role, "営業部長");
  assert.equal(out.userType, "Standard");
  assert.equal(out.isActive, true);
  assert.equal(out.timeZone, "Asia/Tokyo");
  assert.equal(out.language, "ja");
  assert.equal(out.alias, "tyamada");
  assert.equal(out.via, "chatter");
  assert.equal(out.initials, "山太");
});

test("formatCurrentUser: userRecord なし (SOQL 失敗) は userInfo で埋める", () => {
  const out = formatCurrentUser({
    userInfo: { user_id: "005zzz", name: "Jane Doe", preferred_username: "jane@x.com", email: "jane@x.com", via: "oauth2" },
    userRecord: null,
  });
  assert.equal(out.id, "005zzz");
  assert.equal(out.name, "Jane Doe");
  assert.equal(out.username, "jane@x.com");
  assert.equal(out.email, "jane@x.com");
  assert.equal(out.profile, "");
  assert.equal(out.role, "");
  assert.equal(out.isActive, null); // User レコードがないと不明 = null
  assert.equal(out.initials, "JD");
});

test("formatCurrentUser: Profile / UserRole が null でも落ちない", () => {
  const out = formatCurrentUser({
    userInfo: null,
    userRecord: { Id: "005bbb", Name: "Solo", Profile: null, UserRole: null, IsActive: false },
  });
  assert.equal(out.profile, "");
  assert.equal(out.role, "");
  assert.equal(out.isActive, false);
  assert.equal(out.name, "Solo");
});

test("formatCurrentUser: 引数なし / 全 null でもデフォルト構造を返す", () => {
  const out = formatCurrentUser();
  assert.equal(out.name, "(不明)");
  assert.equal(out.id, "");
  assert.equal(out.isActive, null);
  // initials は name "(不明)" の先頭 2 文字から導出 (この経路は chip 非表示なので実害なし)
  assert.equal(out.initials, userInitials("(不明)"));
});

test("formatCurrentUser: name は userRecord.Name → userInfo.name → username → email の順で決定", () => {
  // Name なし、userInfo.name なし → preferred_username
  const out = formatCurrentUser({
    userInfo: { preferred_username: "only-username@x.com" },
    userRecord: {},
  });
  assert.equal(out.name, "only-username@x.com");
});

// --- escapeSoqlLiteral (Phase 554) --------------------------------------------

test("escapeSoqlLiteral: 通常の Salesforce Id はそのまま (英数字は無変換)", () => {
  assert.equal(escapeSoqlLiteral("005xx000001Sv6mAAC"), "005xx000001Sv6mAAC");
});

test("escapeSoqlLiteral: 単一引用符を \\' にエスケープ", () => {
  assert.equal(escapeSoqlLiteral("O'Brien"), "O\\'Brien");
  // SOQL に埋めると ...WHERE Name = 'O\'Brien' となり構文破壊しない
});

test("escapeSoqlLiteral: バックスラッシュを先にエスケープ (\\ → \\\\)", () => {
  assert.equal(escapeSoqlLiteral("a\\b"), "a\\\\b");
});

test("escapeSoqlLiteral: バックスラッシュ + 引用符の順序 (二重エスケープにならない)", () => {
  // 入力 \'  → 期待 \\\'  (\ が \\、' が \' に独立変換)
  assert.equal(escapeSoqlLiteral("\\'"), "\\\\\\'");
});

test("escapeSoqlLiteral: 複数の引用符を全て置換", () => {
  assert.equal(escapeSoqlLiteral("'a'b'"), "\\'a\\'b\\'");
});

test("escapeSoqlLiteral: インジェクション試行 (' OR Id != '') を無害化", () => {
  // よくある SOQL インジェクションペイロード。全 quote がエスケープされ閉じない
  assert.equal(escapeSoqlLiteral("' OR Id != '"), "\\' OR Id != \\'");
});

test("escapeSoqlLiteral: null / undefined は空文字", () => {
  assert.equal(escapeSoqlLiteral(null), "");
  assert.equal(escapeSoqlLiteral(undefined), "");
});

test("escapeSoqlLiteral: 数値は String 化 (HTML escHtml と同じ null-safe 方針)", () => {
  assert.equal(escapeSoqlLiteral(123), "123");
});

test("escapeSoqlLiteral: 引用符もバックスラッシュも無い文字列は無変換 (日本語含む)", () => {
  assert.equal(escapeSoqlLiteral("山田太郎"), "山田太郎");
  assert.equal(escapeSoqlLiteral("Standard"), "Standard");
});

// --- userChipStateClasses (Phase 559) -----------------------------------------

const POLL = 30000;
const NOW_C = new Date("2026-05-30T14:30:00Z").getTime();
const userActive = { name: "Alice", isActive: true };
const userInactive = { name: "Bob", isActive: false };
const userUnknown = { name: "Carol" }; // isActive 未定義

test("userChipStateClasses: user=null → offline のみ true", () => {
  const r = userChipStateClasses({ user: null, lastFetchAt: NOW_C, pollMs: POLL, now: NOW_C });
  assert.equal(r.offline, true);
  assert.equal(r.stale, false);
  assert.equal(r.inactive, false);
  assert.deepEqual(r.classes, ["offline"]);
});

test("userChipStateClasses: user=undefined / 引数なし も offline 扱い", () => {
  assert.equal(userChipStateClasses().offline, true);
  assert.equal(userChipStateClasses({}).offline, true);
});

test("userChipStateClasses: active user・取得直後 → 全 false, classes 空", () => {
  const r = userChipStateClasses({ user: userActive, lastFetchAt: NOW_C, pollMs: POLL, now: NOW_C });
  assert.equal(r.offline, false);
  assert.equal(r.stale, false);
  assert.equal(r.inactive, false);
  assert.deepEqual(r.classes, []);
});

test("userChipStateClasses: stale 境界 — pollMs*2.2 ぴったりは stale ではない (> 厳格比較)", () => {
  const ms = POLL * 2.2; // 66000
  const r = userChipStateClasses({ user: userActive, lastFetchAt: NOW_C - ms, pollMs: POLL, now: NOW_C });
  assert.equal(r.stale, false);
});

test("userChipStateClasses: stale 境界 — pollMs*2.2 + 1ms は stale", () => {
  const ms = POLL * 2.2 + 1;
  const r = userChipStateClasses({ user: userActive, lastFetchAt: NOW_C - ms, pollMs: POLL, now: NOW_C });
  assert.equal(r.stale, true);
  assert.deepEqual(r.classes, ["stale"]);
});

test("userChipStateClasses: lastFetchAt=0 (未取得) は stale 扱いしない", () => {
  const r = userChipStateClasses({ user: userActive, lastFetchAt: 0, pollMs: POLL, now: NOW_C });
  assert.equal(r.stale, false);
});

test("userChipStateClasses: lastFetchAt=null/undefined も stale 扱いしない", () => {
  assert.equal(userChipStateClasses({ user: userActive, lastFetchAt: null, pollMs: POLL, now: NOW_C }).stale, false);
  assert.equal(userChipStateClasses({ user: userActive, lastFetchAt: undefined, pollMs: POLL, now: NOW_C }).stale, false);
});

test("userChipStateClasses: inactive user → inactive=true, classes に 'inactive'", () => {
  const r = userChipStateClasses({ user: userInactive, lastFetchAt: NOW_C, pollMs: POLL, now: NOW_C });
  assert.equal(r.inactive, true);
  assert.equal(r.offline, false);
  assert.deepEqual(r.classes, ["inactive"]);
});

test("userChipStateClasses: isActive=null/undefined は inactive 扱いしない (不明扱い)", () => {
  assert.equal(userChipStateClasses({ user: userUnknown, lastFetchAt: NOW_C, pollMs: POLL, now: NOW_C }).inactive, false);
  const userNullActive = { name: "Z", isActive: null };
  assert.equal(userChipStateClasses({ user: userNullActive, lastFetchAt: NOW_C, pollMs: POLL, now: NOW_C }).inactive, false);
});

test("userChipStateClasses: stale + inactive 同時 → 両方 true, classes = ['stale','inactive']", () => {
  const r = userChipStateClasses({
    user: userInactive,
    lastFetchAt: NOW_C - POLL * 3,
    pollMs: POLL,
    now: NOW_C,
  });
  assert.equal(r.stale, true);
  assert.equal(r.inactive, true);
  assert.deepEqual(r.classes, ["stale", "inactive"]);
});

test("userChipStateClasses: 未来時刻の lastFetchAt (時計ずれ) は stale 扱いしない", () => {
  const r = userChipStateClasses({ user: userActive, lastFetchAt: NOW_C + 5000, pollMs: POLL, now: NOW_C });
  assert.equal(r.stale, false); // 差が負なので pollMs*2.2 超にならない
});

// --- popoverPosition (Phase 560) ----------------------------------------------

test("popoverPosition: 通常配置 — chip 直下に gap=6 px、left は chip.left に揃う", () => {
  const r = popoverPosition({
    chipRect: { left: 100, bottom: 40 },
    viewportWidth: 1200,
    popoverWidth: 300,
  });
  assert.deepEqual(r, { top: 46, left: 100 });
});

test("popoverPosition: 右端近接 — viewportWidth - popoverWidth - edgePadding にクリップ", () => {
  // chip.left=900, viewport=1000, popover=300 → 900 + 300 = 1200 が右端超
  // クリップ: 1000 - 300 - 12 = 688
  const r = popoverPosition({
    chipRect: { left: 900, bottom: 40 },
    viewportWidth: 1000,
    popoverWidth: 300,
  });
  assert.equal(r.left, 688);
});

test("popoverPosition: 左端近接 — chip.left が minLeft(8) 未満なら 8 にクランプ", () => {
  const r = popoverPosition({
    chipRect: { left: 2, bottom: 40 },
    viewportWidth: 1200,
    popoverWidth: 300,
  });
  assert.equal(r.left, 8);
});

test("popoverPosition: chip.left が負 (画面外) でも minLeft にクランプ", () => {
  const r = popoverPosition({
    chipRect: { left: -50, bottom: 40 },
    viewportWidth: 1200,
    popoverWidth: 300,
  });
  assert.equal(r.left, 8);
});

test("popoverPosition: 非整数の chipRect を Math.round で整数化", () => {
  const r = popoverPosition({
    chipRect: { left: 100.7, bottom: 39.3 },
    viewportWidth: 1200,
    popoverWidth: 300,
  });
  assert.equal(r.top, 45);  // 39.3 + 6 = 45.3 → 45
  assert.equal(r.left, 101); // 100.7 → 101
});

test("popoverPosition: gap/edgePadding/minLeft をカスタマイズ可能", () => {
  const r = popoverPosition({
    chipRect: { left: 100, bottom: 40 },
    viewportWidth: 1200,
    popoverWidth: 300,
    gap: 10,
    edgePadding: 20,
    minLeft: 0,
  });
  assert.equal(r.top, 50); // 40 + 10
  assert.equal(r.left, 100); // 通常配置 (edgePadding/minLeft 影響なし)
});

test("popoverPosition: viewport より popover が大きい (狭画面) — minLeft が勝つ", () => {
  // viewport=300, popover=400 → 300 - 400 - 12 = -112 → max(8, -112) = 8
  const r = popoverPosition({
    chipRect: { left: 50, bottom: 40 },
    viewportWidth: 300,
    popoverWidth: 400,
  });
  assert.equal(r.left, 8);
});

test("popoverPosition: chipRect 必須 — 渡し忘れたら throw する (内部関数の契約として明示)", () => {
  // 実運用では panel.js が常に DOM 経由で chipRect を渡す。
  // 渡し忘れは呼び出し側のバグなので即時 throw で気づかせる方針 (silent NaN は避ける)。
  assert.throws(() => popoverPosition({ viewportWidth: 1200, popoverWidth: 300 }), TypeError);
});

// --- formatSfDateTime (Phase 565) ---------------------------------------------

test("formatSfDateTime: 標準 ISO (TZ +0900) → 'YYYY-MM-DD HH:MM'", () => {
  assert.equal(formatSfDateTime("2026-05-30T15:38:00.000+0900"), "2026-05-30 15:38");
});

test("formatSfDateTime: TZ Z (UTC) も同形式", () => {
  assert.equal(formatSfDateTime("2026-05-30T15:38:00Z"), "2026-05-30 15:38");
});

test("formatSfDateTime: 秒なし TZ ありも整形", () => {
  assert.equal(formatSfDateTime("2026-05-30T15:38+09:00"), "2026-05-30 15:38");
});

test("formatSfDateTime: TZ コロンなし (+0900) も整形", () => {
  assert.equal(formatSfDateTime("2026-05-30T15:38:00+0900"), "2026-05-30 15:38");
});

test("formatSfDateTime: date-only は match せず元文字列をそのまま返す (旧 isoRe + dateOnlyRe 等価)", () => {
  assert.equal(formatSfDateTime("2026-05-30"), "2026-05-30");
});

test("formatSfDateTime: 非 ISO 文字列はそのまま返す", () => {
  assert.equal(formatSfDateTime("not a date"), "not a date");
  assert.equal(formatSfDateTime("hello"), "hello");
});

test("formatSfDateTime: null / undefined / 空文字 → 空文字", () => {
  assert.equal(formatSfDateTime(null), "");
  assert.equal(formatSfDateTime(undefined), "");
  assert.equal(formatSfDateTime(""), "");
});

test("formatSfDateTime: 数値は String() 化して match 試行 (非 ISO のため文字列化のみ)", () => {
  assert.equal(formatSfDateTime(123), "123");
  assert.equal(formatSfDateTime(0), "0");
});

test("formatSfDateTime: T が無い '15:38:00' 単体は match しない", () => {
  assert.equal(formatSfDateTime("15:38:00"), "15:38:00");
});

test("formatSfDateTime: 不完全な日付 '2026-5-30T15:38Z' (1桁月) は match しない (\\d{2} 厳格)", () => {
  assert.equal(formatSfDateTime("2026-5-30T15:38Z"), "2026-5-30T15:38Z");
});

test("formatSfDateTime: prefix だけ ISO で末尾に garbage は match しない ($ 終端で anchor)", () => {
  // 旧 5 callsite と同じ anchored 挙動を verify
  assert.equal(formatSfDateTime("2026-05-30T15:38Z extra"), "2026-05-30T15:38Z extra");
});

// --- formatSfDateTimeLoose (Phase 566) ----------------------------------------

test("formatSfDateTimeLoose: ISO datetime prefix → 'YYYY-MM-DD HH:MM'", () => {
  assert.equal(formatSfDateTimeLoose("2026-05-30T15:38"), "2026-05-30 15:38");
  assert.equal(formatSfDateTimeLoose("2026-05-30T15:38:00.000+0900"), "2026-05-30 15:38");
});

test("formatSfDateTimeLoose: prefix 一致なので末尾 garbage も OK (anchored 版との違い)", () => {
  assert.equal(formatSfDateTimeLoose("2026-05-30T15:38Z extra junk"), "2026-05-30 15:38");
});

test("formatSfDateTimeLoose: date-only は T が必要なので非マッチ → 元文字列", () => {
  assert.equal(formatSfDateTimeLoose("2026-05-30"), "2026-05-30");
});

test("formatSfDateTimeLoose: 非 ISO 文字列はそのまま", () => {
  assert.equal(formatSfDateTimeLoose("not iso"), "not iso");
});

test("formatSfDateTimeLoose: null/undefined/空 → 空文字 (formatSfDateTime と同じ防御)", () => {
  assert.equal(formatSfDateTimeLoose(null), "");
  assert.equal(formatSfDateTimeLoose(undefined), "");
  assert.equal(formatSfDateTimeLoose(""), "");
});

test("formatSfDateTimeLoose: 数値は String() 化 (非 ISO のため文字列化のみ)", () => {
  assert.equal(formatSfDateTimeLoose(123), "123");
});

test("formatSfDateTimeLoose: '2026-5-30T15:38' (1桁月) は \\d{2} 厳格で非マッチ", () => {
  assert.equal(formatSfDateTimeLoose("2026-5-30T15:38"), "2026-5-30T15:38");
});

// --- escXml (Phase 567) -------------------------------------------------------

test("escXml: 5 種の XML 特殊文字を実体参照に置換 (HTML と違い ' は &apos;)", () => {
  assert.equal(escXml("<tag>"), "&lt;tag&gt;");
  assert.equal(escXml("a & b"), "a &amp; b");
  assert.equal(escXml(`"x"`), "&quot;x&quot;");
  assert.equal(escXml("'x'"), "&apos;x&apos;");
});

test("escXml: escHtml との違い — single quote は &apos; (XML 公式) vs &#39; (HTML 推奨)", () => {
  assert.equal(escXml("'"), "&apos;");
  assert.equal(escHtml("'"), "&#39;");
});

test("escXml: 通常文字はそのまま (英数字・日本語)", () => {
  assert.equal(escXml("hello world"), "hello world");
  assert.equal(escXml("山田 太郎"), "山田 太郎");
});

test("escXml: null / undefined は空文字 (escHtml と同じ防御)", () => {
  assert.equal(escXml(null), "");
  assert.equal(escXml(undefined), "");
});

test("escXml: 数値も String 化 (XML body 埋込時の安全策)", () => {
  assert.equal(escXml(123), "123");
});

test("escXml: 連続する特殊文字も全て置換", () => {
  assert.equal(escXml("<<>>&&"), "&lt;&lt;&gt;&gt;&amp;&amp;");
});

test("escXml: XML インジェクション想定 — '</password>' を無害化", () => {
  // SOAP envelope に埋め込まれる username/password がこのパターンで攻撃された場合
  assert.equal(escXml("</password>"), "&lt;/password&gt;");
});

test("escXml: & が先に escape されるため二重 escape にならない (順序保証)", () => {
  // & を &amp; に置換した後で < を &lt; に置換するため、置換結果の & はもう走査されない
  assert.equal(escXml("&<"), "&amp;&lt;");
  // 既存の &amp; が再度 escape されないことの間接 verify
  assert.equal(escXml("&"), "&amp;");
});

// --- escSoslKeyword (Phase 570) -----------------------------------------------

test("escSoslKeyword: 通常文字はそのまま (英数字・日本語)", () => {
  assert.equal(escSoslKeyword("hello"), "hello");
  assert.equal(escSoslKeyword("山田太郎"), "山田太郎");
});

test("escSoslKeyword: 単一引用符を \\' にエスケープ", () => {
  assert.equal(escSoslKeyword("O'Brien"), "O\\'Brien");
});

test("escSoslKeyword: バックスラッシュを \\\\ にエスケープ (\\先 → '後)", () => {
  assert.equal(escSoslKeyword("a\\b"), "a\\\\b");
});

test("escSoslKeyword: * と ? は意図的に escape しない (ワイルドカード許容)", () => {
  // 呼出側で後段に部分一致 wildcard 化処理があるため、* / ? はそのまま
  assert.equal(escSoslKeyword("hello*"), "hello*");
  assert.equal(escSoslKeyword("a?b"), "a?b");
});

test("escSoslKeyword: null / undefined / 空 → 空文字 (他 esc 系と統一)", () => {
  assert.equal(escSoslKeyword(null), "");
  assert.equal(escSoslKeyword(undefined), "");
  assert.equal(escSoslKeyword(""), "");
});

test("escSoslKeyword: 数値も String 化", () => {
  assert.equal(escSoslKeyword(123), "123");
});

test("escSoslKeyword: 実装は escapeSoqlLiteral と同等だが semantic context が別 (将来 SOSL 仕様変更で divergence 可能)", () => {
  // 同じ入力で同じ output を期待 (現時点では一致)
  assert.equal(escSoslKeyword("O'Brien\\path"), escapeSoqlLiteral("O'Brien\\path"));
  // この同等性は実装の偶然であり契約ではない、という意図を test で明示
});

// --- escMdTableCell (Phase 571) -----------------------------------------------

test("escMdTableCell: 通常テキストはそのまま", () => {
  assert.equal(escMdTableCell("hello"), "hello");
  assert.equal(escMdTableCell("山田太郎"), "山田太郎");
});

test("escMdTableCell: pipe `|` を `\\|` にエスケープ (Markdown テーブル区切りとの衝突回避)", () => {
  assert.equal(escMdTableCell("a|b"), "a\\|b");
  assert.equal(escMdTableCell("|||"), "\\|\\|\\|");
});

test("escMdTableCell: LF / CRLF 改行を単一スペースに正規化", () => {
  assert.equal(escMdTableCell("a\nb"), "a b");
  assert.equal(escMdTableCell("a\r\nb"), "a b");
  assert.equal(escMdTableCell("a\nb\nc"), "a b c");
});

test("escMdTableCell: pipe と改行が両方混在しても正しく処理", () => {
  assert.equal(escMdTableCell("a|b\nc|d"), "a\\|b c\\|d");
});

test("escMdTableCell: null / undefined / 空 → 空文字", () => {
  assert.equal(escMdTableCell(null), "");
  assert.equal(escMdTableCell(undefined), "");
  assert.equal(escMdTableCell(""), "");
});

test("escMdTableCell: 数値も String 化", () => {
  assert.equal(escMdTableCell(123), "123");
  assert.equal(escMdTableCell(0), "0");
});

test("escMdTableCell: 他の Markdown 特殊文字 (*, _, `, [, ]) は escape しない (セル内ではレンダラがそのまま扱う)", () => {
  assert.equal(escMdTableCell("**bold**"), "**bold**");
  assert.equal(escMdTableCell("_italic_"), "_italic_");
  assert.equal(escMdTableCell("`code`"), "`code`");
  assert.equal(escMdTableCell("[link](url)"), "[link](url)");
});

// --- parseClipboardRecords (Phase 579) ----------------------------------------

test("parseClipboardRecords: Excel paste (TAB 区切り) → 区切り自動判定 + records", () => {
  const text = "Id\tName\tEmail\n001A\tAlice\ta@x.com\n001B\tBob\tb@x.com";
  const r = parseClipboardRecords(text);
  assert.equal(r.delimiter, "\t");
  assert.deepEqual(r.headers, ["Id", "Name", "Email"]);
  assert.equal(r.records.length, 2);
  assert.deepEqual(r.records[0], { Id: "001A", Name: "Alice", Email: "a@x.com" });
  assert.deepEqual(r.records[1], { Id: "001B", Name: "Bob", Email: "b@x.com" });
});

test("parseClipboardRecords: CSV (comma 区切り) → 区切り自動判定", () => {
  const text = "Id,Name\n001A,Alice\n001B,Bob";
  const r = parseClipboardRecords(text);
  assert.equal(r.delimiter, ",");
  assert.deepEqual(r.headers, ["Id", "Name"]);
  assert.equal(r.records.length, 2);
});

test("parseClipboardRecords: 空文字 / null / 空白のみ → 空 result", () => {
  assert.deepEqual(parseClipboardRecords("").records, []);
  assert.deepEqual(parseClipboardRecords(null).records, []);
  assert.deepEqual(parseClipboardRecords("   \n\n").records, []);
});

test("parseClipboardRecords: クォート内のカンマ / 改行は値の一部として扱う (RFC4180 風)", () => {
  const text = `Name,Memo\n"O'Brien","line1\nline2"\n"Smith","a,b,c"`;
  const r = parseClipboardRecords(text);
  assert.equal(r.records.length, 2);
  assert.equal(r.records[0].Memo, "line1\nline2");
  assert.equal(r.records[1].Memo, "a,b,c");
});

test("parseClipboardRecords: クォート内の `\"\"` は `\"` にデコード", () => {
  const text = `Name\n"He said ""hi"""`;
  const r = parseClipboardRecords(text);
  assert.equal(r.records[0].Name, 'He said "hi"');
});

test("parseClipboardRecords: 列数不一致の行は skip し skipped カウント", () => {
  const text = "A,B,C\n1,2,3\n1,2\n1,2,3,4\n5,6,7";
  const r = parseClipboardRecords(text);
  assert.equal(r.records.length, 2); // 1,2,3 と 5,6,7
  assert.equal(r.skipped, 2); // 1,2 と 1,2,3,4
});

test("parseClipboardRecords: opts.delimiter 明示で自動判定を上書き", () => {
  const text = "A,B\n1,2"; // CSV だが TAB と指定するとヘッダー 1 列扱い
  const r = parseClipboardRecords(text, { delimiter: "\t" });
  assert.equal(r.delimiter, "\t");
  assert.equal(r.headers.length, 1); // "A,B" 1 列
});

test("parseClipboardRecords: CRLF 改行も LF と同等扱い", () => {
  const text = "Id,Name\r\n001A,Alice\r\n001B,Bob\r\n";
  const r = parseClipboardRecords(text);
  assert.equal(r.records.length, 2);
});

test("parseClipboardRecords: 末尾改行 + 末尾空白行は無視", () => {
  const text = "Id,Name\n001A,Alice\n\n\n";
  const r = parseClipboardRecords(text);
  assert.equal(r.records.length, 1);
});

test("parseClipboardRecords: ヘッダー名は trim される (Excel コピーで末尾空白混入対策)", () => {
  const text = " Id \t Name \n001A\tAlice";
  const r = parseClipboardRecords(text);
  assert.deepEqual(r.headers, ["Id", "Name"]);
  assert.equal(r.records[0].Id, "001A");
});

test("parseClipboardRecords: 1 行 (ヘッダーのみ) → records 空", () => {
  const r = parseClipboardRecords("Id,Name");
  assert.deepEqual(r.headers, ["Id", "Name"]);
  assert.equal(r.records.length, 0);
});

test("parseClipboardRecords: Phase 601 — 先頭 BOM (U+FEFF) を strip して headers が正しく取れる", () => {
  // Excel paste / 一部 export ツールは先頭に BOM を付けることがある
  const text = "﻿Id,Name\n001A,Alice";
  const r = parseClipboardRecords(text);
  assert.deepEqual(r.headers, ["Id", "Name"]);
  assert.equal(r.records.length, 1);
  assert.equal(r.records[0].Id, "001A");
});

test("parseClipboardRecords: 自動判定は TAB と comma の出現数比較 (TAB >= comma → TAB)", () => {
  // tab 2 個 vs comma 1 個 → TAB
  const r1 = parseClipboardRecords("a\tb\tc,d\n1\t2\t3");
  assert.equal(r1.delimiter, "\t");
  // comma 3 個 vs tab 0 個 → CSV
  const r2 = parseClipboardRecords("a,b,c,d\n1,2,3,4");
  assert.equal(r2.delimiter, ",");
});

// --- validateBulkOpRequiredColumns (Phase 583) --------------------------------

test("validateBulkOpRequiredColumns: insert は Id 不要 (canExecute=true)", () => {
  const r = validateBulkOpRequiredColumns({ op: "insert", headers: ["Name", "Email"] });
  assert.equal(r.canExecute, true);
  assert.deepEqual(r.warnings, []);
});

test("validateBulkOpRequiredColumns: update はヘッダーに Id があれば OK", () => {
  const r = validateBulkOpRequiredColumns({ op: "update", headers: ["Id", "Name"] });
  assert.equal(r.canExecute, true);
});

test("validateBulkOpRequiredColumns: update で Id 列なし → 警告", () => {
  const r = validateBulkOpRequiredColumns({ op: "update", headers: ["Name"] });
  assert.equal(r.canExecute, false);
  assert.equal(r.warnings.length, 1);
  assert.match(r.warnings[0], /update には Id カラムが必要/);
});

test("validateBulkOpRequiredColumns: delete で Id 列なし → 警告", () => {
  const r = validateBulkOpRequiredColumns({ op: "delete", headers: ["Name"] });
  assert.equal(r.canExecute, false);
  assert.match(r.warnings[0], /delete には Id カラムが必要/);
});

test("validateBulkOpRequiredColumns: upsert で extId 未指定 → 警告", () => {
  const r = validateBulkOpRequiredColumns({ op: "upsert", extId: "", headers: ["Name", "Email"] });
  assert.equal(r.canExecute, false);
  assert.match(r.warnings[0], /upsert には External ID Field 名の指定が必要/);
});

test("validateBulkOpRequiredColumns: upsert で extId 指定ありだが headers に無い → 警告", () => {
  const r = validateBulkOpRequiredColumns({ op: "upsert", extId: "External_Id__c", headers: ["Name"] });
  assert.equal(r.canExecute, false);
  assert.match(r.warnings[0], /"External_Id__c" がヘッダーに見つかりません/);
});

test("validateBulkOpRequiredColumns: upsert で extId 指定 + headers に存在 → OK", () => {
  const r = validateBulkOpRequiredColumns({
    op: "upsert", extId: "External_Id__c",
    headers: ["External_Id__c", "Name"],
  });
  assert.equal(r.canExecute, true);
  assert.deepEqual(r.warnings, []);
});

test("validateBulkOpRequiredColumns: headers が undefined / 非配列でも throw しない", () => {
  assert.equal(validateBulkOpRequiredColumns({ op: "insert" }).canExecute, true);
  assert.equal(validateBulkOpRequiredColumns({ op: "update", headers: null }).canExecute, false);
});

// --- summarizeBulkResults (Phase 592) -----------------------------------------

test("summarizeBulkResults: 全件成功 → ok=total, fail=0, topErrors 空", () => {
  const r = summarizeBulkResults([
    { success: true, id: "001A" },
    { success: true, id: "001B" },
    { success: true, id: "001C" },
  ]);
  assert.deepEqual(r, { total: 3, ok: 3, fail: 0, topErrors: [] });
});

test("summarizeBulkResults: 全件失敗 → ok=0, fail=total, errors 集約", () => {
  const r = summarizeBulkResults([
    { success: false, errors: [{ statusCode: "INVALID_FIELD", message: "bad" }] },
    { success: false, errors: [{ statusCode: "INVALID_FIELD", message: "bad" }] },
    { success: false, errors: [{ statusCode: "REQUIRED_FIELD_MISSING", message: "missing" }] },
  ]);
  assert.equal(r.ok, 0);
  assert.equal(r.fail, 3);
  assert.equal(r.topErrors.length, 2);
  assert.equal(r.topErrors[0].statusCode, "INVALID_FIELD");
  assert.equal(r.topErrors[0].count, 2);
});

test("summarizeBulkResults: topErrors は count 降順、上位 3 件まで", () => {
  const r = summarizeBulkResults([
    { success: false, errors: [{ statusCode: "E1" }] },
    { success: false, errors: [{ statusCode: "E1" }] },
    { success: false, errors: [{ statusCode: "E2" }] },
    { success: false, errors: [{ statusCode: "E3" }] },
    { success: false, errors: [{ statusCode: "E4" }] },
  ]);
  assert.equal(r.topErrors.length, 3);
  assert.equal(r.topErrors[0].statusCode, "E1");
  assert.equal(r.topErrors[0].count, 2);
});

test("summarizeBulkResults: 部分成功 → 数を正確に集計", () => {
  const r = summarizeBulkResults([
    { success: true, id: "001" },
    { success: false, errors: [{ statusCode: "X" }] },
    { success: true, id: "002" },
  ]);
  assert.deepEqual({ total: r.total, ok: r.ok, fail: r.fail }, { total: 3, ok: 2, fail: 1 });
});

test("summarizeBulkResults: statusCode 欠落の error は '(コードなし)' で grouping", () => {
  const r = summarizeBulkResults([
    { success: false, errors: [{ message: "詳細なし" }] },
  ]);
  assert.equal(r.topErrors[0].statusCode, "(コードなし)");
});

test("summarizeBulkResults: errors 配列が空 / 欠落でも safe", () => {
  const r = summarizeBulkResults([
    { success: false, errors: [] },
    { success: false }, // errors なし
  ]);
  assert.equal(r.fail, 2);
  assert.equal(r.topErrors[0].statusCode, "(コードなし)");
  assert.equal(r.topErrors[0].count, 2);
});

test("summarizeBulkResults: null / undefined / 非配列 → 全 0", () => {
  assert.deepEqual(summarizeBulkResults(null), { total: 0, ok: 0, fail: 0, topErrors: [] });
  assert.deepEqual(summarizeBulkResults(undefined), { total: 0, ok: 0, fail: 0, topErrors: [] });
  assert.deepEqual(summarizeBulkResults("not array"), { total: 0, ok: 0, fail: 0, topErrors: [] });
});

test("summarizeBulkResults: sample message は最初の error から取る", () => {
  const r = summarizeBulkResults([
    { success: false, errors: [{ statusCode: "DUP", message: "duplicate value" }] },
  ]);
  assert.equal(r.topErrors[0].sample, "duplicate value");
});

// --- bulkOpEmoji / bulkOpLabel (Phase 594) ------------------------------------

test("bulkOpEmoji: 4 op それぞれ正しい絵文字", () => {
  assert.equal(bulkOpEmoji("insert"), "📝");
  assert.equal(bulkOpEmoji("update"), "🔄");
  assert.equal(bulkOpEmoji("upsert"), "↕️");
  assert.equal(bulkOpEmoji("delete"), "🗑️");
});

test("bulkOpEmoji: 未知の op / null / undefined → '?'", () => {
  assert.equal(bulkOpEmoji("foo"), "?");
  assert.equal(bulkOpEmoji(""), "?");
  assert.equal(bulkOpEmoji(null), "?");
  assert.equal(bulkOpEmoji(undefined), "?");
});

test("bulkOpLabel: 4 op で '絵文字 英名' 形式", () => {
  assert.equal(bulkOpLabel("insert"), "📝 Insert");
  assert.equal(bulkOpLabel("update"), "🔄 Update");
  assert.equal(bulkOpLabel("upsert"), "↕️ Upsert");
  assert.equal(bulkOpLabel("delete"), "🗑️ Delete");
});

test("bulkOpLabel: 未知の op は そのまま op を表示 ('? <op>')", () => {
  assert.equal(bulkOpLabel("custom"), "? custom");
});

test("bulkOpLabel: null / undefined / 空 → '? ?'", () => {
  assert.equal(bulkOpLabel(null), "? ?");
  assert.equal(bulkOpLabel(undefined), "? ?");
  assert.equal(bulkOpLabel(""), "? ?");
});

// --- filterByNameLabel (Phase 599) --------------------------------------------

const sampleItems = [
  { name: "Account", label: "取引先" },
  { name: "Contact", label: "取引先責任者" },
  { name: "Opportunity", label: "商談" },
  { name: "Custom_Obj__c", label: "カスタム" },
];

test("filterByNameLabel: query 空 → 元配列をそのまま (フィルタなし)", () => {
  assert.equal(filterByNameLabel(sampleItems, ""), sampleItems);
  assert.equal(filterByNameLabel(sampleItems, null), sampleItems);
  assert.equal(filterByNameLabel(sampleItems, undefined), sampleItems);
});

test("filterByNameLabel: name 前方一致 (case-insensitive)", () => {
  const r = filterByNameLabel(sampleItems, "ac");
  assert.equal(r.length, 1);
  assert.equal(r[0].name, "Account");
});

test("filterByNameLabel: name 大文字 query も小文字化されてマッチ", () => {
  const r = filterByNameLabel(sampleItems, "CONT");
  assert.equal(r.length, 1);
  assert.equal(r[0].name, "Contact");
});

test("filterByNameLabel: label 部分一致 (日本語含む)", () => {
  const r = filterByNameLabel(sampleItems, "商談");
  assert.equal(r.length, 1);
  assert.equal(r[0].name, "Opportunity");
});

test("filterByNameLabel: name prefix と label 部分一致は OR (どちらかマッチで採用)", () => {
  // "取引" は Account/Contact 両方の label に含まれる
  const r = filterByNameLabel(sampleItems, "取引");
  assert.equal(r.length, 2);
});

test("filterByNameLabel: label が name に substring としても含まれる場合", () => {
  // "custom" は Custom_Obj__c の name 前方一致 (小文字化後)
  const r = filterByNameLabel(sampleItems, "custom");
  assert.equal(r.length, 1);
  assert.equal(r[0].name, "Custom_Obj__c");
});

test("filterByNameLabel: マッチなし → 空配列", () => {
  const r = filterByNameLabel(sampleItems, "Zzz");
  assert.deepEqual(r, []);
});

test("filterByNameLabel: items が null / 非配列でも throw しない", () => {
  assert.deepEqual(filterByNameLabel(null, "x"), []);
  assert.deepEqual(filterByNameLabel(undefined, "x"), []);
  assert.deepEqual(filterByNameLabel("not array", "x"), []);
});

test("filterByNameLabel: name / label が無い item でも throw しない", () => {
  const r = filterByNameLabel([{}, { name: "X" }, { label: "Y" }], "x");
  assert.equal(r.length, 1); // {name:"X"} のみ
});

test("filterByNameLabel: query の前後 trim", () => {
  const r = filterByNameLabel(sampleItems, "  ac  ");
  assert.equal(r.length, 1);
  assert.equal(r[0].name, "Account");
});

// --- safeJsonParse (Phase 603) ------------------------------------------------

test("safeJsonParse: 正常な JSON 文字列 → パース結果", () => {
  assert.deepEqual(safeJsonParse('{"a":1,"b":"x"}'), { a: 1, b: "x" });
  assert.deepEqual(safeJsonParse("[1,2,3]"), [1, 2, 3]);
  assert.equal(safeJsonParse("true"), true);
  assert.equal(safeJsonParse("42"), 42);
});

test("safeJsonParse: null / undefined / 空文字 → fallback (default null)", () => {
  assert.equal(safeJsonParse(null), null);
  assert.equal(safeJsonParse(undefined), null);
  assert.equal(safeJsonParse(""), null);
});

test("safeJsonParse: 非文字列 (数値/オブジェクト) → fallback", () => {
  assert.equal(safeJsonParse(42), null);
  assert.equal(safeJsonParse({}), null);
  assert.equal(safeJsonParse([1, 2]), null);
});

test("safeJsonParse: parse 失敗 → fallback", () => {
  assert.equal(safeJsonParse("not json"), null);
  assert.equal(safeJsonParse("{bad: 1"), null);
  assert.equal(safeJsonParse("<html>error</html>"), null);
});

test("safeJsonParse: カスタム fallback (sf-api semantics) — 失敗時は raw text 保持", () => {
  assert.equal(safeJsonParse("not json", "not json"), "not json");
  // sfFetch のケース: HTML エラーページが返ってきた時に caller に元 text を渡す
  assert.equal(safeJsonParse("<html>500</html>", "<html>500</html>"), "<html>500</html>");
});

test("safeJsonParse: カスタム fallback (sf-connections semantics) — 失敗・空 ともに null", () => {
  assert.equal(safeJsonParse(null, null), null);
  assert.equal(safeJsonParse("garbage", null), null);
});

test("safeJsonParse: 空文字 + 非null fallback → fallback", () => {
  // empty string も fallback を返す (非 string check より前に early return)
  assert.equal(safeJsonParse("", "default"), "default");
});

test("safeJsonParse: 入れ子オブジェクト / 配列も正しく parse", () => {
  const json = '{"users":[{"id":1,"name":"a"},{"id":2,"name":"b"}],"meta":{"count":2}}';
  const parsed = safeJsonParse(json);
  assert.equal(parsed.users.length, 2);
  assert.equal(parsed.users[1].name, "b");
  assert.equal(parsed.meta.count, 2);
});

// --- csvEscapeCell (Phase 604) ------------------------------------------------

test("csvEscapeCell: 通常文字列はそのまま返す (no special char)", () => {
  assert.equal(csvEscapeCell("hello"), "hello");
  assert.equal(csvEscapeCell("Account Name"), "Account Name");
  assert.equal(csvEscapeCell("12345"), "12345");
});

test("csvEscapeCell: カンマ・改行・タブ・ダブルクォートを含む値は \"..\" でクォート", () => {
  assert.equal(csvEscapeCell("a,b"), `"a,b"`);
  assert.equal(csvEscapeCell("a\nb"), `"a\nb"`);
  assert.equal(csvEscapeCell("a\tb"), `"a\tb"`);
  assert.equal(csvEscapeCell("a\rb"), `"a\rb"`); // Phase 604 厳密化: \r も quote 対象
  assert.equal(csvEscapeCell('say "hi"'), `"say ""hi"""`);
});

test("csvEscapeCell: null / undefined は空文字を返す (デフォルト)", () => {
  assert.equal(csvEscapeCell(null), "");
  assert.equal(csvEscapeCell(undefined), "");
});

test("csvEscapeCell: null / undefined with alwaysQuote → \"\"", () => {
  assert.equal(csvEscapeCell(null, { alwaysQuote: true }), `""`);
  assert.equal(csvEscapeCell(undefined, { alwaysQuote: true }), `""`);
});

test("csvEscapeCell: 数値・boolean は文字列化", () => {
  assert.equal(csvEscapeCell(42), "42");
  assert.equal(csvEscapeCell(0), "0");
  assert.equal(csvEscapeCell(true), "true");
  assert.equal(csvEscapeCell(false), "false");
});

test("csvEscapeCell: object/array は JSON.stringify した上で判定", () => {
  // JSON 出力に必ず { や [ や " が含まれるため、結果としてクォートされる
  assert.equal(csvEscapeCell({ a: 1 }), `"{""a"":1}"`);
  assert.equal(csvEscapeCell([1, 2]), `"[1,2]"`);
});

test("csvEscapeCell: alwaysQuote=true は特殊文字を含まない値も必ずクォート (sf-api/Limits CSV semantics)", () => {
  assert.equal(csvEscapeCell("hello", { alwaysQuote: true }), `"hello"`);
  assert.equal(csvEscapeCell("12345", { alwaysQuote: true }), `"12345"`);
  assert.equal(csvEscapeCell(42, { alwaysQuote: true }), `"42"`);
});

test("csvEscapeCell: alwaysQuote=true でも値内の \" は \"\" にエスケープ", () => {
  assert.equal(csvEscapeCell('say "hi"', { alwaysQuote: true }), `"say ""hi"""`);
});

test("csvEscapeCell: opts 未指定は alwaysQuote=false 扱い", () => {
  assert.equal(csvEscapeCell("hello"), "hello");
  assert.equal(csvEscapeCell("hello", {}), "hello");
  assert.equal(csvEscapeCell("hello", undefined), "hello");
});

test("csvEscapeCell: 空文字 → 空文字 (alwaysQuote なし)", () => {
  assert.equal(csvEscapeCell(""), "");
  assert.equal(csvEscapeCell("", { alwaysQuote: true }), `""`);
});

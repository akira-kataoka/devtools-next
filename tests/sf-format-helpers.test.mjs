// v3.454.0 Phase 544: sf-format-helpers.js の純粋関数ユニットテスト
// v3.462.0 Phase 552: escHtml を追加 (panel/popup/picker/design-docs の重複実装を集約)
// v3.463.0 Phase 553: 現在ユーザーリアルタイム表示の純粋関数 (userInitials / relativeTimeJa / formatCurrentUser) を追加

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  tsForFilename, formatError, escHtml,
  userInitials, relativeTimeJa, formatCurrentUser,
  escapeSoqlLiteral,
  userChipStateClasses,
  popoverPosition,
  formatSfDateTime,
  formatSfDateTimeLoose,
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

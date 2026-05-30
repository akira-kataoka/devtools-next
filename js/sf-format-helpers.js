// 表示・整形系の純粋関数群 (panel.js から抽出してテスト可能に)
//
// v3.454.0 Phase 544 で抽出。 panel.js 902 (tsForFilename) と 5903 (formatError) の
// ローカル関数を別ファイルに移し、 ユニットテスト対象にした。
//
// v3.462.0 Phase 552: 5 ファイルに同一実装されていた HTML エスケープを escHtml に集約 (DRY)。
//   旧: panel.js esc / popup.js escape / picker.js escape / design-docs.js esc / content.js esc
//   新: panel/popup/picker/design-docs → escHtml を import (content.js は classic script のため除外)
//
// 公開 export:
//   tsForFilename(date?): "YYYYMMDD-HHmm" 形式のタイムスタンプ (ファイル名用)
//   formatError(d): Salesforce REST/SOAP のエラーレスポンス各形を人間可読 1 行に整形
//   escHtml(s): HTML 特殊 5 文字 (& < > " ') を実体参照に置換 (null/undefined は空文字)

/**
 * "YYYYMMDD-HHmm" 形式のタイムスタンプを返す (ファイル名のサフィックス用)。
 *
 * テスト容易性のため、引数で Date を注入できる (デフォルトは現在時刻)。
 *
 * @param {Date} [date=new Date()] - 起点となる Date インスタンス
 * @returns {string} 例: "20260523-1530"
 */
export function tsForFilename(date = new Date()) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}`;
}

/**
 * Salesforce REST/SOAP / OAuth エラーレスポンスを 1 行の人間可読文字列に整形する。
 *
 * 想定する入力形:
 *   - REST 標準エラー配列 (1 件): `[{ errorCode, message, fields? }]` → "errorCode message"
 *   - REST 標準エラー配列 (複数件): `[{...}, {...}, ...]` →
 *       "[N件のエラー] errorCode1 message1 / errorCode2 message2 [...]"
 *       (Phase 563 改善: 旧実装は先頭 1 件のみ表示で残りを silently drop していた)
 *   - OAuth エラー: `{ error: "invalid_grant", error_description: "..." }` → error_description (なければ error)
 *   - その他: JSON.stringify(d)
 *
 * @param {*} d - 任意のエラーレスポンス
 * @returns {string}
 */
export function formatError(d) {
  if (Array.isArray(d) && d[0]) {
    const fmt = (e) => `${(e && e.errorCode) || ""} ${(e && e.message) || ""}`.trim();
    if (d.length === 1) return fmt(d[0]);
    // 複数件: 先頭 3 件まで表示。それ以上は省略数を末尾に
    const MAX = 3;
    const head = d.slice(0, MAX).map(fmt).filter(Boolean).join(" / ");
    const rest = d.length - MAX;
    const tail = rest > 0 ? ` [...他${rest}件]` : "";
    return `[${d.length}件のエラー] ${head}${tail}`;
  }
  if (d && d.error) return d.error_description || d.error;
  return JSON.stringify(d);
}

// HTML 特殊 5 文字 (& < > " ') を実体参照に置換。
// null / undefined は空文字を返す (旧 panel.js / popup.js は "null" / "undefined" 文字列を吐き出す
// バグ相当の挙動だったため、null-safe な design-docs.js / picker.js / content.js 側の挙動に統一)。
//
// @param {*} s - 任意の値 (string でなくても toString される)
// @returns {string}
export function escHtml(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

/**
 * SOQL 文字列リテラル ('...' で囲む値) を安全にエスケープする。
 *
 * Salesforce SOQL の仕様に従い、まずバックスラッシュ `\` を `\\` に、続いて
 * 単一引用符 `'` を `\'` にエスケープする (順序が逆だと二重エスケープになる)。
 *
 * v3.464.0 Phase 554 で集約: コードベースに 3 パターン混在していたのを統一。
 *   - `.replace(/'/g, "")`  … quote を「除去」する lossy 実装 (値が変わるバグ。sf-api.js / panel.js の User 系 SOQL)
 *   - `.replace(/'/g, "\\'")` … quote のみエスケープ (`\` 未対応。design-docs.js 多数 — 別サイクルで移行予定)
 *   - `.replace(/\\/g,"\\\\").replace(/'/g,"\\'")` … 完全 (panel.js 検索キーワード) ← これを正準とする
 *
 * @param {*} s - 任意の値 (string でなくても toString される。null/undefined は空文字)
 * @returns {string} '...' の中にそのまま埋め込める安全な文字列
 */
export function escapeSoqlLiteral(s) {
  return String(s == null ? "" : s).replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

/**
 * v3.475.0 Phase 565: Salesforce ISO 8601 datetime 文字列を「YYYY-MM-DD HH:MM」
 * 形式に整形する純粋関数。CSV/Excel での日時可読性向上のため。
 *
 * sf-api.js recordsToCsv / panel.js (2 箇所) / design-docs.js (2 箇所) で
 * 同一 anchored regex を 5 箇所重複していたのを集約。
 *
 * 仕様:
 *   - 入力例: "2026-05-30T15:38:00.000+0900" → "2026-05-30 15:38"
 *   - 入力例: "2026-05-30T15:38Z"            → "2026-05-30 15:38"
 *   - 入力例: "2026-05-30"   (date-only)    → そのまま (旧実装と同じく非マッチで元返却)
 *   - 入力例: "not a date"                   → そのまま (非マッチ)
 *   - null/undefined/空 → 空文字
 *   - 非文字列は String() 経由
 *
 * @param {*} s
 * @returns {string}
 */
export function formatSfDateTime(s) {
  if (s == null || s === "") return "";
  const str = String(s);
  const m = str.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?$/);
  return m ? `${m[1]} ${m[2]}` : str;
}

/**
 * v3.476.0 Phase 566: formatSfDateTime の prefix 一致版。
 *
 * panel.js (4 箇所: 1965, 6557, 6574, 6748) で simple-prefix の ISO
 * 整形 regex を重複していたのを集約。formatSfDateTime と違い、後続に
 * garbage があってもマッチする (`^YYYY-MM-DDTHH:MM` の prefix 一致のみ)。
 *
 * 仕様:
 *   - 入力: ISO datetime の prefix を含む任意の文字列
 *   - prefix 部 (date + T + HH:MM) があれば「YYYY-MM-DD HH:MM」を返す
 *   - prefix が無い場合は元文字列をそのまま返す
 *   - null/undefined/空 → 空文字
 *
 * @param {*} s
 * @returns {string}
 */
export function formatSfDateTimeLoose(s) {
  if (s == null || s === "") return "";
  const str = String(s);
  const m = str.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/);
  return m ? `${m[1]} ${m[2]}` : str;
}

/**
 * v3.477.0 Phase 567: XML 特殊 5 文字 (& < > " ') を実体参照に置換する純粋関数。
 *
 * sf-connections.js (SOAP envelope の値埋込) と panel.js xmlText (Excel XML
 * 出力) で同一の inline 関数を 2 箇所重複していたのを集約。
 *
 * 注: escHtml と違って quote は `&quot;`、apostrophe は `&apos;` (XML 標準)。
 *     `&#39;` (escHtml の HTML 推奨形) ではない点に注意 — XML attribute では
 *     `&apos;` が公式実体参照。HTML と XML で文字参照体系が微妙に違うため
 *     別関数として用意 (escHtml を流用すると XML パーサで `&#39;` を未定義実体と
 *     見なす実装に当たる可能性)。
 *
 * @param {*} s
 * @returns {string}
 */
export function escXml(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

// =====================================================================
// v3.463.0 Phase 553: 現在ログイン中ユーザーのリアルタイム表示 (ユーザー要望 2026-05-27)
//   ヘッダーに「今ログインしているのは誰か」を常時表示するため、表示用の
//   純粋関数 3 つを追加。ネットワーク I/O は sf-api.getCurrentUserDetails 側、
//   ここは「取得済みデータ → 表示用に正規化 / 整形」だけを担いテスト可能に保つ。
// =====================================================================

/**
 * 表示名 / ユーザー名からアバター用イニシャル (1〜2 文字) を導出する。
 *
 * - スペース区切りで 2 トークン以上 → 先頭 2 トークンの各先頭 1 文字 (例 "山田 太郎" → "山太" / "Jane Doe" → "JD")
 * - 1 トークンのみ → 先頭 2 文字 (CJK サロゲートペア安全に Array.from で分割)
 * - 空 / null → "?"
 *
 * 英字は大文字化、CJK 等はそのまま。
 *
 * @param {string} nameOrUsername
 * @returns {string} 1〜2 文字のイニシャル
 */
export function userInitials(nameOrUsername) {
  const s = String(nameOrUsername == null ? "" : nameOrUsername).trim();
  if (!s) return "?";
  const tokens = s.split(/\s+/).filter(Boolean);
  const firstOf = (t) => Array.from(t)[0] || "";
  if (tokens.length >= 2) {
    return (firstOf(tokens[0]) + firstOf(tokens[1])).toUpperCase();
  }
  const chars = Array.from(tokens[0]);
  return chars.slice(0, 2).join("").toUpperCase();
}

/**
 * 日時を「たった今 / N 分前 / N 時間前 / N 日前 / YYYY-MM-DD」の相対表現に整形する。
 * LastLoginDate の鮮度を一目で把握できるようにするための表示専用関数。
 *
 * @param {string|number|Date} dateLike - ISO 文字列 / epoch ミリ秒 / Date
 * @param {Date} [now=new Date()] - 基準時刻 (テスト注入用)
 * @returns {string} 相対表現。パース不能 / 空なら "-"
 */
export function relativeTimeJa(dateLike, now = new Date()) {
  if (dateLike == null || dateLike === "") return "-";
  const d = dateLike instanceof Date ? dateLike : new Date(dateLike);
  const t = d.getTime();
  if (Number.isNaN(t)) return "-";
  const diffSec = Math.floor((now.getTime() - t) / 1000);
  // v3.472.0 Phase 562: ローカル時計が数秒進んでいると LastLoginDate (サーバ時刻) が
  //   毎回「未来」表示になるバグ修正。|diff| < 60s は時計ずれの可能性が高いので
  //   符号にかかわらず「たった今」扱い。60s 以上の真の未来のみ「未来」と表示。
  if (Math.abs(diffSec) < 60) return "たった今";
  if (diffSec < 0) return "未来";
  const min = Math.floor(diffSec / 60);
  if (min < 60) return `${min}分前`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}時間前`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day}日前`;
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * getUserInfo の結果と User レコード (SOQL) をマージし、表示用に正規化したオブジェクトを返す。
 * どちらか一方しか取れなくても可能な範囲で埋める (User レコード優先、欠損は userInfo で補完)。
 *
 * @param {object} args
 * @param {object|null} args.userInfo  - sf-api.getUserInfo の data ({ user_id, name, preferred_username, email, via })
 * @param {object|null} args.userRecord - User SObject ({ Id, Name, Username, Email, Alias, IsActive, LastLoginDate, TimeZoneSidKey, LanguageLocaleKey, UserType, Profile, UserRole })
 * @returns {object} 正規化済み表示データ
 */
export function formatCurrentUser({ userInfo = null, userRecord = null } = {}) {
  const ui = userInfo || {};
  const ur = userRecord || {};
  const name = ur.Name || ui.name || ui.preferred_username || ui.email || "(不明)";
  const username = ur.Username || ui.preferred_username || "";
  const out = {
    id: ur.Id || ui.user_id || "",
    name,
    username,
    email: ur.Email || ui.email || "",
    alias: ur.Alias || "",
    profile: (ur.Profile && ur.Profile.Name) || "",
    role: (ur.UserRole && ur.UserRole.Name) || "",
    userType: ur.UserType || "",
    isActive: ur.IsActive === undefined ? null : !!ur.IsActive,
    lastLogin: ur.LastLoginDate || "",
    timeZone: ur.TimeZoneSidKey || "",
    language: ur.LanguageLocaleKey || "",
    via: ui.via || "",
  };
  out.initials = userInitials(out.name);
  return out;
}

/**
 * v3.469.0 Phase 559: user-chip の状態 (CSS クラス) 判定を純粋関数化。
 *
 * renderCurrentUserChip (panel.js) に inline 散在していた 3 状態判定
 * (offline / stale / inactive) を集約してテスト可能にする。
 *
 * 状態は直交で重なり得る (例: stale + inactive は両方付く)。
 *
 * @param {object} args
 * @param {object|null} args.user - formatCurrentUser() 結果オブジェクト or null
 * @param {number} args.lastFetchAt - 最終取得 epoch ms (0/null = 未取得)
 * @param {number} args.pollMs - ポーリング間隔 ms
 * @param {number} [args.now=Date.now()] - 基準時刻 (テスト注入用)
 * @returns {{ offline: boolean, stale: boolean, inactive: boolean, classes: string[] }}
 */
/**
 * v3.470.0 Phase 560: chip 直下に開くポップオーバーの配置座標を計算する純粋関数。
 *
 * panel.js toggleCurrentUserPopover の DOM 配置計算ロジックを抽出してテスト可能化。
 *
 * 配置ルール:
 *   - 縦: chip の bottom + gap (デフォルト 6px)
 *   - 横: chip の left に揃えるが、右端から (popoverWidth + edgePadding) を超えないようクリップ。
 *         さらに minLeft (デフォルト 8px) より小さくならないようクランプ。
 *
 * @param {object} args
 * @param {{left: number, bottom: number}} args.chipRect - chip.getBoundingClientRect()
 * @param {number} args.viewportWidth - window.innerWidth
 * @param {number} args.popoverWidth - 計測済の popover 幅 (offsetWidth)
 * @param {number} [args.gap=6] - chip と popover の縦間隔
 * @param {number} [args.edgePadding=12] - 右端の余白
 * @param {number} [args.minLeft=8] - 左端の最小オフセット
 * @returns {{ top: number, left: number }} 共に Math.round 済の整数 px
 */
export function popoverPosition({ chipRect, viewportWidth, popoverWidth, gap = 6, edgePadding = 12, minLeft = 8 } = {}) {
  const top = Math.round(chipRect.bottom + gap);
  const rawLeft = Math.min(chipRect.left, viewportWidth - popoverWidth - edgePadding);
  const left = Math.round(Math.max(minLeft, rawLeft));
  return { top, left };
}

export function userChipStateClasses({ user, lastFetchAt, pollMs, now = Date.now() } = {}) {
  // user null は未接続 = offline。それ以外の状態判定は user が必要
  if (!user) {
    return { offline: true, stale: false, inactive: false, classes: ["offline"] };
  }
  // stale 判定: lastFetchAt が 0/null なら未取得とみなし stale 扱いしない
  //            (取得直後はまだ poll 未経過なので) ; pollMs*2.2 倍超で stale
  const stale = !!(lastFetchAt && (now - lastFetchAt > pollMs * 2.2));
  // inactive 判定: isActive===false の時のみ (null/undefined は不明扱いで非 inactive)
  const inactive = user.isActive === false;
  const classes = [];
  if (stale) classes.push("stale");
  if (inactive) classes.push("inactive");
  return { offline: false, stale, inactive, classes };
}

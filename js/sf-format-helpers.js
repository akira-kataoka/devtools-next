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
 * v3.484.0 Phase 574: 「YYYYMMDDHHmmss」形式 (UTC、14 文字、区切りなし、秒精度) の
 * タイムスタンプを返す。検索 CSV / 管理ダッシュボード CSV / 接続マネージャ JSON
 * など 4 callers で重複していた `new Date().toISOString().substring(0, 19).replace(/[-T:]/g, "")`
 * パターンを集約。
 *
 * tsForFilename との違い:
 *   - tsForFilename: local time / YYYYMMDD-HHmm (13 文字、dash 区切り、分精度)
 *   - tsForFilenameCompact: UTC / YYYYMMDDHHmmss (14 文字、区切りなし、秒精度)
 *
 * 用途が違うので別関数として保持 (前者は人が見て直感的、後者は秒で uniqueness が必要なログ用)。
 *
 * @param {Date} [date=new Date()] - 起点 Date インスタンス
 * @returns {string} 例: "20260530174800"
 */
export function tsForFilenameCompact(date = new Date()) {
  return date.toISOString().substring(0, 19).replace(/[-T:]/g, "");
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
  // v3.497.0 Phase 587: Salesforce 単一オブジェクトエラー形式 ({errorCode, message, fields?}) も
  //   「errorCode message」形式に整形 (旧実装は JSON.stringify に流れて読みづらかった)。
  //   Tooling API / 一部 REST エラーで配列ではなく単一オブジェクトが返るケースを救済。
  // v3.507.0 Phase 597: Composite API は statusCode を使う (errorCode と別フィールド)。
  //   errorCode → statusCode の順でフォールバックして両形式に対応。
  if (d && typeof d === "object" && (d.errorCode || d.statusCode || d.message)) {
    const code = d.errorCode || d.statusCode || "";
    return `${code} ${d.message || ""}`.trim();
  }
  // v3.482.0 Phase 572: JSON.stringify は循環参照で TypeError を投げるため try/catch で防御。
  //   formatError 自体がエラー表示中に再エラーを起こすと panel.js displayApiError 経路全体が破綻するため、
  //   最終フォールバックとして String(d) を返す (循環でも安全)。
  try { return JSON.stringify(d); } catch (_) { return String(d); }
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

/**
 * v3.480.0 Phase 570: SOSL `FIND {keyword}` 内のキーワード用最小エスケープ。
 *
 * SOSL 予約文字は完全には `\ + ? * { } ( ) [ ] " & | ! -` だが、本実装は
 * 「最小限 (\ と ')」のみ。`*` `?` はワイルドカードとして意図的に許容している
 * (前方/部分一致用)。
 *
 * 実装は escapeSoqlLiteral と同一だが、semantic context が異なる別関数として
 * 用意 — 将来 SOSL 仕様変更で他文字を escape する必要が出た時に SOQL 側を
 * 巻き添えにしない。
 *
 * @param {*} s
 * @returns {string}
 */
export function escSoslKeyword(s) {
  return String(s == null ? "" : s).replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

/**
 * v3.481.0 Phase 571: Markdown テーブルセル用エスケープ。
 *
 * panel.js (3 箇所: 1949 / 6639 / 6739) で完全同一の inline 関数
 * (mdEsc / esc) を重複していたのを集約。
 *
 * 仕様:
 *   - pipe `|` は `\|` にエスケープ (Markdown テーブル区切り文字との衝突回避)
 *   - 改行 (\n / \r\n) は単一スペースに正規化 (テーブル行が崩れるため)
 *   - null/undefined は空文字
 *   - 非文字列は String() 経由
 *
 * 注: 他の Markdown 特殊文字 (`*`, `_`, `` ` ``, `[`, `]`, etc.) は
 *     テーブルセル内では通常レンダラがそのまま扱うので escape しない。
 *
 * @param {*} s
 * @returns {string}
 */
export function escMdTableCell(s) {
  return String(s == null ? "" : s).replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
}

/**
 * v3.487.0 Phase 577: Excel / CSV 貼り付けテキストを records 配列に変換する純粋パーサー。
 *
 * 一括インポート機能 (Inspector 風 paste→execute) のための入力パーサー。
 *
 * 仕様:
 *   - 区切り文字: 1 行目の \t / , の出現数で自動判定 (\t 多数 → Excel paste、, 多数 → CSV)
 *     明示指定する場合は opts.delimiter
 *   - クォート: `"..."` で囲まれた値はクォート除去、内部の `""` は `"` にデコード
 *     クォート内の改行・区切り文字は値の一部として扱う
 *   - 1 行目はヘッダー (API field 名)、2 行目以降がレコード
 *   - 空行はスキップ (CSV/Excel どちらの paste でも末尾改行が混入しやすいため)
 *   - レコードの値は文字列 (型変換はサーバ側 / 呼出側責任)
 *
 * @param {string} text - Excel/CSV から貼り付けたテキスト
 * @param {object} [opts]
 * @param {string} [opts.delimiter] - 強制区切り文字 ("\t" or ","); 省略時は自動判定
 * @returns {{ delimiter: string, headers: string[], records: object[], skipped: number }}
 *   skipped: 列数不一致や空行で skip した行数
 */
/**
 * v3.493.0 Phase 583: 一括インポート op に応じた必須カラム pre-validation。
 *
 * 既存の panel.js doBulkParse 内 inline 検証 (update/delete は Id 必須、
 * upsert は extId キーがヘッダーに必要) を純粋関数化してテスト可能に。
 *
 * @param {object} args
 * @param {string} args.op - "insert" | "update" | "upsert" | "delete"
 * @param {string} [args.extId] - upsert 時の External ID Field 名
 * @param {string[]} args.headers - parse 済ヘッダー配列
 * @returns {{ warnings: string[], canExecute: boolean }}
 *   warnings: ユーザー表示用警告メッセージ (空配列なら問題なし)
 *   canExecute: 実行可能か (警告ありなら false)
 */
/**
 * v3.504.0 Phase 594: bulk op (insert/update/upsert/delete) の絵文字を返す。
 *
 * panel.js doBulkExecute / PROD confirm dialog / toast の 3 箇所で
 * 同じ三項演算子 chain を inline していたのを集約。未知の op は "?" を返す。
 *
 * @param {string} op
 * @returns {string} 絵文字 1 つ (`📝` / `🔄` / `↕️` / `🗑️` / `?`)
 */
/**
 * v3.509.0 Phase 599: `name` prefix OR `label` substring の検索フィルタ純粋関数。
 *
 * panel.js SOQL オートコンプリート 2 箇所 (オブジェクト候補 / 項目候補) で同じ
 * `items.filter((it) => !q || it.name.toLowerCase().startsWith(q) || (it.label || "").toLowerCase().includes(q))`
 * パターンを inline していたのを集約。case-insensitive、name 前方一致 OR
 * label 部分一致。query が空文字 / null / undefined ならフィルタなしで全件返す。
 *
 * 同パターンは content.js 782/789 にもあるが classic script で import 不可のため対象外。
 *
 * @param {Array<{name?: string, label?: string}>} items
 * @param {string} [query]
 * @returns {Array} 元配列の同 reference を返す (フィルタなし時) または新規 filtered 配列
 */
/**
 * v3.513.0 Phase 603: 安全な JSON.parse — try/catch で例外を握りつぶし、fallback を返す。
 *
 * sf-api.js / sf-connections.js などで `try { JSON.parse(...) } catch { ... }` を
 * 個別に書いていたパターンを集約。null/undefined/空文字も fallback を返す
 * (parse 試行すらしない)。
 *
 * @param {*} text - JSON 文字列を想定 (非文字列は fallback)
 * @param {*} [fallback=null] - parse 失敗 / 入力なし時の戻り値
 * @returns {*} parse 成功なら結果、それ以外は fallback
 */
export function safeJsonParse(text, fallback = null) {
  if (text == null || text === "" || typeof text !== "string") return fallback;
  try { return JSON.parse(text); } catch { return fallback; }
}

/**
 * v3.514.0 Phase 604: CSV セル 1 値の RFC 4180 準拠エスケープ。
 *
 * panel.js / sf-api.js / design-docs.js / content.js などで重複していた
 * `/[",\n\t]/.test(s) ? \`"${s.replace(/"/g, '""')}"\` : s` パターンを集約。
 *
 * 動作:
 *   - null/undefined → "" を返す (alwaysQuote 時は `""`)
 *   - object/array → JSON.stringify した上でエスケープ判定
 *   - 値内に `"` `,` `\r` `\n` `\t` のいずれかを含むか alwaysQuote=true なら `"..."` で囲み、内部の `"` は `""` にエスケープ
 *   - それ以外は素のまま返す (デフォルト挙動 = 最短 CSV)
 *
 * 注意: 旧 panel.js 7165 / 8534 / 8562 / design-docs.js 2975 は `[",\n\t]` だけで `\r` を見ていなかったが、
 * 本実装は `\r` も quote 対象に含む (RFC 4180 厳密化、Excel/Numbers 読込互換性向上)。値内に \r が現れる
 * ケースが新規発生しても安全側に倒れるだけで既存値の解釈は変わらない。
 *
 * @param {*} value - セル値
 * @param {Object} [opts]
 * @param {boolean} [opts.alwaysQuote=false] - true なら値内容に関わらず必ず `"..."` で囲む (Limits/SOQL Records 全列クォート向け)
 * @returns {string}
 */
export function csvEscapeCell(value, opts = {}) {
  const alwaysQuote = !!(opts && opts.alwaysQuote);
  let s;
  if (value == null) s = "";
  else if (typeof value === "object") s = JSON.stringify(value);
  else s = String(value);
  const escaped = s.replace(/"/g, '""');
  if (alwaysQuote || /[",\r\n\t]/.test(s)) return `"${escaped}"`;
  return s;
}

/**
 * v3.515.0 Phase 605: 日本ロケール (ja-JP) のフル日時表示を返す。
 *
 * panel.js / design-docs.js / popup.js で 14+ 箇所重複していた
 * `new Date().toLocaleString("ja-JP")` パターンを集約。レポートヘッダの
 * 「取得日時 / 生成日時 / 実行日時」表示用。
 *
 * date 省略時は現在時刻、文字列/数値も new Date() に渡して整形可能。
 *
 * 例: 2026-05-31 00:30:00 → "2026/5/31 0:30:00"
 *
 * @param {Date|string|number} [date=new Date()] - 起点 (省略時は現在)
 * @returns {string}
 */
export function formatJpDateTime(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleString("ja-JP");
}

/**
 * v3.516.0 Phase 606: 数値を日本ロケール (3 桁区切り) で整形する。
 *
 * panel.js で 21 箇所重複していた `.toLocaleString("ja-JP")` パターンを集約。
 * design-docs.js の同等 helper `fmtNum` と semantics 一致。
 *
 * 動作:
 *   - null / undefined / 空文字 → "" を返す
 *   - 数値以外は Number() で coerce
 *   - NaN / Infinity / -Infinity (非 finite) → 入力をそのまま String 化
 *   - 通常の有限数 → "12,345" のように 3 桁区切り
 *
 * @param {*} value
 * @returns {string}
 */
export function formatJpNumber(value) {
  if (value == null || value === "") return "";
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num)) return String(value);
  return num.toLocaleString("ja-JP");
}

export function filterByNameLabel(items, query) {
  const arr = Array.isArray(items) ? items : [];
  const q = String(query == null ? "" : query).toLowerCase().trim();
  if (!q) return arr;
  return arr.filter((it) =>
    String((it && it.name) || "").toLowerCase().startsWith(q) ||
    String((it && it.label) || "").toLowerCase().includes(q)
  );
}

export function bulkOpEmoji(op) {
  return ({ insert: "📝", update: "🔄", upsert: "↕️", delete: "🗑️" })[op] || "?";
}

/**
 * v3.504.0 Phase 594: bulk op の表示ラベル (絵文字 + 英名)。
 *
 * 例: bulkOpLabel("insert") → "📝 Insert"。PROD confirm dialog などで使用。
 *
 * @param {string} op
 * @returns {string}
 */
export function bulkOpLabel(op) {
  const map = { insert: "Insert", update: "Update", upsert: "Upsert", delete: "Delete" };
  const name = map[op] || op || "?";
  return `${bulkOpEmoji(op)} ${name}`;
}

/**
 * v3.502.0 Phase 592: bulk execute 結果配列を集計する純粋関数。
 *
 * panel.js doBulkExecute 内で inline 集計していた成功/失敗カウントと
 * トップエラー集計をテスト可能に分離。
 *
 * @param {Array<{success: boolean, errors?: Array<{statusCode?: string, message?: string}>}>} results
 * @returns {{
 *   total: number,
 *   ok: number,
 *   fail: number,
 *   topErrors: Array<{ statusCode: string, count: number, sample: string }>
 * }}
 *   topErrors: 件数の多い順上位 3 件まで (statusCode で grouping、無ければ "(コードなし)")
 */
export function summarizeBulkResults(results) {
  const list = Array.isArray(results) ? results : [];
  const total = list.length;
  let ok = 0;
  const errMap = new Map(); // statusCode → { count, sample }
  for (const r of list) {
    if (r && r.success) { ok++; continue; }
    const errs = (r && r.errors) || [];
    const first = errs[0] || {};
    const key = first.statusCode || "(コードなし)";
    if (!errMap.has(key)) {
      errMap.set(key, { count: 0, sample: first.message || "" });
    }
    errMap.get(key).count++;
  }
  const fail = total - ok;
  const topErrors = Array.from(errMap.entries())
    .map(([statusCode, v]) => ({ statusCode, count: v.count, sample: v.sample }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);
  return { total, ok, fail, topErrors };
}

export function validateBulkOpRequiredColumns({ op, extId, headers } = {}) {
  const warnings = [];
  const hs = Array.isArray(headers) ? headers : [];
  const needsId = (op === "update" || op === "delete");
  const needsExtField = (op === "upsert");
  if (needsId && !hs.includes("Id")) {
    warnings.push(`⚠ ${op} には Id カラムが必要 (ヘッダーに "Id" がありません)`);
  }
  if (needsExtField) {
    if (!extId || !String(extId).trim()) {
      warnings.push(`⚠ upsert には External ID Field 名の指定が必要です`);
    } else if (!hs.includes(extId)) {
      warnings.push(`⚠ upsert キー "${extId}" がヘッダーに見つかりません`);
    }
  }
  return { warnings, canExecute: warnings.length === 0 };
}

export function parseClipboardRecords(text, opts = {}) {
  // v3.511.0 Phase 601: Excel paste の BOM (U+FEFF) が headers の先頭に混入する
  //   潜在バグを修正。BOM 付き「﻿Id,Name」を parse すると headers[0]="﻿Id"
  //   になり SOQL field 名と一致しなくなる。冒頭で strip。
  const src = String(text == null ? "" : text).replace(/^﻿/, "");
  if (!src.trim()) return { delimiter: "\t", headers: [], records: [], skipped: 0 };
  // 区切り文字判定: 1 行目だけで判定 (内容にクォート内含む場合の誤判定は許容)
  let delim = opts.delimiter;
  if (!delim) {
    const firstLine = src.split(/\r?\n/, 1)[0];
    const tabCount = (firstLine.match(/\t/g) || []).length;
    const commaCount = (firstLine.match(/,/g) || []).length;
    delim = tabCount >= commaCount ? "\t" : ",";
  }
  // クォート対応の row 分割 (RFC 4180 風、簡易版)
  const rows = [];
  let cur = [];
  let field = "";
  let inQuote = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (inQuote) {
      if (c === '"') {
        if (src[i + 1] === '"') { field += '"'; i++; } // エスケープ
        else { inQuote = false; }
      } else {
        field += c;
      }
    } else {
      if (c === '"' && field === "") {
        inQuote = true;
      } else if (c === delim) {
        cur.push(field); field = "";
      } else if (c === "\n" || c === "\r") {
        // \r\n の \n はスキップ
        if (c === "\r" && src[i + 1] === "\n") i++;
        cur.push(field); rows.push(cur); cur = []; field = "";
      } else {
        field += c;
      }
    }
  }
  // 末尾フィールド
  if (field !== "" || cur.length) { cur.push(field); rows.push(cur); }
  // 空行除去
  const nonEmpty = rows.filter((r) => r.length > 1 || (r.length === 1 && r[0] !== ""));
  if (nonEmpty.length === 0) return { delimiter: delim, headers: [], records: [], skipped: 0 };
  const headers = nonEmpty[0].map((h) => String(h).trim());
  const records = [];
  let skipped = 0;
  for (let i = 1; i < nonEmpty.length; i++) {
    const row = nonEmpty[i];
    if (row.length !== headers.length) { skipped++; continue; }
    const rec = {};
    for (let j = 0; j < headers.length; j++) rec[headers[j]] = row[j];
    records.push(rec);
  }
  return { delimiter: delim, headers, records, skipped };
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

/**
 * v3.518.0 Phase 608: AuthSession レコードをユーザー単位に集約する。
 *
 * 「現在アクティブセッション」一覧は 1 人が UI/API/Aura など複数セッションを
 * 同時保持するため、生の AuthSession をそのまま行にすると同じ氏名が何度も並び
 * 「ユーザーが重複している」ように見える (ユーザー報告 2026-05-31)。
 * 本関数はユーザー (UsersId) ごとに 1 件へ集約し、セッション数・Session 種別・
 * Login 種別・SourceIP・開始時刻範囲・最大残存秒数をまとめて返す。
 *
 * - 日付 (CreatedDate) は Salesforce ISO8601 文字列前提で辞書順比較 (= 時系列順)。
 * - 並びは セッション数 降順 → 氏名 昇順 (多重ログインのユーザーを上位に)。
 *
 * @param {Array<object>} [records=[]] - AuthSession SOQL レコード配列
 * @returns {Array<{userId,name,username,profile,userType,sessionCount,sessionTypes:string[],loginTypes:string[],sourceIps:string[],earliestCreated:?string,latestCreated:?string,maxSecondsValid:number}>}
 */
export function dedupeActiveSessionsByUser(records = []) {
  const byUser = new Map();
  for (const s of records || []) {
    const uid = s.UsersId || "(unknown)";
    let g = byUser.get(uid);
    if (!g) {
      const u = s.Users || {};
      g = {
        userId: uid,
        name: u.Name || "(不明)",
        username: u.Username || "",
        profile: (u.Profile && u.Profile.Name) ? u.Profile.Name : "(未設定)",
        userType: u.UserType || "",
        sessionCount: 0,
        sessionTypes: new Set(),
        loginTypes: new Set(),
        sourceIps: new Set(),
        earliestCreated: null,
        latestCreated: null,
        maxSecondsValid: 0,
      };
      byUser.set(uid, g);
    }
    g.sessionCount += 1;
    if (s.SessionType) g.sessionTypes.add(s.SessionType);
    if (s.LoginType) g.loginTypes.add(s.LoginType);
    if (s.SourceIp) g.sourceIps.add(s.SourceIp);
    if (s.CreatedDate) {
      if (!g.earliestCreated || s.CreatedDate < g.earliestCreated) g.earliestCreated = s.CreatedDate;
      if (!g.latestCreated || s.CreatedDate > g.latestCreated) g.latestCreated = s.CreatedDate;
    }
    const secs = Number(s.NumSecondsValid) || 0;
    if (secs > g.maxSecondsValid) g.maxSecondsValid = secs;
  }
  const result = [...byUser.values()].map((g) => ({
    userId: g.userId,
    name: g.name,
    username: g.username,
    profile: g.profile,
    userType: g.userType,
    sessionCount: g.sessionCount,
    sessionTypes: [...g.sessionTypes].sort(),
    loginTypes: [...g.loginTypes].sort(),
    sourceIps: [...g.sourceIps].sort(),
    earliestCreated: g.earliestCreated,
    latestCreated: g.latestCreated,
    maxSecondsValid: g.maxSecondsValid,
  }));
  result.sort((a, b) => (b.sessionCount - a.sessionCount) || a.name.localeCompare(b.name));
  return result;
}

/**
 * v3.518.0 Phase 608: Salesforce REST/Tooling のエラーレスポンスが
 * 「セッション失効 (INVALID_SESSION_ID)」を示すかを判定する。
 *
 * レスポンス形は経路により object / 配列 / 文字列と揺れるため再帰的に
 * errorCode + message を収集して判定する。Apex 実行・REST API 等で
 * 「再接続を促す」UI を出すために使用 (ユーザー報告「Apex実行ができない」の主因)。
 *
 * @param {object|Array|string} data - sfFetch の r.data
 * @returns {boolean}
 */
export function isSessionExpiredError(data) {
  if (data == null) return false;
  const parts = [];
  const collect = (v) => {
    if (v == null) return;
    if (typeof v === "string") { parts.push(v); return; }
    if (Array.isArray(v)) { v.forEach(collect); return; }
    if (typeof v === "object") {
      if (v.errorCode != null) parts.push(String(v.errorCode));
      if (v.message != null) parts.push(String(v.message));
      if (v.error != null) collect(v.error);
    }
  };
  collect(data);
  return /INVALID_SESSION_ID|Session expired or invalid|sessionInvalid/i.test(parts.join(" "));
}

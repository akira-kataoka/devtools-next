// 表示・整形系の純粋関数群 (panel.js から抽出してテスト可能に)
//
// v3.454.0 Phase 544 で抽出。 panel.js 902 (tsForFilename) と 5903 (formatError) の
// ローカル関数を別ファイルに移し、 ユニットテスト対象にした。
//
// 公開 export:
//   tsForFilename(date?): "YYYYMMDD-HHmm" 形式のタイムスタンプ (ファイル名用)
//   formatError(d): Salesforce REST/SOAP のエラーレスポンス各形を人間可読 1 行に整形

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
 *   - REST 標準エラー配列: `[{ errorCode, message, fields? }, ...]` → "errorCode message"
 *   - OAuth エラー: `{ error: "invalid_grant", error_description: "..." }` → error_description (なければ error)
 *   - その他: JSON.stringify(d)
 *
 * @param {*} d - 任意のエラーレスポンス
 * @returns {string}
 */
export function formatError(d) {
  if (Array.isArray(d) && d[0]) return `${d[0].errorCode || ""} ${d[0].message || ""}`.trim();
  if (d && d.error) return d.error_description || d.error;
  return JSON.stringify(d);
}

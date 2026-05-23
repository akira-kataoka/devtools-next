// REST / SOAP 送信補助の純粋関数群
//
// v3.443.0 Phase 533 で panel.js に追加されたヘルパー (3 モード REST/汎用HTTP/SOAP 対応) を、
// v3.453.0 Phase 543 で別ファイルに抽出した。ユニットテスト可能にすることが目的。
//
// 公開 export:
//   parseRestHeaders(text):  "Key: Value" 形式の行を headers オブジェクトに変換
//   wrapSoapEnvelope(body):  SOAP 1.1 Envelope でボディをラップ

/**
 * "Key: Value" 形式の行 (改行区切り) を headers オブジェクトに変換する。
 *
 * - 空行は無視
 * - "#" で始まる行はコメント扱いで無視
 * - ":" が無い行、key が空の行は無視
 * - key と value は前後の空白をトリム
 * - 同一 key が複数回現れた場合は後勝ち
 *
 * @param {string} text
 * @returns {Object<string, string>}
 */
export function parseRestHeaders(text) {
  const headers = {};
  if (!text || typeof text !== "string") return headers;
  text.split(/\r?\n/).forEach((line) => {
    const t = line.trim();
    if (!t || t.startsWith("#")) return;
    const idx = t.indexOf(":");
    if (idx <= 0) return;
    const k = t.substring(0, idx).trim();
    const v = t.substring(idx + 1).trim();
    if (k) headers[k] = v;
  });
  return headers;
}

/**
 * SOAP 1.1 Envelope でボディをラップする。 xmlns:soap は SOAP 1.1 名前空間。
 *
 * @param {string} innerBody - <soap:Body> 内に挿入するコンテンツ
 * @returns {string} XML 文字列 (UTF-8 宣言付き)
 */
export function wrapSoapEnvelope(innerBody) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
${innerBody}
  </soap:Body>
</soap:Envelope>`;
}

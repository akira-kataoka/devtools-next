// Salesforce 接続マネージャ — 現在のブラウザセッションに依存せず API を呼び出すための
// 認証情報を chrome.storage.local に保存し、 OAuth Username-Password Flow か SOAP login()
// で access_token / sessionId と instance_url を取得して再利用する。
//
// v3.446.0 Phase 534 で追加 (ユーザー要望「セッション関係なくAPIをおくれるようにしてほしい」)。
//
// 【セキュリティ注意】
// - chrome.storage.local に Consumer Secret / Password / Security Token を平文保存します。
// - 本番組織の本格運用には Connected App + JWT Bearer Flow を別途検討してください。
// - 本機能は開発・テスト用途を想定しています。
//
// 【公開 export】
//   STORAGE_KEY: chrome.storage.local キー
//   loadConnections / saveConnections / upsertConnection / deleteConnection
//   authenticateOAuthPassword: POST /services/oauth2/token (grant_type=password)
//   authenticateSoapLogin: POST /services/Soap/u/<ver>  (login() Envelope)
//   connFetch: 保存済み接続を使って汎用 fetch (Bearer token + instance_url)
//   connSoql: 保存済み接続を使って SOQL 実行
//   connSoapCall: 保存済み接続を使って SOAP call (sessionId Header 自動付与)

export const STORAGE_KEY = "sfdtConnections";
export const DEFAULT_API_VERSION = "62.0";

/** chrome.storage.local から接続リストをロード (配列) */
export async function loadConnections() {
  try {
    const r = await chrome.storage.local.get(STORAGE_KEY);
    const list = r[STORAGE_KEY];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export async function saveConnections(list) {
  await chrome.storage.local.set({ [STORAGE_KEY]: list || [] });
}

/** id が一致する接続を update、なければ新規 push */
export async function upsertConnection(conn) {
  const list = await loadConnections();
  const i = list.findIndex((c) => c.id === conn.id);
  if (i >= 0) list[i] = { ...list[i], ...conn };
  else list.push(conn);
  await saveConnections(list);
  return list;
}

export async function deleteConnection(id) {
  const list = await loadConnections();
  const next = list.filter((c) => c.id !== id);
  await saveConnections(next);
  return next;
}

export function makeConnectionId() {
  return "c" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

/**
 * OAuth 2.0 Username-Password Flow で access_token を取得。
 * Connected App の "Enable Username-Password Flow" 設定が必要。
 *
 * @param {object} p
 * @param {string} p.loginUrl - https://login.salesforce.com or https://test.salesforce.com
 * @param {string} p.consumerKey - Connected App の Consumer Key
 * @param {string} p.consumerSecret - Connected App の Consumer Secret
 * @param {string} p.username - Salesforce ユーザー名
 * @param {string} p.password - パスワード (セキュリティトークン未含み)
 * @param {string} [p.securityToken] - セキュリティトークン (IP 信頼済みなら不要)
 * @returns {Promise<{ok:boolean, status:number, accessToken?:string, instanceUrl?:string, raw?:string, error?:string}>}
 */
export async function authenticateOAuthPassword({ loginUrl, consumerKey, consumerSecret, username, password, securityToken }) {
  const base = (loginUrl || "https://login.salesforce.com").replace(/\/$/, "");
  const url = base + "/services/oauth2/token";
  const params = new URLSearchParams();
  params.set("grant_type", "password");
  params.set("client_id", consumerKey || "");
  params.set("client_secret", consumerSecret || "");
  params.set("username", username || "");
  params.set("password", (password || "") + (securityToken || ""));
  let resp;
  try {
    resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
      body: params.toString(),
    });
  } catch (e) {
    return { ok: false, status: 0, error: "ネットワークエラー: " + (e.message || e) };
  }
  const raw = await resp.text();
  let data = null;
  try { data = raw ? JSON.parse(raw) : null; } catch { data = null; }
  if (!resp.ok || !data || !data.access_token) {
    const err = (data && (data.error_description || data.error)) || raw || ("HTTP " + resp.status);
    return { ok: false, status: resp.status, raw, error: err };
  }
  return {
    ok: true, status: resp.status, raw,
    accessToken: data.access_token,
    instanceUrl: data.instance_url,
    issuedAt: Date.now(),
    tokenType: data.token_type || "Bearer",
    id: data.id,
  };
}

/**
 * SOAP login() で sessionId / serverUrl を取得。
 * Connected App 不要 (ユーザー名 + パスワード + セキュリティトークンのみ)。
 *
 * @param {object} p
 * @param {string} p.loginUrl - https://login.salesforce.com or https://test.salesforce.com
 * @param {string} p.username
 * @param {string} p.password - パスワード (セキュリティトークン未含み)
 * @param {string} [p.securityToken] - セキュリティトークン
 * @param {string} [p.apiVersion]
 */
export async function authenticateSoapLogin({ loginUrl, username, password, securityToken, apiVersion = DEFAULT_API_VERSION }) {
  const base = (loginUrl || "https://login.salesforce.com").replace(/\/$/, "");
  const url = base + "/services/Soap/u/" + apiVersion;
  const esc = (s) => String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&apos;");
  const envelope = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:urn="urn:partner.soap.sforce.com">
  <soapenv:Body>
    <urn:login>
      <urn:username>${esc(username)}</urn:username>
      <urn:password>${esc((password || "") + (securityToken || ""))}</urn:password>
    </urn:login>
  </soapenv:Body>
</soapenv:Envelope>`;
  let resp;
  try {
    resp = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "text/xml; charset=UTF-8",
        "SOAPAction": "login",
      },
      body: envelope,
    });
  } catch (e) {
    return { ok: false, status: 0, error: "ネットワークエラー: " + (e.message || e) };
  }
  const raw = await resp.text();
  if (!resp.ok) {
    const fault = (raw.match(/<faultstring>([\s\S]*?)<\/faultstring>/) || [])[1] || ("HTTP " + resp.status);
    return { ok: false, status: resp.status, raw, error: fault };
  }
  const sid = (raw.match(/<sessionId>([\s\S]*?)<\/sessionId>/) || [])[1];
  const serverUrl = (raw.match(/<serverUrl>([\s\S]*?)<\/serverUrl>/) || [])[1];
  const userId = (raw.match(/<userId>([\s\S]*?)<\/userId>/) || [])[1];
  if (!sid || !serverUrl) {
    return { ok: false, status: resp.status, raw, error: "sessionId が応答に含まれていません" };
  }
  // serverUrl は https://NA1.salesforce.com/services/Soap/u/62.0/00Dxxxxxxx
  // instance_url は https://NA1.salesforce.com に揃える
  let instanceUrl = serverUrl;
  try {
    const u = new URL(serverUrl);
    instanceUrl = u.origin;
  } catch {}
  return {
    ok: true, status: resp.status, raw,
    accessToken: sid,
    instanceUrl,
    serverUrl,
    userId,
    issuedAt: Date.now(),
    tokenType: "Bearer",
  };
}

/**
 * 保存済み接続を使って fetch (Bearer 認証 + instance_url 補完)。
 * path が "/services/..." 形式なら instance_url と結合、 "http(s)://" 形式ならそのまま。
 */
export async function connFetch({ connection, path, method = "GET", body = null, headers = {} }) {
  if (!connection || !connection.accessToken || !connection.instanceUrl) {
    return { ok: false, status: 0, data: { message: "接続が未認証です。先に 🔓 認証 を実行してください。" }, raw: "" };
  }
  const url = /^https?:\/\//i.test(path) ? path : (connection.instanceUrl.replace(/\/$/, "") + path);
  let resp;
  try {
    resp = await fetch(url, {
      method,
      headers: {
        "Authorization": "Bearer " + connection.accessToken,
        "Content-Type": "application/json",
        "Accept": "application/json",
        ...headers,
      },
      body: body ? (typeof body === "string" ? body : JSON.stringify(body)) : undefined,
    });
  } catch (e) {
    return { ok: false, status: 0, data: { message: String(e), errorCode: "NETWORK_ERROR" }, raw: "" };
  }
  const raw = await resp.text();
  let data = raw;
  if (raw) {
    const ct = resp.headers.get("content-type") || "";
    if (ct.includes("application/json") || ct.includes("text/json")) {
      try { data = JSON.parse(raw); } catch {}
    }
  }
  if (resp.status === 401) {
    return {
      ok: false, status: 401, data, raw,
      sessionInvalid: true,
      hint: "access_token の有効期限切れの可能性があります。接続マネージャで「🔓 再認証」を実行してください。",
    };
  }
  return { ok: resp.ok, status: resp.status, data, raw };
}

/** 保存済み接続を使った SOQL 実行 */
export async function connSoql({ connection, soql, apiVersion = DEFAULT_API_VERSION, tooling = false }) {
  const base = tooling ? `/services/data/v${apiVersion}/tooling/query/` : `/services/data/v${apiVersion}/query/`;
  return connFetch({ connection, path: `${base}?q=${encodeURIComponent(soql)}` });
}

/**
 * 保存済み接続で SOAP call。 sessionId は SessionHeader として自動付与。
 * envelopeInner は <soapenv:Body> の中身 (例: <urn:create>...</urn:create>)
 */
export async function connSoapCall({ connection, endpointPath = "/services/Soap/u/", apiVersion = DEFAULT_API_VERSION, soapAction = "", envelopeInner = "" }) {
  if (!connection || !connection.accessToken || !connection.instanceUrl) {
    return { ok: false, status: 0, raw: "接続が未認証です" };
  }
  const url = connection.instanceUrl.replace(/\/$/, "") + endpointPath + apiVersion;
  const envelope = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:urn="urn:partner.soap.sforce.com">
  <soapenv:Header>
    <urn:SessionHeader><urn:sessionId>${connection.accessToken}</urn:sessionId></urn:SessionHeader>
  </soapenv:Header>
  <soapenv:Body>
${envelopeInner}
  </soapenv:Body>
</soapenv:Envelope>`;
  let resp;
  try {
    resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "text/xml; charset=UTF-8", "SOAPAction": soapAction || "\"\"" },
      body: envelope,
    });
  } catch (e) {
    return { ok: false, status: 0, raw: String(e) };
  }
  const raw = await resp.text();
  return { ok: resp.ok, status: resp.status, raw };
}

/** 認証情報を冗長表示用にマスク (UI 表示用) */
export function maskSecret(s) {
  if (!s) return "";
  if (s.length <= 6) return "***";
  return s.slice(0, 3) + "***" + s.slice(-2);
}

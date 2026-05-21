# 🔒 セキュリティポリシー (DevToolsNext)

DevToolsNext は Salesforce セッション (`sid` Cookie) を扱うため、セキュリティに関わる事項を明記します。

## 🛡️ データの取り扱い

### 取得・利用するデータ

| 種別 | 取得方法 | 保存先 | 送信先 |
|---|---|---|---|
| **sid Cookie** (Salesforce セッション) | `chrome.cookies.get` API (host_permissions に基づく) | メモリ上のみ (永続化なし) | 同一組織の Salesforce REST/Tooling API のみ |
| **Org ID / User ID / API バージョン** | REST API 呼出結果から取得 | `chrome.storage.local` (拡張削除で消去) | なし (UI 表示のみ) |
| **保存済 SOQL クエリ** | ユーザーが「保存」ボタン押下時 | `chrome.storage.local` | なし |
| **SOQL 履歴 (`sfdtRecentSoql`)** | クエリ実行成功時 (最大 5 件) | `chrome.storage.local` | なし |
| **Login as User 検索履歴** | popup の Login as User 検索時 | `chrome.storage.local` | なし |
| **設定値 (Limits ピン / ビュー記憶 / カテゴリ折りたたみ)** | UI 操作時 | `chrome.storage.local` | なし |

### **外部送信なし**

- **当拡張は外部サーバへ一切データを送信しません** (sid を含む)
- すべての通信は `host_permissions` に定義された Salesforce ドメイン (`*.salesforce.com` / `*.force.com` / `*.lightning.force.com` 等) のみ
- アクセス先は `manifest.json` の `host_permissions` で透明性確保

### sid Cookie の扱い (重要)

- `cookies` permission により Chrome 拡張から `sid` Cookie が読み取り可能
- 拡張は sid を **メモリ上に保持して REST API 呼出時に Bearer 認証ヘッダで利用**
- **chrome.storage には sid を保存しない** (拡張再起動・タブ再読込で再取得)
- popup の `⟳` ボタンで明示的に再取得可能

---

## 🚨 脆弱性報告 (Responsible Disclosure)

セキュリティ上の脆弱性を発見した場合は、**公開 Issue ではなく** GitHub のプライベートな手段で報告してください:

1. **推奨**: GitHub Security Advisory (Repository → Security → Advisories → "Report a vulnerability")
2. または: リポジトリオーナーへ直接連絡 (詳細は GitHub プロフィール参照)

### 報告内容に含めて欲しい情報

- 影響範囲 (どの機能 / どのバージョン)
- 再現手順
- 想定される影響 (情報漏洩 / 権限昇格 / DoS 等)
- (可能なら) 修正案

### 対応方針

- 24 時間以内に受領確認
- 7 日以内に初期評価 (深刻度判定)
- 修正パッチを公開前にレポーターへ確認依頼
- 修正リリース後に CVE/Security Advisory を発行 (重大度に応じて)

---

## ✅ サポート対象バージョン

セキュリティ修正は **最新リリース** に対してのみ提供されます。古いバージョンの利用者は自動アップデート機能 (Phase 0.6.0+) または手動で最新化してください。

| バージョン | サポート |
|---|---|
| v3.270.0 以降 (Phase 360 マイルストーン後の最新) | ✅ 修正対象 |
| v3.0.0 〜 v3.269.x | ⚠ 最新版へアップグレード推奨 |
| v2.x.x | ❌ サポート終了 |

---

## 🔍 セキュリティ運用 Tips

### 業務担当者向け
- **本番組織での操作前**: ENV バッジが `⚠ PROD` (赤パルス) と表示されていることを確認
- 設計書ダウンロード時は配布前に「機密項目 (個人情報・契約金額等) が含まれていないか」を確認 (表紙の「注意事項」参照)
- 拡張のアンインストール手順は [README](README.md#-アンインストール--無効化手順-v3260-) 参照

### 管理者向け
- 社内一斉削除は GPO / Intune の `ExtensionInstallForcelist` から拡張 ID を除外
- Login as User 機能利用後は popup の 🚪 ログアウトで明示的に元ユーザーへ復帰
- 共有 PC でユーザーが変わる場合は `chrome.storage.local` の保存履歴を削除推奨 (拡張削除 → 再インストール)

### 開発者向け
- 新規 fetch 先を追加する場合は `host_permissions` の最小権限原則を遵守
- `eval()` / `innerHTML` での非 sanitize データ挿入は禁止 (XSS リスク)
- 既存の `escape()` ヘルパー / `textContent` 代入パターンを継続利用

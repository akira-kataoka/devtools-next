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

### 🌐 host_permissions 9 ドメイン一覧 + 根拠 (Phase 424 で documentation 化 + Phase 427 で content_scripts matches 7 vs 9 の差 追記)

manifest.json で要求する 9 host_permissions の各根拠 (Salesforce の多様な domain pattern):

| ドメイン | 用途 |
|---|---|
| `*.salesforce.com` | 標準 Production 組織のメイン domain |
| `*.force.com` | カスタムドメイン (My Domain) を使う組織 |
| `*.lightning.force.com` | Lightning Experience 組織の UI domain |
| `*.my.salesforce.com` | API endpoint (My Domain 経由 REST/Tooling) |
| `*.cloudforce.com` | 旧 Salesforce ドメイン (一部組織で残存) |
| `*.salesforce-setup.com` | Setup ページ専用 domain (Lightning Setup) |
| `*.salesforce-experience.com` | Experience Cloud (旧 Community Cloud) 専用 |
| `*.visualforce.com` | Visualforce ページの iframe content |
| `*.sandbox.my.salesforce.com` | Sandbox 組織の My Domain 経由 API |

**最小権限原則**: Salesforce が提供する公式 domain のみに限定。外部サーバ (Google Analytics / 解析サービス等) への通信は **一切なし**。各 domain は Salesforce 組織の正規利用形態 (Production / Sandbox / Experience Cloud / Lightning / Setup) に対応。

**content_scripts matches との差 (Phase 427 で documentation)**: manifest.json `content_scripts.matches` は 7 ドメイン (上記 9 から `*.cloudforce.com` と `*.sandbox.my.salesforce.com` を除外):
- `cloudforce.com`: 旧 SF domain、新規組織はほぼ未使用 → mini-panel 注入対象外で OK
- `sandbox.my.salesforce.com`: `*.my.salesforce.com` の matches で含まれるため明示不要
- → content_scripts matches **7 ドメイン** = host_permissions **9 ドメイン** - 2 (実質的に上位 wildcard が含む) の最小化

### 🔐 拡張機能 permissions 一覧 + 根拠 (Phase 423 で documentation 化)

manifest.json で要求する 9 permissions の各根拠 (最小権限原則):

| Permission | 用途 | 根拠 |
|---|---|---|
| `cookies` | sid Cookie 取得 (REST API 認証) | SF REST/Tooling API 呼出に必須、host_permissions 配下のみ |
| `storage` | chrome.storage.local で 25+ 種のキー永続化 | SOQL 履歴 / Apex draft / UI 状態 (Phase 422 で local 採用理由 documentation) |
| `activeTab` | アクティブタブの URL から SF host 推定 | popup / DevTools panel から SF タブ自動検出 |
| `scripting` | (将来用、現在未使用) | MV3 で content script 動的注入時に必要、現実装は manifest 静的注入のみ |
| `tabs` | タブ一覧から SF タブ検索 | popup 起動時に SF タブ自動選択 (sf-api.js getActiveSfTab) |
| `contextMenus` | 右クリックメニュー (ID として開く / 18 桁変換) | テキスト選択時に SF ID として開く便利機能 |
| `clipboardWrite` | クリップボードコピー (CSV / Markdown / リンク) | エクスポート機能 / 🔗 リンクコピー 10 機能種別 × 2 モード |
| `alarms` | VERSION.txt 30 秒ポーリング (自動アップデート) | Phase 411 で「Chrome MV3 最小 0.5 分」制約 documentation 済 |
| `notifications` | 「🆕 DevToolsNext を自動更新しました」通知 | 自動アップデート時の利用者通知 (background.js) |

**最小権限原則**: 各 permission は具体的機能の実現に必須のものに限定。`tabs` / `activeTab` / `scripting` は冗長に見えるが、popup と DevTools panel で異なる context (popup = activeTab 必要、panel = inspectedWindow 経由) のため両方必須。

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
| v3.370.0 以降 (Phase 460 マイルストーン後の最新) | ✅ 修正対象 |
| v3.0.0 〜 v3.369.x | ⚠ 最新版へアップグレード推奨 |
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

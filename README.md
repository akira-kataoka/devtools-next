# Salesforce DevTool (Chrome / Edge 拡張)  v0.6.0

Salesforce 開発者向けユーティリティ拡張機能 (Manifest V3)。
SOQL 実行 / レコードID 解析 / REST API 探索 / Setup ショートカット / Tooling API 経由のメタデータ一覧と Debug ログ閲覧 / **匿名 Apex 実行** / **Login History ビュー** / **設計書ジェネレータ (Excel / Markdown / HTML / CSV / TSV / Mermaid ER 図)** などを、ログイン済みタブの **Session ID (sid Cookie)** を借用して直接実行します。

## 更新履歴
- **v0.9.0 (2026-05-20 00:35)** — 改名 + GitHub 連携:
  - **🏷️ 拡張名を「DevToolsNext」に改名** — manifest.name / _locales (ja+en) / 全 HTML タイトル + brand 表示 / popup の whats-new 文言を統一
  - **README ヘッダ更新**: 旧 Salesforce DevTool 表記を残しつつ DevToolsNext を主表記に
- **v0.8.0 (2026-05-20 00:20)** — 洗練フェーズ:
  - **🎨 ナビをカテゴリ別に再編**: 「データ操作 / 開発ツール / 監視 / メタデータ・デプロイ / 設計書」の 5 カテゴリにグループ化 (panel.html + tool.html 両方)
  - **🔍 共通 Picker 導入**: オブジェクト / フィールド / Profile / PermSet / Apex / Flow / LWC / User 等の選択を統一モーダルに集約。オートコンプリート + ↑↓ キー操作 + Enter 確定 + Esc キャンセル。Describe / データエクスポート / API URL ビルダー / 設計書ジェネレータ の入力欄に 🔍 ボタンを自動追加
  - **🔄 設計書 Picker の自動切替**: 設計書タイプを変えると Picker の対象も切替 (Profile 詳細 → Profile/PermSet 統合 Picker、Flow 詳細 → Flow Picker、Apex 詳細 → ApexClass Picker、LWC 詳細 → LWC Picker)
  - **🐛 エラーハンドリング統一**: 401/403/404/400/429/500 ごとに「何が起きた + どう直すか」フォーマット (displayApiError 共通ヘルパー)
  - **🐛 panel.js の init を try/catch でラップ**: 初期化失敗時にも UI が固まらない
  - **🆕 panel.js initHeader**: tool.html / DevTools パネル両方にバージョン badge + ⬆ アップデート確認ボタンをコード側から追加
  - **📋 競合比較メモ作成**: Inspector Reloaded / DevTools (lvshanbi) / ORGanizer / Profile Reader vs 我々の機能差分を memory に保存
  - **🚫 新機能追加 0 件** (feedback_no_new_features に従う)
- **v0.7.0 (2026-05-20 00:08)**:
  - 401 INVALID_SESSION_ID 修正 (my.salesforce.com 優先)
  - F12 不要化 (tool.html フルページ)
  - GitHub 連携セットアップ (git init + LICENSE + GITHUB_SETUP.md)
- **v0.6.0 (2026-05-19 23:55)**:
  - **🔄 自動アップデート機能**: `VERSION.txt` を 30 秒ごとにポーリングし、変更検知で `chrome.runtime.reload()` 実行 → Chrome に自動適用。Windows 通知でユーザーに告知。**Load unpacked でも自動更新可能**
  - **🐛 userinfo 403 修正**: Lightning sid Cookie は OAuth トークンではないため `/oauth2/userinfo` が `Bad_OAuth_Token` で失敗。Chatter REST `/chatter/users/me` フォールバックに切替
  - **📥 データエクスポート**: 全フィールド自動列挙 + WHERE/ORDER/LIMIT + CSV/Excel(.xls)/JSON、50000 件上限、進捗表示
  - **🔗 API URL ビルダー**: 17 種類の操作 (describe/get/create/update/upsert/delete/query/tooling-query/search/composite/composite-tree/batch/limits/versions/userinfo/event-log-file 他) → REST URL + curl サンプル自動生成
  - **📦 変更セット / package.xml**: 26 種類のメタデータ型から複数選択 → package.xml 生成 + SFDX バンドル (.md) ダウンロード
  - **popup に「v0.6.0 新機能ガイド」カード追加** + DevTools パネルを開く方法のオーバーレイヘルプ
  - **popup ヘッダにバージョン表示** + ⬆ アップデート確認ボタン (即時 reload 検証)
- **v0.5.0 (2026-05-19 23:30)**:
  - **🔍 レコード Inspector** (DevToolsパネル) — 現在表示中のレコードページから自動でIDを抽出、または手動入力で、**全フィールド値を一覧表示**。Salesforce Inspector 互換。空値/System項目フィルタ、値検索、参照クリックで遷移、JSON/CSV エクスポート
  - **📊 Limits ダッシュボード化** — 進捗バー + 危険上位5件のカード表示 + ソート (使用率/使用量/名前) + 70%超フィルタ + CSV
  - **設計書 5 種類追加**: アプリケーション一覧 (AppDefinition + AppMenuItem) / アクセスコントロール定義書 (OWD + UserRole) / フロー設計図 (Flow metadata 14 要素抽出) / Apex 設計図 (SymbolTable から メソッド/プロパティ/内部クラス/外部参照) / LWC 設計図 (LightningComponentBundle + LightningComponentResource)
  - **設計書 計 20 種類** (v0.4.0 の 15 種 + 5 種)
- **v0.4.0 (2026-05-19 23:05)**:
  - **致命的バグ修正**: popup.html の `<script>` に `type="module"` が無く popup.js 全体が動作していなかった (v0.1.0 以来の潜在バグ)。"未接続" のまま操作不能だった問題を解消
  - **クイックログイン (Login as User)** — popup ホームから Active User を検索 → クリックで `/servlet/servlet.su` 遷移
  - **プロファイル/権限セット詳細レポート (FLS含む)** — Salesforce Profile Reader 互換。Object 権限 / FLS / System 権限 / Apex / VF / Tab / RecordType / App 可視性 を Excel 9 シート出力
  - **項目レベルセキュリティ (FLS) レポート** — 1オブジェクトの全フィールド × Profile/PermSet を縦持ち
  - **フィールド権限マトリクス設計書** — 行=フィールド、列=Profile/PermissionSet (👤/🔑 で区別)、セル=`RW`/`R-`/`--`
  - **オブジェクト権限マトリクス設計書** — セル=`[C][R][U][D][V][M]` 6桁表記
  - SOQL 履歴: ダブルクリックで削除、長押し (500ms) でピン留め切替、ピン留めは件数制限の対象外
  - 履歴クリアは未ピン項目のみ削除
- **v0.3.0 (2026-05-19)**:
  - **設計書ジェネレータ追加** (DevTools パネル → 設計書) — Excel(.xls)/Markdown/HTML/CSV/TSV で 11 種類: オブジェクト定義書 / プロファイル一覧 / 権限セット一覧 / Apex クラス一覧 / Apex トリガ一覧 / Flow 一覧 / 入力規則一覧 / レコードタイプ一覧 / フィールドセット一覧 / カスタム設定一覧 / ER 図 (Mermaid)
  - **ログイン不可バグ修正**: `getSessionId` を `url:` ベースに書き換え + 親ドメインフォールバック追加。アクティブタブが非SFの場合に他タブから自動検出
  - 接続失敗時の診断メッセージ強化 (cookie ドメイン、取得経路を表示)
- **v0.2.0 (2026-05-19)**: DevTools パネルに「Apex 実行」「Login History」ビュー追加 / popup SOQL タブに履歴 (最新10件) / `_locales/ja|en/messages.json` 追加
- **v0.1.0 (2026-05-19)**: 初版。popup 5タブ / DevTools 6ビュー / sf-api.js / アイコン / README / zip 配布

---

## 機能

### Popup (拡張アイコン)
- **セッション情報**: ドメイン / Org Id (15) / User Id / sid プレビュー / API バージョン切替
- **クイックアクション**: Setup / Developer Console / Object Manager / マイプロフィール / 組織情報 / ログアウト
- **🔐 他ユーザーとしてログイン (Login as User)** *(NEW v0.4.0)* — 検索ボックスに名前/Username/Email/Alias の一部を入れて検索 → 候補リストから選ぶと `/servlet/servlet.su` 経由で代理ログイン
- **SOQL クエリ**: 即実行・テーブル表示・Tooling API トグル・CSV エクスポート・**履歴 (最新10件・クリックで復元・ダブルクリック削除・長押しピン留め)** *(v0.4.0 UX改善)*
- **ID 解析**: 15→18 桁変換、Key Prefix からの推定オブジェクト名、レコードを開く
- **REST API 探索**: GET/POST/PATCH/DELETE 任意呼び出し、`/limits`・`/versions` ショートカット
- **便利リンク**: Setup 配下の頻出ページ 18 種

### DevTools パネル ( F12 → "Salesforce" )
- **🔍 レコード Inspector** *(NEW v0.5.0)* — 「現在タブから取得」で Lightning URL からレコードID自動抽出 → 全フィールド値を一覧。フィールド名/ラベル/値検索、空値表示切替、System項目 (CreatedById/SystemModstamp等) 表示切替、参照項目クリックで遷移、JSON/CSV エクスポート、レコードを開く
- **SOQL クエリ** — 名前付き保存 (chrome.storage.local) / Tooling API / CSV / Ctrl+Enter 実行
- **Apex 実行** *(NEW v0.2.0)* — Tooling `/executeAnonymous` で匿名 Apex を実行。コンパイルエラー/例外表示、Debug Log 本文を直後に自動取得して表示。スニペット保存対応。
- **Describe** — オブジェクトのフィールド一覧（必須・参照・picklist 件数も表示）
- **REST 探索** — 任意の REST/Tooling パスに任意メソッドで送信
- **Metadata 一覧** — ApexClass / Trigger / Flow / CustomObject / PermissionSet / Profile / StaticResource / LWC / Aura / ValidationRule
- **Debug Logs** — ApexLog 最新 20 件 (ユーザー名・操作・処理時間)
- **Login History** *(NEW v0.2.0)* — LoginHistory を `LoginType / Application / Status / ApiType / ApiVersion / ClientVersion / Browser / Platform / SourceIp` で表示。Success/Failed フィルタ、CSV エクスポート。SOAP login() と OAuth 2.0 username-password flow の識別が即座にできる
- **📊 Limits ダッシュボード** *(強化 v0.5.0)* — 進捗バー + 危険上位5件カード + ソート (使用率/使用量/名前) + 70%超フィルタ + CSV
- **設計書ジェネレータ** *(NEW v0.3.0)* — 11 種類の設計書を Excel/Markdown/HTML/CSV/TSV で生成
  - **オブジェクト定義書**: フィールド一覧 (型/桁/必須/一意/参照先/選択リスト値/デフォルト/説明) + 概要 + 子リレーション + レコードタイプ
  - **★ プロファイル/権限セット詳細レポート** *(NEW v0.4.0)*: Salesforce Profile Reader 互換。1プロファイル/権限セットの **Object 権限 / FLS / System 権限 / Apex / VF / Tab / RecordType / App 可視性** をExcelの 9 シートで網羅
    - 入力: プロファイル名 (例: `営業ユーザー`) または `@PermSet_API名` (`@`プレフィックス＝権限セット)
  - **★ 項目レベルセキュリティ (FLS) レポート** *(NEW v0.4.0)*: 1オブジェクトの全フィールドに対し、編集可/参照のみ/アクセス無し の Profile/PermSet 一覧を縦持ち
  - **★ フィールド権限マトリクス** *(NEW v0.4.0)*: 行=フィールド、列=Profile/PermissionSet、セル=`RW`/`R-`/`--` の早見表
  - **★ オブジェクト権限マトリクス** *(NEW v0.4.0)*: セル=`[C][R][U][D][V][M]` 6桁 (Create/Read/Update/Delete/ViewAll/ModifyAll)
  - **★ アプリケーション一覧** *(NEW v0.5.0)*: AppDefinition + AppMenuItem
  - **★ アクセスコントロール定義書** *(NEW v0.5.0)*: 組織共通既定設定 (OWD) + Private/ControlledByParent 注意リスト + ロール階層 (UserRole)
  - **★ フロー設計図** *(NEW v0.5.0)*: 1 Flow の **変数 / 定数 / 計算式 / 分岐 / 代入 / レコード CRUD / 画面 / ループ / サブフロー / アクション呼び出し** を 14 セクションで分解
  - **★ Apex 設計図** *(NEW v0.5.0)*: 1 クラスの SymbolTable から **メソッド / プロパティ / インスタンス変数 / 内部クラス / 外部参照 / 参照トリガ** を抽出
  - **★ LWC 設計図** *(NEW v0.5.0)*: 1 バンドル内の全ファイル一覧 (.html/.js/.css/.xml) と TargetConfigs
  - **プロファイル / 権限セット 一覧**
  - **Apex クラス / トリガ 一覧** (トリガは Before/After Insert/Update/Delete/Undelete の 7 操作行列)
  - **Flow 一覧** (Active のみ、FlowDefinitionView 優先、Flow へフォールバック)
  - **入力規則 / レコードタイプ / フィールドセット 一覧** (オブジェクト指定可)
  - **カスタム設定一覧**
  - **ER 図 (Mermaid)** — 起点オブジェクトから 1-hop の親子関係。Mermaid Live Editor (https://mermaid.live) に貼ると可視化
  - **Excel 出力**: SpreadsheetML XML 形式。複数 section が複数シートに分かれる。ヘッダ固定・色付き・縞模様対応。`.xls` で保存され Excel ダブルクリックで開ける

### 右クリックメニュー
- 選択した 15 桁 ID を 18 桁に変換してコピー
- 選択した ID を新規タブで Salesforce に開く

---

## デプロイ（インストール）方法

> **重要な前提**: Chrome 73 以降、**外部の .crx ファイルを直接インストールする手段は塞がれています**。  
> ローカル .crx を `chrome://extensions` にドラッグ&ドロップしても "CRX_REQUIRED_PROOF_MISSING" で拒否されます。  
> 実用的な配布方法は **(A) Load unpacked / (B) Web Store / (C) 企業ポリシー (ExtensionInstallForcelist)** の 3 通りです。

---

### 方法 A: 開発者モードで `Load unpacked`（最速・推奨）

#### Chrome / Edge / Brave / Arc 共通
1. このディレクトリ全体 `sf-devtool-extension/` を任意の場所に保持（Box / OneDrive / GitHub からダウンロードで OK）
2. ブラウザで `chrome://extensions` (Edge は `edge://extensions`) を開く
3. 右上の「**デベロッパー モード**」(Developer mode) を ON
4. 「**パッケージ化されていない拡張機能を読み込む**」(Load unpacked) をクリック
5. `sf-devtool-extension/` フォルダを選択
6. Salesforce のタブを開いて拡張アイコンをクリック → "接続OK" バッジが出れば成功

> 更新後は同画面の更新アイコン (⟳) を押すと再読込されます。
> このモードでは Chrome 起動時に「**デベロッパー モードの拡張機能を無効にする**」警告が出ますが、無視 OK。

---

### 方法 B: `.zip` を配布 / インストール（人に渡す場合）

社内の同僚に渡すケース。受け取った人は同じく Load unpacked で読み込みます。

1. PowerShell で zip 化:
   ```powershell
   cd "c:\Users\user\OneDrive\ドキュメント\Github\AccountGanttChart"
   Compress-Archive -Path sf-devtool-extension\* -DestinationPath sf-devtool-extension.zip -Force
   ```
   → 同梱済 `sf-devtool-extension.zip` (約 60KB) をそのまま使えます
2. 配布: Slack / メール / Box / GitHub Release などで `.zip` を共有
3. 受け取った人:
   1. zip を任意の場所に展開（**展開後のフォルダは消さない** — このフォルダを Chrome が直接参照するため）
   2. `chrome://extensions` → デベロッパーモード ON → **Load unpacked** で展開フォルダを選択

---

### 方法 C: `.crx` パッケージを生成して企業 GPO で強制配布

`.crx` は Chrome 用の署名付き圧縮ファイルです。手動インストールはブロックされていますが、企業ポリシー (Chrome Enterprise / Microsoft Intune) なら配布可能。

#### C-1. CRX ファイル生成
1. `chrome://extensions` を開いてデベロッパーモード ON
2. **「拡張機能をパッケージ化」** ボタン（Pack extension）をクリック
3. ダイアログで:
   - **拡張機能のルートディレクトリ**: `c:\Users\user\OneDrive\...\sf-devtool-extension`
   - **秘密鍵ファイル**: 初回は空欄 → `.crx` と `.pem` (秘密鍵) が同階層に生成される
   - 2回目以降は同じ `.pem` を指定すれば拡張 ID が固定される（重要！）
4. 出力: `sf-devtool-extension.crx` + `sf-devtool-extension.pem`

或いはコマンドラインで:
```powershell
& "C:\Program Files\Google\Chrome\Application\chrome.exe" `
  --pack-extension="c:\Users\user\OneDrive\ドキュメント\Github\AccountGanttChart\sf-devtool-extension" `
  --pack-extension-key="c:\path\to\sf-devtool-extension.pem"
```

#### C-2. CRX から拡張機能 ID を取得
```powershell
# .pem から ID を計算（pem の SHA256 から ID 32 文字を出す Python スクリプトが必要）
# 簡単な代替: chrome://extensions のページに pack 直後に表示される ID をメモする
```

#### C-3. 配布パターン

| シナリオ | 配布方法 |
|---|---|
| **Google Workspace 管理組織** | 管理コンソール → デバイス → Chrome → アプリと拡張機能 → 「カスタム アプリ」として `.crx` URL を登録 → `ExtensionInstallForcelist` |
| **Active Directory + Chrome Enterprise GPO** | GPO `Computer Configuration > Policies > Administrative Templates > Google Chrome > Extensions > Configure the list of force-installed apps and extensions` に `<拡張ID>;<update_url>` の形式で登録 |
| **Microsoft Intune (MDM)** | デバイス構成 → Chrome 拡張機能 → `ExtensionInstallForcelist` に同様に登録 |
| **Windows Registry 直接** | `HKLM\Software\Policies\Google\Chrome\ExtensionInstallForcelist` に `1 = "<id>;<update_xml_url>"` を追加 |

`update_xml_url` は社内 IIS / S3 などにホストし、以下のような XML を返すよう構成:
```xml
<?xml version='1.0' encoding='UTF-8'?>
<gupdate xmlns='http://www.google.com/update2/response' protocol='2.0'>
  <app appid='<拡張ID>'>
    <updatecheck codebase='https://internal.example.com/sf-devtool-extension.crx' version='0.5.0' />
  </app>
</gupdate>
```

---

### 方法 D: Chrome Web Store に公開（最も楽な一般配布）

社外配布や、社員にエンドユーザー権限で入れてもらう場合は **Web Store 経由が最も簡単** で、 `.crx` のホスティングや GPO 設定が不要になります。

1. [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole/) に登録（初回 **$5** の開発者登録料／買い切り）
2. このディレクトリの **`sf-devtool-extension.zip`** をアップロード
3. プライバシーポリシー URL・スクリーンショット (1280x800 推奨、最低 1 枚)・説明文を入力
4. 「**審査に提出**」→ 通常 1〜3 日で公開
5. **公開範囲の制御**:
   - **公開**: 全世界に公開
   - **限定公開 (Unlisted)**: URL を知ってる人だけ
   - **限定 (Private)**: 指定 Google Workspace 組織内のみ ← **社内配布に最適**
   - 信頼済みテスター: 指定メールアドレスのみ

#### Web Store 公開時の必要素材
- アイコン 128x128 (`icons/icon128.png` 同梱済)
- スクリーンショット 1280x800 を 1〜5 枚
  - 推奨: popup ホーム / Inspector / 設計書 Excel 出力 / Limits ダッシュボード / SOQL 結果
- 説明文 (短い説明 132 文字以内 + 詳細説明 16,000 文字以内)
- プライバシーポリシー URL（必須）

---

### 方法 E: Microsoft Edge Add-ons (Edge 専用 / 無料)

1. [Microsoft Partner Center](https://partner.microsoft.com/dashboard/microsoftedge/) に**無料**登録
2. 同じ `sf-devtool-extension.zip` をアップロード（manifest はそのまま使用可）
3. 審査通過後に Edge Add-ons ストアに公開される
4. 公開後は Edge ブラウザのストアからワンクリックでインストール可能

---

### 配布フロー早見表

```
個人で使う          → 方法A (Load unpacked) 一択
社内数名に配る      → 方法B (.zip 配布 → 受け手は Load unpacked)
社内全員に配る      → 方法C (GPO/Intune で ExtensionInstallForcelist)
                      ｜社内専用 Web Store を立てない場合は GPO 必須
社外/一般に公開     → 方法D (Chrome Web Store) + 方法E (Edge Add-ons)
                      ｜社内限定なら Web Store の限定公開でも OK
```

---

### 🔄 自動アップデートの仕組み (v0.6.0〜)

この拡張は **`VERSION.txt`** を内蔵しており、background service worker が **30 秒間隔** でその内容を読み取って、前回値と比較します。値が変わったら自動で `chrome.runtime.reload()` を呼び、**Chrome に再ロードを指示** します。Load unpacked モードでも動作します。

#### 動作モード
| インストール方式 | 自動更新の仕組み |
|---|---|
| **Load unpacked** | `VERSION.txt` を書き換える (例: `0.6.0` → `0.6.1`) → 30 秒以内に拡張が `chrome.runtime.reload()` を実行 → 全ファイルが再読み込みされる |
| **Chrome Web Store** | Chrome が定期的に新バージョンをチェック・自動インストール (5〜10時間間隔)。`VERSION.txt` の仕組みは無関係 |
| **GPO / Intune (CRX)** | `update_url` で指定した XML をブラウザが定期確認。Web Store と同等の自動更新が可能 |

#### 自律的に新版を配るワークフロー (Load unpacked 想定)
1. 開発側で機能追加・バグ修正
2. `VERSION.txt` の数字をインクリメント (例: `0.6.0` → `0.6.1`)
3. ファイルを `sf-devtool-extension/` 内に上書きコピー
4. ⏱ **30 秒以内** にユーザーの Chrome で:
   - background が変化を検知
   - Windows 通知 "SF DevTool を自動更新: 0.6.0 → 0.6.1" が表示
   - `chrome.runtime.reload()` で新版が即座に適用

#### 手動チェック
- popup ヘッダの **⬆ ボタン** をクリック → 即座に VERSION.txt を再チェック (30 秒待たずに反映)

#### 通知が出ない場合
- `chrome://settings/content/notifications` で Chrome の通知が許可されているか確認
- 拡張詳細ページ → "サイトアクセス" 設定確認

### CRX/ZIP の同梱物

このリポジトリには配布物として `sf-devtool-extension.zip` (約 60KB) を同梱しています。  
これは `manifest.json` をルートに持つ展開済みディレクトリの zip 圧縮で、上記方法 B / D / E すべてに使えます。  
方法 C のために `.crx` を自分で生成する場合は、Chrome の「拡張機能をパッケージ化」を使ってください（このリポジトリには `.crx` は含めていません — `.crx` は秘密鍵 `.pem` で署名されるため、組織ごとに鍵を分けるべきだからです）。

---

## 既知の前提・制約

- **sid Cookie** は HttpOnly 属性付きだが、`cookies` permission により拡張からは読める。これを使って Bearer 認証 fetch を行う。
- Lightning ドメイン (`*.lightning.force.com`) は REST 用に `*.my.salesforce.com` に書き換える（`sf-api.js` の `toApiHost`）。
- セッションタイムアウト時は popup の `⟳` で再取得すれば良い。
- Salesforce 側の **CSP / CORS** は同一 Org への fetch ならクリアできる（拡張は `host_permissions` を保持）。

---

## 開発

```
sf-devtool-extension/
├── manifest.json
├── html/  popup.html / panel.html / devtools.html
├── css/   popup.css / panel.css
├── js/    background.js / content.js / popup.js / panel.js / devtools.js / sf-api.js
├── icons/ icon16/32/48/128.png
└── README.md
```

### JSON 検証
```powershell
Get-Content sf-devtool-extension\manifest.json -Raw | ConvertFrom-Json | Out-Null
```

### 反復改修
本拡張は継続的に機能追加されています。サイクル単位で UX 改善とウィジェット追加が並走する開発ループを採用しています。

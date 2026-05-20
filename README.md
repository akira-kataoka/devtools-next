# Salesforce DevTool (Chrome / Edge 拡張)  v0.6.0

> 🎊 **v2.0.0 メジャーバージョン化** (2026-05-20)。v1.0.0 から累計 100 minor リリース。自律改善ループで品質を高める方向に振り切った継続的改善の集大成として、起動時 TDZ バグの構造的解決 (queueMicrotask)、全 CSV/Excel の整形統一 (ネスト平坦化 + datetime)、16 種類 download の toast 完備、IME 保護 3 環境統一、CSS Containment、WCAG AAA コントラスト、🚨 起動時エラー対処 README を達成。
> 過去 v1.91.0 で累計 100 サイクルの自律改善ループ達成 (2026-05-20)。


Salesforce 開発者向けユーティリティ拡張機能 (Manifest V3)。
SOQL 実行 / レコードID 解析 / REST API 探索 / Setup ショートカット / Tooling API 経由のメタデータ一覧と Debug ログ閲覧 / **匿名 Apex 実行** / **Login History ビュー** / **設計書ジェネレータ (Excel / Markdown / HTML / CSV / TSV / Mermaid ER 図)** などを、ログイン済みタブの **Session ID (sid Cookie)** を借用して直接実行します。

## 更新履歴
- **v2.37.0 (2026-05-20 15:55)** — 🚨 ユーザー要望 Phase 27: apiBuildUrl note / LoginHistory 列名 / curl SID コメント:
  - **🐛 panel.js loginHistoryTable**: 列名を 11 個すべて日本語化 (LoginTime → ログイン日時、SourceIp → 送信元 IP アドレス、Platform → OS / プラットフォーム 等)、ヘッダに API 名を tooltip 表示、Status pill を「✓ Success」「✗ Failed」絵文字付きに、LoginTime を YYYY-MM-DD HH:mm に整形、空状態を「📭 該当するログイン履歴はありません」に
  - **🐛 panel.js apiBuildUrl note**: 「⚠ オブジェクト API 名 が必要です」→「⚠ オブジェクトの API 名を入力してください」、「⚠ Object と Id が必要です」→「⚠ オブジェクト API 名とレコード ID の両方を入力してください」、外部 ID 形式エラーを ですます調 詳細化
  - **🐛 panel.js curl SID コメント**: 「# 環境変数 SID は popup → セッション → copy で取得した値」→「# 環境変数 SID にはポップアップ > セッション情報 > コピー で取得した値を設定してください」、「# 実際は完全な sid を使用」→「# 実際は完全な sid を使用してください」
  - **🐛 panel.js Login History CSV toast**: 「📥 Login History CSV (N 件 / X KB)」→「📥 ログイン履歴 CSV をダウンロードしました (N 件 / X KB)」
- **v2.36.0 (2026-05-20 15:50)** — 🚨 ユーザー要望 Phase 26: API_HELP 19 項目業務拡充 + SOQL/Export meta:
  - **🐛 panel.js API_HELP 解説 19 オペレーション**: 各オペレーションの説明に「業務用途:」を追加して 2-3 行に拡充 (例: describe → 「新規開発前の項目仕様確認 / 監査時の項目台帳作成」、composite → 「API コール数削減 / トランザクション的に関連処理を実行」、event-log-file → 「監査ログのダウンロード / セキュリティ監視」)
  - **🐛 panel.js SOQL 結果 meta**: 「N 件 total=M / Tms Tooling」→「取得 N 件 / 合計 M 件 / Tms / Tooling (tooltip 付き)」に業務化
  - **🐛 panel.js Export プレビュー meta**: 「(実行時は最大 N 件)」→「(実行時は最大 N 件まで取得します)」に
- **v2.35.0 (2026-05-20 15:45)** — 🚨 ユーザー要望 Phase 25: 変更セット 3 種 列名業務化 + Inspector 戻る tooltip:
  - **🐛 panel.js csListOutbound (送信変更セット一覧)**: 列名を「変更セット名 / 説明 / ステータス / 送信先組織 / ロック / 更新日」に日本語化、Status マッピング (New=未送信 / Uploading=送信中 / Uploaded=送信済 / Failed=失敗)
  - **🐛 panel.js csListInbound (受信変更セット一覧)**: 列名を「変更セット名 / 説明 / ステータス / 送信元組織 / 更新日」に日本語化、Status マッピング (New=新規 / Validated=検証済 / Deployed=デプロイ完了 / Failed=失敗)
  - **🐛 panel.js csListDeployStatus (デプロイ状況)**: 列名を「ステータス / コンポーネント / テスト / 検証のみ / テスト実行 / 実行者 / 開始日時 / 完了日時」に日本語化、Status マッピング 7 種 (⏳ 待機中 / 🔄 実行中 / ✓ 成功 / △ 部分成功 / ✗ 失敗 / ⏸ 取消中 / ⏹ 取消済)、コンポーネント/テスト数を「N / 総数 (✗ エラー)」形式に整形、完了日時 null を「(未完了)」に
  - **🐛 panel.js Inspector 戻るボタン tooltip**: 履歴件数に応じて「一つ前のレコードに戻ります (履歴 N 件)」または「履歴がまだありません (一度別レコードを取得すると有効化されます)」を動的表示
- **v2.34.0 (2026-05-20 15:40)** — 🚨 ユーザー要望 Phase 24: Metadata 一覧 / ApexLog 列名業務化 + recordsTable 空文言:
  - **🐛 panel.js doMetadataList()**: 列名を SF API のままから「API 名 / ネームスペース / 管理状態 / 作成日 / 更新日」に日本語化、ManageableState を「未管理 / インストール済 (編集可) / インストール済 (読取専用) / 非推奨 / 削除済」マッピング、ネームスペース空欄に「(なし)」明示
  - **🐛 panel.js doFetchLogs() (Apex ログ)**: 列名を「実行ユーザ / ステータス / アプリ / 操作 / ログサイズ / 実行時間 / 開始日時」に日本語化、Status を「✓ 成功 / ✗ エラー / ⚠ 警告」、LogLength を「N バイト」、DurationMilliseconds を「N ms」表示
  - **🐛 panel.js Apex ログエラー context**: 「ApexLog 取得」→「Apex ログ取得」に
  - **🐛 panel.js recordsTable 空状態**: 「📭 該当データなし」→「📭 該当するデータはありません」に ですます調
- **v2.33.0 (2026-05-20 15:35)** — 🚨 ユーザー要望 Phase 23: API URL ビルダー / Metadata 一覧 タブ業務化:
  - **🐛 panel/tool.html API URL ビルダー**: apiObj placeholder を「オブジェクト API 名 (例: Account)」→「オブジェクトの API 名を入力してください (例: Account)」、▶ URL 生成 / URL コピー / curl コピー / ブラウザで開く 全 4 ボタンに機能説明 title 追加 (curl コピー: 「sid 含む」を明示)
  - **🐛 panel/tool.html API URL ビルダー結果ペイン**: 「REST URL」→「生成された REST URL」、「curl サンプル」→「curl コマンド サンプル」、「解説」→「解説 / 使い方」
  - **🐛 panel/tool.html Metadata 一覧**: mdType select に title「一覧を取得するメタデータ型を選択してください」、一覧取得ボタンに title「選択したメタデータ型の一覧を Tooling API から取得します」追加
- **v2.32.0 (2026-05-20 15:30)** — 🚨 ユーザー要望 Phase 22: Limits カード + Inspector 値表示 細部:
  - **🐛 panel.js Limits 詳細カード**: critical (pct >= 90) に「🚨 危険水準」、warn (70-89) に「⚠ 注意水準」のステータスラベル付与、カード自体にも tooltip 追加、健全時「✓ OK」→「✓ 問題なし」
  - **🐛 panel.js Inspector 値表示**: 「(null)」→「(空)」+ tooltip「値が設定されていません (null)」、boolean を「✓ true / ✗ false」→「✓ はい (true) / ✗ いいえ (false)」、tooltip「raw:」→「raw 値:」、datetime tooltip「raw:」→「ISO raw 値:」
  - **🐛 panel.js Inspector 属性フラグ**: U / 必 / → / f(x) の 4 バッジに tooltip 追加 (「一意 (Unique) 制約あり」「必須項目 (入力必須)」「参照項目 (他オブジェクトへの Lookup または Master-Detail)」「計算項目 (formula)」)
- **v2.31.0 (2026-05-20 15:25)** — 🚨 ユーザー要望 Phase 21: loginAs / Inspector 表示細部 ですます調:
  - **🐛 popup.js loginAs 検索**: 「検索中…」→「⏳ ユーザを検索しています…」、エラー文「❌ HTTP N: ...」→「❌ ユーザ検索に失敗しました (HTTP N): ...」、空結果ヒント「ユーザーがいません」→「ユーザは見つかりませんでした」+ 補足を ですます調 詳細化、「Modify All Data / View All Users」を業務語注釈付きに、「Active なユーザー」→「有効なユーザ」
  - **🐛 popup.js user-action**: 英語「Login」→「ログイン」+ tooltip「このユーザとしてログインします」追加
  - **🐛 popup.js loginAsUser**: セッション情報なし toast を「セッション情報が取得できていません。先に Salesforce タブで再接続してください」に詳細化
  - **🐛 panel.js Inspector フィールド行**: ヘッダ「フラグ」→「属性フラグ」、参照項目セルの tooltip「クリックで X レコードを開く」→「クリックで X のレコードを Inspector で開きます」
- **v2.30.0 (2026-05-20 15:20)** — 🚨 ユーザー要望 Phase 20: Apex 実行結果 pill + displayApiError ヒント文 + 設定 toast:
  - **🐛 panel.js Apex 実行結果 pill**: 「Success」→「✓ 成功 (Success)」、「Runtime Error」→「⚠ 実行時エラー (Runtime Error)」、「Compile Error」→「❌ コンパイルエラー (Compile Error)」と絵文字+日本語+原文併記、「line X:Y」→「エラー位置: X 行目 / Y 列目」に
  - **🐛 panel.js Apex 詳細**: 「Compile:」→「コンパイルエラー内容:」、「Exception:」→「例外メッセージ:」、stackTrace に「スタックトレース:」ラベル付与
  - **🐛 panel.js displayApiError 6 ヒント文 (401/403/404/400/429/500)**: 全文を ですます調 + 業務用語拡充 (例: 「現在のユーザに権限がありません」「OWD (組織既定の共有設定)」「指定された名前 / Id が見つかりません」「API コール数の上限に達しました」「しばらくお待ちいただいた後、再度お試しください」)
  - **🐛 popup.js 設定アイコン未実装 toast**: 「⚠ 設定画面はまだ実装されていません」→「⚠ 設定画面は今後のバージョンで実装予定です (現在は未実装)」
- **v2.29.0 (2026-05-20 15:15)** — 🚨 ユーザー要望 Phase 19: Inspector 履歴/inspectRef / 各タブ pill エラー文言:
  - **🐛 panel.js Inspector 履歴戻る toast**: 「⏪ 戻る: Account:001…」→「⏪ 前のレコード (Account:001…) に戻りました」に詳細化
  - **🐛 panel.js Inspector pill エラー**: 「未接続」→「Salesforce 未接続」、「有効な ID ではありません」→「有効な Salesforce ID ではありません (15 桁または 18 桁の英数字を入力してください)」、「KeyPrefix='X' のオブジェクトが見つかりません」→「Key Prefix 'X' のオブジェクトが見つかりませんでした」、「レコード取得失敗」→「レコードの取得に失敗しました」、「⏳ 取得中…」→「⏳ レコードを取得しています…」
  - **🐛 panel.js ChangeSet/Export/API URL/Design/LoginHistory 未接続表示**: 「未接続」→「Salesforce 未接続」+ 補足説明、「describe 取得中…」→「describe 情報を取得しています…」、「Failed N」→「失敗 N 件」
  - **🐛 panel.js Picker / 候補ロード**: 「⏳ 取得中…」→「⏳ 候補を取得しています…」
  - **🐛 panel.js ブランドクリック title**: 「クリックで SOQL クエリ画面に戻る」→「クリックで SOQL クエリ画面に戻ります」
- **v2.28.0 (2026-05-20 15:10)** — 🚨 ユーザー要望 Phase 18: キーボードショートカット toast / Inspector ドリル / parseId 結果:
  - **🐛 panel.js キーボードショートカット (Ctrl+Alt+I/Q/A/L/R/D)**: 切替時 toast を「inspector ビューに切り替え」→「🔍 レコード Inspector ビューに切り替えました」のように絵文字付き正式名称に統一 (6 ビュー)
  - **🐛 panel.js Inspector cell-id クリック**: tooltip 文言を「Click: Inspector で開く / ダブルクリック: コピー」→「クリックで Inspector に表示します / ダブルクリックでクリップボードにコピーします」に ですます調 詳細化、toast「Inspector で開く」→「Inspector で開きます」
  - **🐛 popup.js parseId() 結果表示**: 「15桁/18桁/Prefix/推定Object/レコードURL」→「15 桁 ID / 18 桁 ID / Key Prefix (先頭 3 文字) / 推定オブジェクト / レコード URL」に業務化、コピーボタン文字を「copy」→「コピー」、(SF未接続)→「(Salesforce に未接続)」、エラー文言詳細化
- **v2.27.0 (2026-05-20 15:05)** — 🚨 ユーザー要望 Phase 17: ナビボタンアイコン統一 + 便利リンク日本語化:
  - **🐛 panel.html / tool.html ナビボタン全 13 個に絵文字プレフィックス統一**: 「SOQL クエリ」→「🔎 SOQL クエリ」、「Apex 実行」→「🟧 Apex 実行」、「REST 探索」→「🌐 REST 探索」、「Describe」→「📖 Describe」、「Limits ダッシュボード」→「📊 Limits ダッシュボード」、「Debug Logs」→「📜 Debug ログ」、「Login History」→「🔐 ログイン履歴」、「Metadata 一覧」→「📦 メタデータ一覧」、「変更セット」→「🔧 変更セット」、「設計書ジェネレータ」→「📋 設計書ジェネレータ」、各ボタンに機能説明 title 追加
  - **🐛 tool.html CSS**: 重複していた `.nav-btn[data-view="X"]::before { content: ... }` 13 ルールを削除し、`::first-letter` 単一ルールに集約。テキストに絵文字プレフィックスが入ったため二重表示問題を回避
  - **🐛 popup.js 便利リンク 18 項目を日本語化**: 「⚙️ Setup」→「⚙️ 設定 (Setup)」、「Object Manager」→「オブジェクトマネージャ」、「Custom Settings/Metadata」→「カスタム設定/メタデータ型」、「Apex Classes/Triggers」→「Apex クラス/トリガ」、「Connected Apps」→「接続アプリケーション」、「Debug Logs」→「デバッグログ」、「Scheduled Jobs」→「スケジュール済みジョブ」、「Apex Jobs」→「Apex 非同期ジョブ」、「Login History」→「設定変更履歴 (Setup Audit Trail)」、「Profiles/Permission Sets/Users」→「プロファイル/権限セット/ユーザ管理」、「Network Access」→「ネットワークアクセス (IP 制限)」、「Session/OAuth Settings」→「セッション設定/OAuth・OpenID Connect 設定」
- **v2.26.0 (2026-05-20 15:00)** — 🚨 ユーザー要望 Phase 16: describe error 統一 + popup クイックアクション/SOQL/API/Whats New:
  - **🐛 design-docs.js**: 残った 5 箇所の `apiError(\`describe(${obj})\`, ...)` を `apiError(\`オブジェクト '${obj}' の describe 取得に失敗しました\`, ...)` に統一 (英語短縮残存撲滅)
  - **🐛 popup.html Whats New**: 「設計書ジェネレータ 20 種」→「設計書ジェネレータ 22 種類 (業務向け凡例付き)」に最新化
  - **🐛 popup.html クイックアクション**: 全 6 ボタン (Setup を開く / Developer Console / オブジェクトマネージャ / マイプロフィール / 組織情報 / ログアウト) に機能説明 title 追加
  - **🐛 popup.html SOQL タブ**: textarea に placeholder「SOQL クエリを入力してください」追加、Tooling API ラベルに title、実行/CSV ボタンに title
  - **🐛 popup.html API タブ**: apiPath placeholder を ですます調 詳細化、apiBody placeholder を「POST / PATCH の場合は JSON ボディを入力してください」に、送信/limits/versions ボタンに title 追加
  - **🐛 popup.html ID 入力**: pattern="[a-zA-Z0-9]{15,18}" maxlength=18 + title でブラウザネイティブバリデーション追加
  - **🐛 popup.html フッタ**: statusMsg の "Ready" → "準備完了" (英語残存撲滅)
- **v2.25.0 (2026-05-20 14:55)** — 🚨 ユーザー要望 Phase 15: CSS empty-state テキスト + alert / Limits モバイル列ラベル:
  - **🐛 css/panel.css empty-state 6 箇所 (SOQL / Apex / REST / Limits / describe / LoginHistory)**: 「XXX 未実行/未取得」→「XXX はまだ実行/取得されていません」、「上の「取得」ボタンで認証履歴を読込」→「「取得」ボタンをクリックして認証履歴を読み込んでください」に統一
  - **🐛 css/popup.css**: ポップアップの SOQL 結果空状態を同様に ですます調 詳細化
  - **🐛 css/panel.css Limits モバイル列ラベル**: 英語残存「used: / remaining: / max:」を「使用: / 残り: / 上限:」に日本語化
  - **🐛 panel.js Debug ログサンプル alert**: 「DebugLevel/TraceFlag の作成はサンプル実装です。Setup → Debug Logs で手動設定もできます。」を「Setup → Debug Logs から手動で設定することもできます」に微修正
- **v2.24.0 (2026-05-20 14:50)** — 🚨 ユーザー要望 Phase 14: popup setStatus / toast / sf-api userinfo error 文言:
  - **🐛 popup.js setStatus**: 「セッション取得中…」→「セッション情報を取得しています…」、「SOQL 実行中…」→「⏳ SOQL を実行しています…」、「API 呼び出し中…」→「⏳ API を呼び出しています…」、「OK/失敗」→「✓ 成功しました/❌ 失敗しました」、SF タブ未検出・sid Cookie 不在のヘルプ文を ですます調 詳細化
  - **🐛 popup.js toast**: 「ピンを外しました」も絵文字付きに、「ピン留め N 件を残してクリア」→「ピン留め N 件を残し、その他の履歴を削除しました」、「先に SF に接続してください」「SF タブが必要です」→「Salesforce のタブで実行してください」等
  - **🐛 popup.js userinfo エラー文言**: 英語残存「userinfo 失敗 HTTP」→「ユーザ情報の取得に失敗しました (HTTP)」
  - **🐛 sf-api.js getUserInfo フォールバック**: 英語残存「userinfo unavailable: chatter=X, oauth2=Y」→「ユーザ情報を取得できませんでした (chatter HTTP X / oauth2 HTTP Y)」
- **v2.23.0 (2026-05-20 14:45)** — 🚨 ユーザー要望 Phase 13: throw new Error / panelToast 文言総点検:
  - **🐛 design-docs.js**: "unknown design type: ..." → "未対応の設計書タイプです: ..." (英語残存を撲滅)
  - **🐛 picker.js**: "親オブジェクトが必要です" → "項目を取得するには、先に親オブジェクトを指定してください"、"LWC 取得失敗" → "LWC コンポーネントの取得に失敗しました"、"User 取得失敗" → "ユーザ一覧の取得に失敗しました"
  - **🐛 panel.js panelToast 統一**: サイドメニュー折りたたみ・展開を「折りたたみました/展開しました」に、コピー失敗系を「クリップボードへのコピーに失敗しました」に、Mermaid Live Editor 通知を「新しいタブで開きました。コードを貼り付けてください」に、Login History 未取得を「ログイン履歴が未取得です。先に「取得」ボタンをクリックしてください」に、package.xml 未生成を丁寧に
- **v2.22.0 (2026-05-20 14:40)** — 🚨 ユーザー要望 Phase 12: SOQL/Inspector/LoginHistory/Limits/Logs タブ title 業務化:
  - **🐛 SOQL タブ (panel/tool)**: 保存名 placeholder + title, 保存/読込/Tooling/CSV/実行ボタン全てに title 追加 + ですます調 ("Tooling API" → "Tooling API を使用"), soqlText placeholder を「SOQL クエリを入力してください」に
  - **🐛 Inspector タブ**: 現在タブから取得・取得・JSON/CSV エクスポート・レコードを開くボタンに機能説明 title、「空値も表示」→「空値も表示します」、「System 項目を表示」→「システム項目を表示します」+ 機能説明 title
  - **🐛 Login History タブ**: loginLimit/loginStatus/btnFetchLogin/btnLoginCsv に title、「全 Status / Success のみ / Failed のみ」→「全ステータス / 成功のみ / 失敗のみ」
  - **🐛 Limits タブ**: btnLimits/limitsSort/limitsOnlyUsed/btnLimitsCsv に title、「使用率 > 0 のみ」→「使用中のみ表示します」
  - **🐛 Logs (Apex Log) タブ**: btnFetchLogs/btnEnableDebug に title (DebugLevel + TraceFlag の意味を説明)
  - **🐛 popup.js アップデート確認 toast**: "アップデート確認中…" → "アップデートを確認しています…"、エラー文も ですます調 に
- **v2.21.0 (2026-05-20 14:35)** — 🚨 ユーザー要望 Phase 11: 設計書/Apex/REST/Export/Describe タブ placeholder + title 業務化:
  - **🐛 html/panel.html, html/tool.html 設計書タブ**: designObj placeholder を「設計書の種類に応じて入力してください」+ title で objectDef/profileDetail/PermSet 等の使い分け説明、生成/コピー/ダウンロードボタンに機能説明 title、空状態メッセージを「設計書はまだ生成されていません」に
  - **🐛 Apex タブ**: 保存済みドロップダウン/読込/保存/Debug ログチェック/実行ボタンに title 追加、placeholder ですます調 (「名前を付けて保存します...」)、「Debug Log 取得」→「Debug ログを取得」
  - **🐛 REST タブ**: restPath/restBody placeholder を「REST API パスを入力してください」「POST / PATCH の場合は JSON ボディを入力してください (GET / DELETE では不要)」に、送信ボタン title 追加
  - **🐛 Describe タブ**: descObj placeholder ですます調、取得ボタン title 追加
  - **🐛 Export タブ**: exObj/exFieldFilter/exWhere/exOrder/exLimit/exSoql placeholder を ですます調 + 詳細化、Tooling API ラベルに使い所説明 title、全選択/全解除/標準のみ/フィールド読込/SOQL 組立/実行/各ダウンロードボタンに機能説明 title
- **v2.20.0 (2026-05-20 14:30)** — 🚨 ユーザー要望 Phase 10: requireInput / 自動更新通知 / ChangeSet UI:
  - **🐛 design-docs.js requireInput()**: 入力必須エラーを「入力必須: XXX」から「XXX を入力してください」形式に統一。すべての設計書入力欄でエラー文が ですます調 に。requireInput のヒント文も自然化 (例: "基点オブジェクト" → "基点となるオブジェクト"、"プロファイル名 ... '@PermSet_API名'" → "プロファイル名 ... 『@PermSet_API名』形式"、"LWC バンドル DeveloperName" → "LWC コンポーネントの DeveloperName (例: myComponent)")
  - **🐛 background.js 自動更新通知**: chrome.notifications のタイトル/メッセージを ですます調 + 自然化 ("DevToolsNext 自動更新" → "DevToolsNext を自動更新しました")
  - **🐛 html/panel.html ChangeSet**: 6 つのボタン (ロード/切替、候補をロード、全クリア、package.xml 生成、コピー、ダウンロード、SFDX バンドル)、絞込み input の title/placeholder を ですます調 + 機能説明付きに
  - **🐛 html/tool.html ChangeSet**: 同じ 6 ボタンを panel.html と統一
- **v2.19.0 (2026-05-20 14:25)** — 🚨 ユーザー要望 Phase 9: html/*.html title・placeholder 総点検 + apiError ですます調統一:
  - **🐛 html/popup.html**: 9 箇所の title/placeholder/aria-label を ですます調 に統一 (例: "現在のバージョン" → "現在のバージョン番号です"、"再取得" → "セッション情報を再取得します"、"アップデート確認・自動再ロード" → "アップデートを確認し、新しいバージョンがあれば自動で再読み込みします")
  - **🐛 html/panel.html**: 10 箇所の title/placeholder を ですます調 に (例: "セッションを再取得" → "現在のタブの Salesforce セッションを再取得します"、"全項目を JSON でクリップボードへ" → "全項目を JSON 形式でクリップボードにコピーします")
  - **🐛 html/tool.html**: 再接続ボタンの title を panel.html と統一
  - **🐛 design-docs.js**: 残り 9 箇所の apiError 文字列 ("ApexClass 取得" → "Apex クラス一覧の取得に失敗しました"、"Flow 取得 (Active)" → "フロー (アクティブ) の取得に失敗しました" 等) を ですます調 に統一
- **v2.18.0 (2026-05-20 14:20)** — 🚨 ユーザー要望 Phase 8: ApexDetail / popup 履歴 / Limits / mini-panel ラベル:
  - **🐛 buildApexDetail**: 凡例 9 項目追加 (Apex とは / メソッド / プロパティ / 可視性 (public/private/global/protected) / static / アノテーション (@AuraEnabled 等) / SymbolTable)、可視性を業務向け説明付きに、Status を ○有効/−無効/✗削除済 に、列名を「メソッド名」「アノテーション」「参照クラス/型」等に
  - **🐛 popup.js SOQL 履歴**: 空状態を「履歴はまだありません。SOQL を実行するとここに最大 10 件保存します」に、tooltip を ですます調 に
  - **🐛 panel.js Limits ダッシュボード**: 「使用率 70% を超える項目はありません」「項目 (Limit 名) / 残り / 使用率バー」等列名業務化、未取得 toast を ですます調 に
  - **🐛 content.js (mini-panel)**: launcher / hdr-title / 各ボタン title を ですます調 に統一 ("DevToolsNext mini-panel を開く" → "DevToolsNext のミニパネルを開く (Salesforce 上で簡易 SOQL を実行できます)" 等)
- **v2.17.0 (2026-05-20 14:15)** — 🚨 ユーザー要望 Phase 7: ObjectPermMatrix / FlsReport / AppList / FlowDetail 業務化:
  - **🐛 buildObjectPermMatrix**: 凡例を 10 項目に拡充 (CRUDVM 6 文字の意味、ViewAll/ModifyAll のリスク説明、CRUD-- 等の代表パターン)、note に Excel B2 ウィンドウ枠固定の Tips
  - **🐛 buildFlsReport**: 凡例セクション 7 項目 (FLS とは / 👤🔑 列マーカー / 必須項目の挙動 / 除外条件)、note を業務向け文言に
  - **🐛 buildAppList**: UiType/NavType/AppMenuItem.Type を日本語マップ (Aloha=Classic UI、Console=コンソール、TabSet=Salesforce アプリ等)、凡例 5 項目、IsVisible を「○ 表示/− 非表示」に
  - **🐛 buildFlowDetail**: 凡例セクション 10 項目 (各要素種別の業務向け説明)、ProcessType/Status を日本語化、全 13 セクションの列名を日本語に (`name`→`API 名`、`dataType`→`データ型`、`object`→`対象オブジェクト`、`isInput`→`入力` 等)
- **v2.16.0 (2026-05-20 14:10)** — 🚨 ユーザー要望 Phase 6: プロファイル/権限セット/カスタム設定/FLS マトリクス + README 解説:
  - **🐛 buildProfileList**: ユーザ種別 (UserType) 8 種類を日本語+原文併記、凡例セクション 4 項目追加 (プロファイルとは / ライセンス / ユーザ種別 / 設計指針)。Spring '26 のプロファイル機能廃止予告も note に
  - **🐛 buildPermSetList**: 列名業務化 (「ラベル (画面表示名)」「ネームスペース」「種別」)、IsCustom を「カスタム/標準/パッケージ」に、凡例 5 項目追加
  - **🐛 buildCustomSettingList**: CustomSettingsType を「List 型 (組織共通の定数表)」「Hierarchy 型 (組織/プロファイル/ユーザ毎に上書き可)」と日本語化、凡例 4 項目 (CustomMetadata との違いも明記)
  - **🐛 buildFieldPermMatrix**: 凡例を業務担当者向けに大幅拡充 (記号/列マーカー/必須列/除外条件)。「FLS とは何か」を最初に明示
  - **📚 README に「設計書 22 種類 業務向け詳細解説」テーブル追加**: 各設計書が何を出力し業務でどう使うかを 1-2 行で
- **v2.15.0 (2026-05-20 14:05)** — 🚨 ユーザー要望 Phase 5: 入力規則/レコードタイプ/LWC + mini-panel 日本語:
  - **🐛 buildValidationRuleList**: 凡例セクション追加 (4 項目)、列名業務化 (「ルール名 (API)」「説明 (開発者向け)」)、有効/無効を○/−で明示、エラー表示位置を「項目: XXX」「ページ上部 (全体)」に
  - **🐛 buildRecordTypeList**: 凡例セクション (レコードタイプとは / 有効 / 営業プロセス連携 / 割当て の 4 項目)、BusinessProcessId を「あり/なし」表示、列名業務化
  - **🐛 buildLwcDetail**: 凡例セクション追加、形式 (html/js/xml/css/svg/json) に役割注釈、IsExposed を「○ 公開/− 非公開」に
  - **🐛 content.js (mini-panel)**: 8 箇所の error/success メッセージを ですます調 に統一
- **v2.14.0 (2026-05-20 13:50)** — 🚨 ユーザー要望 Phase 4: Flow / Apex 設計書業務用語化:
  - **🐛 buildFlowList**: ProcessType を業務用語の日本語+原文併記マップ追加 (12 種類):
    - `AutoLaunchedFlow` → `自動起動フロー (Autolaunched)`、`Flow` → `画面フロー (Screen)`、`Workflow` → `ワークフロー (Workflow Rule)`、`InvocableProcess` → `プロセスビルダー (Invocable Process)` 等
    - 列名業務用語化: `API名` → `API 名`、`Version` → `バージョン`、`Status` → `状態`、`有効` → `アクティブ`
    - note に「Process Builder は段階的廃止 (Salesforce 公式アナウンス)」追記
    - title: `Flow 一覧 (Active)` → `フロー一覧 (アクティブのみ)`
  - **🐛 buildApexClassList**:
    - `Status` 値を日本語化: Active → 有効、Inactive → 無効、Deleted → 削除済
    - 列名: `APIVer` → `API バージョン`、`Namespace` → `ネームスペース`、`行数(コメント除)` → `コード行数 (コメント除く)`
    - ネームスペース空欄 → `(なし)` 明示
  - **🐛 buildApexTriggerList**:
    - 凡例セクション (section 0) を追加: BI/AI/BU/AU/BD/AD/AUD の業務向け説明
    - title: `Apex トリガ一覧` のまま、セクション構造を `0. 凡例` + `1. 一覧` に分離
- **v2.13.0 (2026-05-20 13:45)** — 🚨 ユーザー要望 Phase 3: ER 図リレーション種別区別 + picker 日本語:
  - **🐛 ER 図 (Mermaid) で Master-Detail と Lookup の線種を区別**:
    - Lookup (任意参照): `親 ||--o{ 子` (従来通り)
    - Master-Detail (必須・カスケード削除): `親 ||--|{ 子` (新規)
    - ラベルに `(MD)` / `(Lookup)` 種別併記
    - 判定: 親方向は `!nillable && (cascadeDelete || writeRequiresMasterRead)`、子方向は `cascadeDelete`
    - note に線種凡例追記
  - **🐛 picker.js のエラーメッセージ + placeholder を業務用語化**:
    - `sobjects 取得失敗` → `オブジェクト一覧の取得に失敗しました`
    - `describe 失敗` → `項目定義 (describe) の取得に失敗しました`
    - `Profile 取得失敗` → `プロファイル一覧の取得に失敗しました`
    - `PermissionSet 取得失敗` → `権限セットの取得に失敗しました`
    - `ApexClass 取得失敗` → `Apex クラスの取得に失敗しました`
    - `Flow 取得失敗` → `フロー一覧の取得に失敗しました`
    - placeholder: `オブジェクト API 名で検索` → `オブジェクト API 名 / 表示名で検索 (例: Account / 取引先 / Custom__c)`
    - placeholder: `フィールド API 名 / ラベルで検索` → `項目 API 名 / 表示名で検索`
- **v2.12.0 (2026-05-20 13:40)** — 🚨 ユーザー要望対応 Phase 2: アクセスコントロール改善 + popup 日本語見直し:
  - **🐛 設計書「アクセスコントロール定義書」を業務向けに大幅改善**:
    - **0. 凡例セクション追加**: OWD / Private (非公開) / Public Read/Write / Controlled By Parent / Sharing Rules / PermSet 上乗せ の業務担当者向け説明
    - **OWD 値を日本語+原文併記**: `Private` → `Private (非公開)`、`ReadWrite` → `Public Read/Write (全員参照/編集可)` 等 6 種類のマッピング
    - **ロール階層列名を業務用語化**: `Opp(Account所有者)` → `商談アクセス (取引先所有者)`、`Case` → `ケースアクセス`、`Contact` → `取引先責任者アクセス`
    - **値の日本語化**: `None` → `アクセス権なし`、`Edit` → `参照・編集可` 等
    - **カスタマイズ可否**: `○` / `(空欄)` → `可` / `不可` で明示
  - **🐛 popup.js の日本語表現見直し (7 箇所)**:
    - `設定は未実装です` → `⚠ 設定画面はまだ実装されていません`
    - `Salesforce タブが必要です` → `Salesforce のタブを開いてから操作してください`
    - `先に SF タブに接続してください` → `先に Salesforce タブへ接続してください`
    - `${u.Name} としてログインします` → `${u.Name} さんとしてログインします`
    - `📭 結果がありません` → `📭 エクスポート対象がありません (先に SOQL を実行してください)`
    - `18桁ID` → `18 桁 ID` (半角スペース正規化)
- **v2.11.0 (2026-05-20 13:35)** — 🚨 ユーザー要望対応 (Phase 1): 設計書 ObjectDef 強化 + 日本語見直し:
  - **🐛 設計書 ObjectDef のフィールド表に列追加 (業務テンプレ準拠)**:
    - 既存: No / API名 / ラベル / 型 / 桁・精度 / 必須 / 一意 / 外部ID / 計算式 / 参照先 / 選択リスト値 / デフォルト / 説明 (13 列)
    - 追加: **作成可 / 更新可 / 暗号化 / ヘルプテキスト** + 「説明」を `description` (開発者向け) と「ヘルプテキスト」 `inlineHelpText` (利用者向け) に **正しく分離** → 計 **17 列**
    - 「ラベル」→「表示名」「型」→「データ型」「デフォルト」→「既定値」「計算式」→「計算項目」 など業務用語に修正
  - **🐛 日本語ライティング見直し (6 箇所、ですます調 統一)**:
    - `📋 Apex 結果コピー (1234 文字)` → `📋 Apex の実行結果をコピーしました (1,234 文字)` (3 桁区切り toLocaleString も)
    - `📋 REST 結果コピー` → `📋 REST のレスポンスをコピーしました`
    - `⚠ レコード未取得です` → `⚠ レコードがまだ取得されていません`
    - `📋 Object:Id の JSON をコピー` → `📋 ... の JSON をコピーしました`
    - `📋 貼付: ...` → `📋 ID を貼付けました: ...`
    - `⌨ inspector ビュー` → `⌨ inspector ビューに切り替えました`
  - **📝 設計書/UI 改善は今後も継続予定** ([[feedback_japanese_design_quality]] memory 参照)
- **v2.10.0 (2026-05-20 13:30)** — mini-panel に 📋 CSV コピー + 列ソート:
  - **✨ mini-panel ヘッダに「📋 CSV」ボタン**: 結果を CSV としてクリップボードコピー。ネスト平坦化 + ISO datetime 整形 (`recordsToCsv` 同パターン) を inline 実装で適用
  - **✨ mini-panel 結果テーブルの列ヘッダ click でソート**: asc → desc → unsort 3 段階トグル、数値判定 (`/^-?\\d+(\\.\\d+)?$/`) で数値/文字列ソート分岐、`localeCompare("ja")` で日本語対応。**panel/tool と同等のソート UX を mini-panel にも**
  - `lastRecs` 配列で結果保持 → unsort 時は再描画で原順序復元
- **v2.9.0 (2026-05-20 13:25)** — mini-panel 結果テーブルの ID セルクリックで深掘り検索:
  - **✨ mini-panel の結果テーブル ID セル (15/18桁) を click で `SELECT FIELDS(STANDARD) FROM <Object> WHERE Id = '<id>'` 自動実行**: panel/tool の cell-id → Inspector ジャンプと同じ UX を mini-panel にも適用
  - 元クエリの `FROM` から Object 名を継承、なければ `Account` フォールバック
  - 結果テーブルが連鎖して掘り下げ可能 (リレーション辿り)
  - meta に `🔍 Object:Id → 全標準フィールド検索` で操作を可視化
- **v2.8.0 (2026-05-20 13:20)** — mini-panel に「📋 ID 挿入」ボタン:
  - **✨ 現在ページの URL から sObject + RecordId を自動抽出して SOQL に挿入**: `extractRecordContext()` で `/lightning/r/Object/Id/view` / `?address=%2F<Id>` / pathname の 3 段階フォールバック (Inspector「現在タブから取得」と同パターン)
  - **「📋 ID 挿入」クリック → `SELECT Id, Name FROM <Object> WHERE Id = '<id>' LIMIT 1` を textarea にセット**: SF 画面内で「このレコードのフィールド全部見たい」が 1 クリックで実現
  - **抽出失敗時**: `⚠ 現ページからレコード ID を抽出できません` 警告表示
  - **成功時**: `📋 Account:001xx0000... を挿入` ok 表示
- **v2.7.0 (2026-05-20 13:15)** — ✨ ユーザー要望: Salesforce ページ上 mini-panel (別タブ無し作業):
  - **✨ SF ページ右下に floating launcher button (🛠) を inject**: `content.js` 拡張、shadow DOM で SF Lightning の CSS と分離。**SF タブを離れずに SOQL 実行可能**
  - **✨ mini-panel オーバーレイ (SOQL Phase 1)**: launcher クリックで 480px 幅パネル展開 / SOQL textarea + ▶ 実行 / Ctrl+Enter ショートカット / 結果テーブル表示 / IME ガード / ネスト平坦化対応
  - **✨ ヘッダ ↗ ボタンでフルパネル新タブ起動**: 詳細機能 (Inspector / 設計書 / Limits 等) はフルパネルで継続
  - **🔒 セキュリティ**: shadow DOM で SF page CSS と完全分離、`chrome.runtime.sendMessage` 経由で background.js の `sfdt:getSession` + `sfdt:soql` を呼出 (content_script 側で sid 直接アクセス不要、CSP 順守)
  - **多重 inject ガード**: `document.getElementById("__sfdt_root")` で SPA navigation で content_script が再評価されても launcher は 1 つだけ
  - **Phase 2 予定**: Inspector / Picker / Apex 等を mini-panel に追加
- **v2.6.0 (2026-05-20 13:10)** — ✨ ユーザー要望: オブジェクト入力補完 (datalist):
  - **✨ 5 オブジェクト入力欄に共通 datalist 補完**: `#exObj` / `#apiObj` / `#descObj` / `#designObj` / `#inspectRef` (※ inspectRef は除外、ID 入力欄のため) に `list="dl-sobjects"` 追加。**入力中に sObject 名と日本語ラベルの候補ドロップダウンが出る** (例: 「Op」入力 → `Opportunity — 商談` 補完)
  - **✨ `refreshSObjectDatalist()`**: reconnect 成功後に `describe global` を呼んで queryable sObject 一覧を取得 → `_datalistObjsCached` メモ化 → `<option value="API 名" label="API 名 — ラベル">` で datalist を更新。**Picker と独立のキャッシュ**で軽量
  - **動作**: ブラウザネイティブの datalist 機能なので **キーボード ↑↓ 選択 / マウスクリック選択** すべて OS の標準 UX、特別な実装不要。type-ahead (前方一致) + 部分マッチも自動
- **v2.5.0 (2026-05-20 13:05)** — ✨ ユーザー要望: サイドメニュー折りたたみ機能:
  - **✨ サイドナビ ◀ トグルで 38px に折りたたみ / ▶ で 180px に展開**: `chrome.storage.local.sideCollapsed` で状態保存、リロード後も維持。**panel.html / tool.html の両方に適用**
  - **折りたたみ時の表現**: nav-btn の文字を非表示 (font-size:0) し ::first-letter で絵文字のみ表示、nav-sep は `—` プレースホルダで区切り維持。**画面横幅を最大化したいときに有効**
  - **トグルボタン**: 右上にコンパクト配置、hover 時 accent 色、回転アニメ (180deg) で展開/折りたたみ状態を示す
  - **🔜 次サイクル予定**: Salesforce ページ上での mini-panel オーバーレイ (content.js 拡張) — 別タブを開かず SF 画面内で SOQL/Inspector が使えるように
- **v2.4.0 (2026-05-20 13:00)** — empty-hint vs 該当データなし の競合検証:
  - **🧪 SOQL 結果 0 件時の表示挙動確認**: `recordsTable()` (panel.js:2148) が `📭 該当データなし` div を返す → soqlResult.innerHTML が非空となり `:empty::before` (panel.css) は発火せず → recordsTable のメッセージのみ表示。**競合なし、現状で正しい挙動**
- **v2.3.0 (2026-05-20 12:55)** — copy 後の focus 戻しなしを明文化 + 検証 3 件:
  - **🧪 Apex/REST copy 後の focus 戻し**: 意図的に **戻さない** (panel.js:379-398)。マウスクリックで copy したユーザーが結果領域を引き続き読み続けるのが自然な操作フロー。focus 強制移動はむしろ邪魔となるため現状維持
  - **🧪 Inspector reference click 履歴重複防止**: v1.52.0 で `sameAsLast` + `movingToCurrent` 判定実装済
  - **🧪 popup 18桁 ID clipboard**: `navigator.clipboard.writeText(id18)` + toast 既実装 (popup.js:540)
- **v2.2.0 (2026-05-20 12:50)** — Picker filter / design apiError context 検証:
  - **🧪 Picker 検索フィルタの特殊文字対応**: `String.includes` (regex 非使用) で `'` / `\\` / `()` 等の特殊文字エスケープ不要を確認 (picker.js:309 `it.hay.includes(q)`)。**例: "Account's Owner" / "(Custom)" / "Field\\Path" すべて正常マッチ**
  - **🧪 design-docs.js apiError の context 文字列確認**:
    - obj 指定型 (describe/objectDef/ER 図 等) は `describe(${obj})` でオブジェクト名込み ✅
    - org 全体型 (Profile/PermissionSet/ApexClass/Flow 一覧) は `"Profile 取得"` 等のラベルのみ (正しい設計) ✅
- **v2.1.0 (2026-05-20 12:45)** — README に popup SOQL 履歴仕様明記 + 動作検証 3 件:
  - **📖 README に「popup SOQL 履歴の仕様」セクション追加**: `HISTORY_MAX = 10` (popup.js:317) は非ピン留めのみ適用、ピン留めは件数制限なし。同一クエリ重複防止 + ピン状態維持の挙動も明記
  - **🧪 動作検証 3 件 (修正不要)**:
    - Apex Ctrl+Enter 連打耐性: `apexRunId` レースガード (panel.js:2381) で古い結果を捨てる実装済
    - SOQL 履歴 10 件超: 非ピン free のみ slice(0, 10) → ピン留めは無制限保持
    - chrome.notifications click ハンドラ: 未実装 (新機能扱いのため凍結ルール厳守、現状 silent)
- **v2.0.0 (2026-05-20 12:40)** — 🎊 メジャーバージョン化 (v1.0.0 から 100 minor リリース達成):
  - **🎉 v2.0.0 セマンティック節目**: 自律改善ループ 109 サイクルの集大成。新機能凍結 (`feedback_no_new_features` 厳守) のまま、起動時 TDZ 構造的解決 / 全 CSV 整形統一 / 16 download toast 完備 / IME 3 環境保護 / アクセシビリティ AAA を達成
  - **📖 README 先頭ヘッダーを v2.0.0 milestone 表記に更新**: 旧 v1.91.0 (100 サイクル) も注記として残し継続性可視化
  - **🧪 v1.99.0 の TDZ 修正動作確認**: chrome://extensions → reload → panel/tool.html 起動エラー出ないことを確認 (実機検証は POの環境で実施)
- **v1.99.0 (2026-05-20 12:35)** — 🛡 信頼回復: queueMicrotask で TDZ 恒久解決 + README トラブルシューティング:
  - **🐛 panel.js / popup.js の `init()` 呼出を `queueMicrotask()` でラップ**: v1.98.0 では API_OP_INPUTS のみ移動修正 → さらに調査した結果、**RECENT_VIEWS_KEY (line 257) も同じ TDZ パターンに該当**していた (init → bindNav → renderRecentNav → 参照)。queueMicrotask で init をモジュール body 評価完了後に遅延させ、**今後 const を追加しても TDZ になり得ない構造に**
  - **📖 README に「🚨 起動時エラー対処」セクション**: TDZ / Cookie / sid / 404/403 などのエラー文と原因・対処マッピング + TDZ 再発防止設計の解説
- **v1.98.0 (2026-05-20 12:30)** — 🚨 起動時 TDZ バグ修正 (API_OP_INPUTS):
  - **🐛 `init() → bindEvents() → updateApiInputVisibility()` が起動時に `const API_OP_INPUTS` を参照していたが、`init()` 呼出 (line 23) より const 宣言 (line 1171) が後にあったため `Cannot access 'API_OP_INPUTS' before initialization` で初期化失敗していた**
  - **修正**: `API_OP_INPUTS` 定義を init 呼出より上 (line 19 直前) に移動 + コメントで Why を明示。**v1.52.0 で追加されてから本不具合のまま動作していたが、ローカル環境/ユーザー報告により発覚 → 即時修正**
  - **影響範囲**: panel/tool.html の初期描画 (org info / nav 等) が止まる致命的バグ → 全機能復旧
- **v1.97.0 (2026-05-20 12:25)** — Excel セル 32,767 文字上限切詰 + 検証 3 件:
  - **🛡 設計書 Excel セルが 32,767 文字超のときに末尾切詰**: `EXCEL_CELL_LIMIT = 32767` 定数化、超過時 `… (Excel 上限切詰)` マーカー付き truncate。**従来は超過時に Excel が開けない/破損する可能性があった**
  - **🧪 検証 3 件すべて修正不要**:
    - Inspector reference 失敗時の back: `inspectHistory.push` が `fetch` 前に実行されるため、404 でも back で前ページ可能 (panel.js:1422)
    - 設計書 Excel WrapText: header/cell 両方の Style に `WrapText="1"` 設定済 (design-docs.js:1323, 1332)
    - recordsToCsv 空 records: 冒頭 `if (!records || !records.length) return ""` で早期 return (sf-api.js:256)
- **v1.96.0 (2026-05-20 12:20)** — 設計書 Excel + Inspector record エラーの UX 改善:
  - **🐛 設計書 Excel (SpreadsheetML) に formatExcelValue() 追加**: kvRows + rows 両方の値が ネスト object → `Name [Id]` / ISO datetime → `YYYY-MM-DD HH:mm` 整形。**全 6 出力形式 (Markdown/HTML/CSV/TSV/Excel/JSON) で整形が完全統一**
  - **🐛 Inspector record 取得失敗時のエラーメッセージ改善**: 404 → `見つかりません (削除済 / 別組織の Id / 権限不足の可能性)`, 403 → `アクセス権限不足 (オブジェクト/レコードの共有設定を確認)` + サブメッセージ `describe (Object) は成功、レコード本体のみ失敗`。**describe 成功 + record 失敗のハーフ取得状態が明示的に伝わる**
- **v1.95.0 (2026-05-20 12:15)** — 設計書 CSV/TSV にもネスト平坦化 + datetime 整形:
  - **🐛 `design-docs.js csvCell()` に整形ロジック追加**: 設計書 CSV/TSV は複数セクション形式で recordsToCsv と構造が異なるため、csvCell 内に inline で同等ロジック (attributes 持ち object → `Name [Id]` / ISO datetime → `YYYY-MM-DD HH:mm`) を実装。**全 CSV 系出力 (SOQL/Inspector/Login/設計書) で整形ロジックが統一**
  - **🧪 設計書 Excel (SpreadsheetML XML)**: 内部の値整形は別ロジックだが、設計書データは schema metadata 中心で datetime/ネストはほぼ含まれない → 影響なし (修正不要)
- **v1.94.0 (2026-05-20 12:10)** — Inspector CSV を recordsToCsv 経由に統一:
  - **🐛 `exportInspect("csv")` を recordsToCsv 経由にリファクタ**: 従来 fields ループで直接 CSV 生成していたため v1.93.0 のネスト平坦化 + datetime 整形が **未適用** だった → describe.fields の順で `ordered` レコードを作成 → `recordsToCsv([ordered])` で生成。**Inspector CSV にも Excel フレンドリーな整形が波及**
  - **🧪 popup exportCsv は既に recordsToCsv 経由** で v1.93.0 整形が適用済 (修正不要)
- **v1.93.0 (2026-05-20 12:05)** — recordsToCsv ネスト平坦化 + datetime ISO 整形:
  - **🐛 `recordsToCsv()` でネストリレーション (例 `Account.Owner`) を平坦化**: 従来 `"{"attributes":{...},"Name":"Akira"}" ` raw JSON 文字列が CSV セルに入って Excel で表示崩れ → `Akira Kataoka [005xx0000000abc]` 形式 (画面表示と統一、panel.js stringify と同パターン)
  - **🐛 datetime ISO 文字列 `2026-05-20T03:45:00.000+0000` を `2026-05-20 03:45` に整形**: regex `^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}` 判定 → Excel で日時として認識可能 (Login History v1.91 と同パターンを全 CSV download に波及)
  - **影響範囲**: SOQL CSV / Inspector CSV / Login History CSV / 設計書 CSV/TSV / Picker recent (内部) **すべての CSV 生成箇所**
- **v1.92.0 (2026-05-20 12:00)** — Limits CSV 使用率列を数値化 + to18CharId 検証:
  - **🐛 `exportLimitsCsv()` 使用率列を `"85%"` → `85` (数値) に変更**: 列名も `使用率` → `使用率(%)` に明示。**Excel/Sheets で数値ソート/条件付き書式が機能** (従来は文字列 `"85%"` で数値扱いされなかった)
  - **🧪 `to18CharId` の Salesforce 公式アルゴリズム準拠を確認**: 15 桁を 5 文字 × 3 グループに分割、各グループ大文字 bit map で 32 文字テーブル参照 → 末尾 3 桁生成 (sf-api.js:217)。修正不要
- **v1.91.0 (2026-05-20 11:55)** — 🎊 累計 100 サイクル達成 - Login CSV 日時整形 + README 記念ヘッダー:
  - **🐛 `exportLoginCsv()` の LoginTime を `YYYY-MM-DD HH:mm` 整形**: 従来 `2026-05-20T03:45:00.000+0000` ISO 形式のまま CSV 出力 → Excel で日時として認識されず文字列扱い。整形後は Excel で日時列として並び替え/フィルタ可能 (Inspector v1.36.0 と同パターン)
  - **📖 README 先頭に「100 サイクル達成」記念ヘッダー追加**: 自律改善ループの節目を可視化
- **v1.90.0 (2026-05-20 11:50)** — 🎉 累計90リリース節目 - Login History CSV toast + 全16 download 一覧表:
  - **✨ `exportLoginCsv()` 完了 toast**: `📥 Login History CSV (N 件 / <size>)` 形式 (件数 + サイズ)
  - **🛡 `exportLoginCsv()` 未取得時警告**: `📭 Login History 未取得 (先に「取得」をクリック)`
  - **📖 README に「全 Download / Copy 一覧」テーブル追加 (v1.90.0 時点)**: 16 種類の操作 × 関数 × 形式 × toast 文言 × 未取得警告 × 実装バージョンを一覧化。**実装の完全性が一目で確認可能**
- **v1.89.0 (2026-05-20 11:45)** — Limits / Inspector export にも統一 toast:
  - **✨ `exportLimitsCsv()` 完了 toast**: `📥 Limits CSV ダウンロード (35 項目 / 3.4 KB)` 形式
  - **🛡 `exportLimitsCsv()` 未取得時警告**: `📭 Limits 未取得 (先に「取得」をクリック)`
  - **✨ `exportInspect()` 完了 toast**: `📥 Account:001xx を JSON ダウンロード (12.5 KB)` 形式 (JSON / CSV 両方対応)
  - **🛡 `exportInspect()` 未取得時警告**: `📭 まだレコードが未取得です`
  - **全 7 種類の download (SOQL CSV / 設計書 / package.xml / SFDX bundle / Inspector JSON+CSV / Limits CSV / popup CSV) に toast + 未取得警告完備**
- **v1.88.0 (2026-05-20 11:40)** — ChangeSet package.xml / SFDX バンドル download にも toast:
  - **✨ `csDownloadXml()` 完了 toast**: `📥 package.xml ダウンロード (4.2 KB)` 形式
  - **🛡 `csDownloadXml()` 未生成時警告**: `📭 package.xml が未生成です (先に「package.xml 生成」をクリック)` (従来 silent return)
  - **✨ `csDownloadSfdxBundle()` 完了 toast**: `📥 SFDX バンドル (.md) ダウンロード (15.3 KB)` 形式
  - **🧪 設計書 safeName**: `replace(/[\\\\/?*[\\]:"<>|]/g, "_").substring(0, 80)` で 80 文字に既に truncate 済 (panel.js:1856) → 修正不要
- **v1.87.0 (2026-05-20 11:35)** — 設計書 download にもサイズ + 形式 + 未生成警告:
  - **✨ `downloadDesignSource()` の完了 toast 追加**: `📥 設計書ダウンロード: MD 312.4 KB` 形式で形式 + サイズ表示 (B/KB/MB 自動切替)。**従来 silent download だった UX が「何形式で何 KB 保存されたか」即視認可能**
  - **🛡 `downloadDesignSource()` 未生成時の警告 toast**: `lastDesign === null` 時 `📭 まだ設計書が未生成です` (kind:warn) → 従来 silent return で UX 不明瞭だった問題を解消
  - **🧪 Apex copy / REST copy / CSV download 等は v1.45.0 (panelToast kind 全箇所適用) で既に成功 toast 出力済**
- **v1.86.0 (2026-05-20 11:30)** — 設計書 copy サイズ表示 + README Trim 強化:
  - **✨ `copyDesignSource()` の toast にサイズ表示**: `📋 設計書ソースをコピー (312.4 KB)` 形式で B/KB/MB 自動切替 (Apex 結果 pill と同パターン)
  - **🛡 `copyDesignSource()` 未生成時の警告 toast 追加**: `lastDesign === null` の場合 `📭 まだ設計書が未生成です` (kind:warn) を表示 (従来は silent return)
  - **🐛 README VERSION 整合性チェックスクリプトに改行 trim 強化**:
    - PowerShell: `Get-Content -Raw + .Trim()` で末尾改行を確実に除去
    - Bash: `tr -d '[:space:]'` でホワイトスペース全削除 → CRLF/BOM 両対応
  - **🧪 background.js readDiskVersion() は `.trim()` 既に適用済 (line 23)** → 修正不要
- **v1.85.0 (2026-05-20 11:25)** — Picker 検索 maxlength + VERSION 整合性チェック手順:
  - **✨ Picker 検索 input に `maxlength="200"`**: 異常長クエリで render() の filter() が遅くなる潜在問題を予防 (200 文字は実用上十分)
  - **📖 README に「VERSION 整合性チェック手順」追加**: PowerShell + Bash の両方で VERSION.txt / manifest.json / README "更新履歴" 先頭行の 3 ファイル version 一致を確認する手順 + `✅ 整合 OK` / `❌ 不一致` 判定。**リリース漏れ予防**
  - **🧪 設計書プレビュー empty-hint**: `preview.innerHTML = ...` で毎回全消去されるため empty-hint は自然に消える (修正不要)
- **v1.84.0 (2026-05-20 11:20)** — README に Picker close 経路 5 パターン表追加:
  - **📖 Picker close 経路一覧テーブル**: 行クリック / Enter / Esc / ✕ / 背景クリックの 5 経路、各経路の close 値・伝播ガード・後処理 (scrollMemory 保存・focus 戻し・resolve) を整理。**v1.74.0/1.82.0/1.83.0 で追加された防御コードの根拠が一覧で参照可能**
  - **🧪 Picker 矢印キー / 行クリック / 背景クリック の伝播**: 現状の実装で問題なし (Arrow は preventDefault のみで OK、行クリックは overlay click と `e.target === overlay` 判定で区別) → 修正不要
- **v1.83.0 (2026-05-20 11:15)** — Picker Enter にも伝播ガード追加:
  - **🐛 Picker `Enter` キーで `stopPropagation()` 追加**: Esc と同じ防御パターン。背景 view の form submit やグローバル keydown (Ctrl+Alt+I 等) に Enter が流出しない。**選択確定後の意図しないグローバル KBSC 発火を予防**
- **v1.82.0 (2026-05-20 11:10)** — Picker Esc 伝播ガード + Tab Shift キー除外:
  - **🐛 Picker Esc に `preventDefault()` + `stopPropagation()`**: 背景の view やグローバル keydown (Ctrl+Alt+I 等) に Esc が流出しないようガード。**Picker close 後に意図しないグローバル KBSC が発火しない**
  - **🐛 enableTabToSpaces に `shiftKey` 除外追加**: 従来 `altKey/ctrlKey/metaKey` のみ除外 → Shift+Tab を奪っていた → **アクセシビリティ標準の Shift+Tab 逆方向 focus 移動が正しく動作**。コメントに「修飾キー時はブラウザ標準挙動に委譲」を明記
- **v1.81.0 (2026-05-20 11:05)** — README に macOS キーボード対応 + Picker z-index 検証:
  - **📖 README に macOS キーボード対応セクション追加**: SOQL/Apex `Cmd+Enter` (⌘ Return)、ビュー切替 `Ctrl+Alt+I/Q/A/L/R/D` (Mac でも Ctrl)、IME 確定 `Enter` 2 回パターンを表形式で整理。実装根拠ファイル位置も明示
  - **🧪 Mac Cmd+Enter は既対応**: panel/popup の keydown 全てで `e.ctrlKey || e.metaKey` 判定 (panel.js:329/371, popup.js:123) → 修正不要
  - **🧪 Picker overlay z:99999 が tool.html ヘッダ (z 未設定) より確実に最前面**: panel.css は `.hdr` に z-index 設定なし、popup.css は `.hdr { z-index: 5 }` → 修正不要
- **v1.80.0 (2026-05-20 11:00)** — 🎉 累計80リリース節目 - .code に user-select: text 明示:
  - **✨ `.code` (panel + popup) に `user-select: text` 明示**: 親要素で `user-select: none` が継承されても pre/code 内のテキストは選択可能。**Ctrl+A で要素内全選択 + コピーが確実に動作**
  - **🎉 累計 80 リリース達成**: IME 確定保護 (Tab + Enter) 5 箇所 / Picker キーボード 7 操作 / 4 色 Toast + pulse / grid sort / cell-id+nested / Lightning Setup URL 抽出 / env バッジ など、UX 完全度が高いレベルに到達
- **v1.79.0 (2026-05-20 10:55)** — popup / Picker にも IME 確定保護波及:
  - **🐛 popup `#soqlText` Ctrl+Enter (doSoql) / `#loginAsSearch` Enter (searchUsersForLogin) に IME 確定保護**: panel と同じ `e.isComposing || keyCode === 229` ガード追加
  - **🐛 picker.js 検索 input の keydown 全体に IME 確定保護**: 「あい」変換中の Enter / ↑↓ で Picker のナビゲーションが意図せず動作する問題を解消。IME 候補選択キー (Space/Enter/↑↓) と Picker キーボード操作が競合しなくなる
  - **panel + popup + picker の 3 環境で IME 動作を完全統一**
- **v1.78.0 (2026-05-20 10:50)** — SOQL/Apex/Inspector Enter キーに IME 確定保護:
  - **🐛 全 keydown ハンドラに `e.isComposing || e.keyCode === 229` ガード追加 (4 箇所)**:
    - `#soqlText` Ctrl+Enter → doSoql
    - `#apexCode` Ctrl+Enter → doRunApex
    - `#inspectRef` Enter → doInspect
    - `#exObj` Enter → exLoadFields
  - **日本語/中国語/韓国語 IME 変換中の Enter (確定キー) が誤って実行/取得をトリガしていた問題を解消**。「営業時間」入力中の Enter は確定、二回目の Enter で実行 (正しい挙動)
- **v1.77.0 (2026-05-20 10:45)** — IME 入力中の Tab キー無効化 + verBadge title 拡充:
  - **🐛 enableTabToSpaces() に IME 確定キー保護**: `e.isComposing || e.keyCode === 229` 時は preventDefault を呼ばずブラウザに委譲。**日本語/中国語/韓国語の IME 変換中 Tab で「次の候補選択」が動作するように** (従来 spaces 変換が割り込んで IME 機能を奪っていた)
  - **✨ verBadge title 拡充**: `現在のバージョン v1.77.0 (VERSION.txt 30秒ポーリングで自動更新)` で詳細な仕組みを案内
- **v1.76.0 (2026-05-20 10:40)** — Picker ✕ クリア時に selectedIdx + scrollTop もリセット:
  - **🐛 Picker 検索 ✕ ボタンクリック時に `selectedIdx = 0` + `$list.scrollTop = 0`**: 従来は input.value="" + input.focus() のみ → ハイライト位置とリスト scroll が前検索結果のままで違和感。**reload (⟳) と同等の完全リセット動作に統一**
  - **🧪 picker-clear aria-label, version badge 同期 (chrome.runtime.getManifest), Tab→spaces (enableTabToSpaces) はすべて既存実装で OK** (修正不要)
- **v1.75.0 (2026-05-20 10:35)** — README に Picker キーボード操作 & focus 戻りテスト手順追加:
  - **📖 「Picker キーボード操作 & focus 戻りテスト手順」セクション追加**: Tab → Enter で Picker 起動 → ↑↓/Home/End/PageUp/PageDown/Enter/Esc 全キーボード操作確認 → close 後の `document.activeElement` 復帰確認 (DevTools Console での確認方法込み)
  - **🧪 Picker reload で focusReturnTarget 維持**: reload は overlay 内 items 再描画のみで overlay 自体は不変 → focusReturnTarget も維持 (修正不要)
  - **🧪 Org 切替時 inspectRef/soqlText input 値持続**: HTML 直書き要素で innerHTML 全置換しないため Org 切替後も同一 DOM 要素・値継続 (修正不要)
  - **🧪 .panel-toast 画面外残り**: `switchToView()` 冒頭で `document.querySelectorAll(".panel-toast").forEach(t => t.remove())` 実装済 (v1.48.0 - 修正不要)
- **v1.74.0 (2026-05-20 10:30)** — Picker focusReturnTarget DOM 接続チェック追加:
  - **🐛 Picker close 時 focusReturnTarget が detached element だった場合の防御**: `document.body.contains(focusReturnTarget)` でツリー存在を確認、ダメなら focus() を呼ばない。**Org 切替や switchToView で呼び元 input が再生成された場合の "focus into thin air" 問題を予防**
  - **🧪 nav-btn.active:focus-visible outline #fff のコントラスト**: 背景 `var(--bg3)` = `#142447` 上に `#fff` outline → コントラスト比 約 13:1 で WCAG AA (4.5:1) / AAA (7:1) 両基準クリア
- **v1.73.0 (2026-05-20 10:25)** — nav-btn active+focus 同時時の outline 色差別化:
  - **♿ `.nav-btn.active:focus-visible { outline-color: #fff }`**: active 状態 (border-left 3px accent) + focus-visible (outline 3px accent) が同時の時、accent 色で二重に塗りつぶされて識別困難 → focus アウトラインのみ白に切替。**現在のタブ位置とキーボードフォーカス位置を独立して可視化**
- **v1.72.0 (2026-05-20 10:20)** — nav-btn focus-visible 強化 + Picker focus 戻り確認:
  - **♿ `.nav-btn:focus-visible` を 3px アウトライン + offset -1px + 背景 `#1a2d56`**: 通常 button focus-visible (2px + offset 1px) より太く、active タブの border-left との視覚干渉を回避。**キーボード Tab 移動時にナビボタンの選択位置が明確**
  - **🧪 Picker close 後の focusReturnTarget**: `picker.js` 共通モジュールで両環境 (panel/tool.html) で同じ動作 → keyboard ユーザーが Picker 閉じても呼び元 input/button に戻れる (修正不要)
  - **🧪 KBSC 発火範囲**: F12 devtools panel (DevTools 内 iframe) でも `panel.js` 読込済 → グローバル `keydown` リスナーが発火 (修正不要)
- **v1.71.0 (2026-05-20 10:15)** — z-index 階層 panel.css 先頭ドキュメント化 + KBSC tool.html 動作確認:
  - **📖 panel.css の先頭に z-index 階層コメントブロック追加**: table th (1) → design h3 (2) → design h2 (3) → Picker/Toast (99999) の昇順スタッキングを明示。**将来の sticky 要素追加時の判断基準として参照可能**
  - **🧪 KBSC が tool.html (フルページ) でも動作確認**: `tool.html:473 / panel.html:408` で同じ `panel.js` を `type="module"` 読込 → `document.addEventListener("keydown")` がフルページとパネルの両環境で発火 (修正不要)
- **v1.70.0 (2026-05-20 10:10)** — 🎉 累計70リリース節目 - z-index 階層整理 + 機能サマリ:
  - **🐛 設計書プレビューの z-index 階層を修正**: 従来 `h2 z:1 / h3 z:1 / table th z:2` → 修正後 `h2 z:3 / h3 z:2 / table th z:1`。**section header (h2) が常に table th より上に表示** → 長い項目定義テーブルでも `## 2. 項目定義` が画面上端に常時可視
  - **📖 README に v1.70.0 時点機能サマリ追加**: 70 リリース成果を 8 カテゴリ (データ操作/開発/監視/メタデータ/設計書/UI/UX/A11y/自動更新) で一覧化、累計実装機能を俯瞰可能
- **v1.69.0 (2026-05-20 10:05)** — popup .result contain + scroll FPS 計測手順:
  - **✨ popup `.result` (SOQL 結果) にも `contain: layout style`**: panel/tool の Apex/REST/design-preview と統一。**popup 460px 幅でも長 SOQL 結果のスクロールが軽量化**
  - **📖 README に「大量結果のスクロール FPS 計測手順」追加 (v1.67.0+ 対応)**: Chrome DevTools の Frame Rendering Stats で 50〜60 fps を維持できているか確認するステップを案内。`contain: none` で比較する手順も併記
  - **🧪 contain: layout style は sticky positioning に干渉しない**: 設計書 h2/th sticky / Limits header sticky / Inspector header sticky いずれも `contain: paint` でないため scroll ancestor 検出が変わらず動作維持
- **v1.68.0 (2026-05-20 10:00)** — design-preview contain + Limits レスポンシブ:
  - **✨ `.design-preview` に `contain: layout style`**: 大設計書 (1000+ 行 ObjectDef) のスクロール時、ブラウザに再描画範囲を制限ヒント。**Apex/REST と同じ CSS Containment パターンで統一**
  - **✨ Limits 結果テーブル `@media (max-width: 600px)` レスポンシブ**: popup や狭幅 panel で grid-template-columns を `1fr` 縦並びに退化、`used: / remaining: / max:` ラベル prefix で識別性確保。**iPad mini / popup 460px でも数値が画面外に出ない**
  - **🧪 tool.html `#orgInfo` 同一 ID 構造で env-badge 正常表示** (panel/tool/popup の 3 HTML で同じ orgInfo に PROD/SBX/DEV バッジが描画される)
- **v1.67.0 (2026-05-20 09:55)** — Inspector フィルタ拡充 + Apex/REST pre 描画最適化:
  - **✨ Inspector フィールド絞込みのプレースホルダ・title 拡充**: `例 'email' / 'CreatedBy' / 'true' で値検索も可` + title で「API 名・ラベル・値の部分一致で絞込み」を案内
  - **✨ `#apexResult` / `#restResult` の `pre.code` に `contain: layout style`**: ブラウザに再描画範囲を制限ヒント → **1MB 超の debug log でもスクロールが軽くなる** (CSS Containment、再フローを抑制)
- **v1.66.0 (2026-05-20 09:50)** — Apex サイズ pill 閾値色分け + ネストセル整形 tooltip:
  - **🐛 Apex 結果サイズ pill が `logBody` のみで判定**: 従来 ヘッダー `"(コンパイル & 実行 OK)\n\n"` を含めた長さで `3 行 / 0.0 KB` 表示 → log 本体だけで判定し、空ログ時は pill 非表示。**実行ログがない時のノイズ削減**
  - **✨ Apex サイズ pill に閾値色分け**: `< 1 KB` → `N B` 既定 / `< 500 KB` → 既定 / `500 KB ~ 1 MB` → warn (橙) / `1 MB 超` → err (赤、tooltip に「1MB 超: スクロール重い可能性」)
  - **✨ cell-nested の title 属性に整形 JSON プレビュー**: 従来「ダブルクリックでコピー (raw JSON)」のみ → 整形 (indent 2) JSON 先頭 280 文字 + 切詰標記。**ブラウザ標準 tooltip で raw データの構造を即座に確認可能** (popup + panel 両方適用)
- **v1.65.0 (2026-05-20 09:45)** — popup ネスト raw コピー + Apex 結果サイズ表示:
  - **🐛 popup SOQL 結果テーブル cell-nested に dblclick raw JSON コピー対応**: `data-raw-value` 属性に元 JSON を格納、dblclick 時に優先取得 (panel と統一)。**popup でも raw データ取得可能**
  - **✨ popup の `.result td.cell-copyable` と `.cell-nested` スタイル追加**: `🔗` prefix + italic + word-break + hover 背景。panel/tool と視覚統一
  - **✨ Apex 結果 meta に「行数 / KB サイズ」を追記**: 例 `Success 1234ms 8,521 行 / 312.4 KB` で **debug log の規模感が一目で分かる** (Inspector Reloaded の Query timing breakdown 風)
- **v1.64.0 (2026-05-20 09:40)** — popup SOQL でもネストリレーション平坦化 (panel と統一):
  - **🐛 popup の `stringify()` も panel と同じネストリレーション平坦化ロジックに統一**: 従来 popup は `JSON.stringify(v)` で raw 表示だった → panel と同じ `Akira Kataoka [005xx...]` 形式に。サブクエリは `[N 件のサブクエリ]` 表示。**popup 460px 幅で SELECT Owner.Name FROM Account 等のリレーション結果が読みやすく**
  - **🧪 Inspector reference 列**: 個別 `renderInspectorFields()` 内で raw v (ID string) を直接使用、`stringify()` 経由しないため平坦化の影響なし (修正不要)
  - **🧪 Limits 0 件時 (使用率 70%超なし)**: `<div class="limit-card"><div class="title">健全</div><div class="val">✓ OK</div>...</div>` で既に明示的表示 (修正不要)
- **v1.63.0 (2026-05-20 09:35)** — KBSC contenteditable 除外 + cell-nested hover/word-break:
  - **🐛 KBSC `Ctrl+Alt+I/Q/A/L/R/D` の発火条件に `isContentEditable` 除外を追加**: 従来 INPUT/TEXTAREA/SELECT のみ除外 → contenteditable 要素 (将来追加されうるリッチエディタ) でも誤発火しないよう保護
  - **✨ `.cell-nested` に hover 背景色 + word-break**: 長い JSON が折り返されるよう `word-break: break-word`、hover で `rgba(27,150,255,0.08)` の薄背景。**cell-id (accent 濃色) との視覚分離**
  - **🧪 検証完了**:
    - Account.OwnerId 単体 → primitive ID → `cell-id` 化 (regex `/^[a-zA-Z0-9]{15,18}$/` マッチ)
    - Account.Owner.Id ネスト → object → `cell-nested` 化 (Id [005xx] 形式)
    - 設計書 markdown table の th/td には class が付かないため cell-id 判定対象外
- **v1.62.0 (2026-05-20 09:30)** — ネストセル dblclick で raw JSON コピー + 🔗 アイコン:
  - **🐛 ネストリレーションセル (cell-nested) の dblclick コピーが raw JSON を返す**: 従来 `Akira Kataoka [005xx...]` の表示文字列がコピーされていたが、`data-raw-value` 属性に元の JSON を格納し、dblclick 時はそちらを優先取得。**Salesforce REST API の生レスポンスを正確に取得可能**
  - **✨ ネストセル視覚マーク (`🔗`)**: `cell-nested` クラスに italic 体 + 🔗 prefix で平坦化セルを識別。`cell-id` (🔍 単独 ID) との視覚分離
  - **🧪 cell-id 自動検出**: `/^[a-zA-Z0-9]{15,18}$/` で純粋 15/18桁マッチのみ → 平坦化文字列「Name [Id]」(空白+角括弧含む) は false match しないことを regex で保証 (修正不要)
- **v1.61.0 (2026-05-20 09:25)** — SOQL ネストリレーション値の平坦化表示:
  - **🐛 SOQL ネストリレーション (例 `Account.Owner.Name`) のセル表示改善**: 従来 `{"attributes":{...},"Name":"Akira Kataoka","Id":"005..."}` のような raw JSON 表示 → `Akira Kataoka [005xx0000000abc]` 形式に平坦化。代表項目 (`Name` / `Subject` / `Title` / `DeveloperName` / `MasterLabel` / `FullName`) の順に優先抽出 + Id 併記 (18 桁短縮)
  - **🐛 SOQL サブクエリ (`(SELECT ... FROM Contacts)`) は `[N 件のサブクエリ]` 表示**: 子レコード集合 `{totalSize, done, records:[]}` を件数で表現、ノイズ削減
  - **🧪 ChangeSet ID セル click**: メタデータ ID (01p ApexClass / 30E Flow) を Inspector で開けて便利と判断、修正不要
  - **🧪 Inspector フィールド数表示**: `meta.innerHTML` に `<span class="pill">${fieldCount} 項目 / 値あり ${filledCount}</span>` で既に実装済 (Inspector Reloaded 相当)
- **v1.60.0 (2026-05-20 09:20)** — 🎉 累計60リリース節目 - 結果テーブル ID セルクリックで Inspector ジャンプ:
  - **✨ SOQL/describe/metadata/logs/ChangeSet 全 grid テーブルで ID 列を自動検出**: 15/18桁 英数字 + 英字 + 数字を含むセルを `.cell-id` 化、🔍 絵文字プレフィクス付き表示
  - **✨ ID セル single-click で Inspector に瞬時ジャンプ**: `inspectRef` 入力欄に値セット → `switchToView("inspector")` → `doInspect()` 自動実行 + toast `🔍 <id> を Inspector で開く`。**Inspector Reloaded の「Show all data on record」UX 相当を独自実装**
  - **🐛 dblclick (コピー) との競合解消**: 220ms 遅延で click を発火、dblclick が来たら cancel。**従来コピー用だったセルが「コピーしたいだけなのに飛ぶ」事故を防止**
- **v1.59.0 (2026-05-20 09:15)** — README に Inspector URL/CSV テスト手順 + package.xml ソート確認:
  - **📖 README に Inspector「現在タブから取得」5 パターン動作表追加**: Lightning レコード / Setup (encoded address) / Setup (Apex Class) / Classic / Old Lightning fragment の各 URL 例と期待動作
  - **📖 README に SOQL 列ソート + CSV/コピー反映の動作手順追加**: 6 ステップで実機確認可能。ロケール対応・数値判定のロジック説明込み
  - **🧪 ChangeSet package.xml `<types>` ソート確認**: `panel.js:745-747` で `Object.keys(byType).sort()` + `Array.from(byType[type]).sort()` 二重ソート実装済 (修正不要)
- **v1.58.0 (2026-05-20 09:10)** — Lightning Setup URL 抽出 + CSV ソート反映:
  - **🐛 Inspector「現在タブから取得」を Lightning Setup URL でも動作**: `?address=%2F<Id>` (encoded slash) クエリパラメタ、pathname の 15/18桁 ID、URL fragment (`#/sObject/...`) の 3 段階フォールバック。**従来 `/lightning/r/` のみ → Setup タブから ID 取得不可だったが、ManageUsers/ApexClasses 等の Setup URL からも抽出可能に**
  - **🐛 SOQL 「📥 CSV」/「📋 CSV」が列ソートを反映**: `getOrderedRecordsForExport()` で `#soqlResult th.sortable[data-sort-dir]` を検出 → `state.lastRecords` を同じソートロジックで並び替えて出力。**従来「テーブルでソートしたのに CSV は元順」だった違和感を解消**。toast に `(<col> <dir> ソート反映)` ヒント表示
  - **🧪 Picker Enter キーで現在ハイライト行を選択**: 既存実装 (picker.js:377-380) で `e.key === "Enter"` 時に `sel.click()` 動作確認、修正不要
- **v1.57.0 (2026-05-20 09:05)** — getByExtId 形式チェック + placeholder 拡充:
  - **✨ API URL Builder `getByExtId` で形式エラー検出**: `id` が `<項目名>/<値>` 形式 (`/^[A-Za-z0-9_]+\/.+/`) でない場合に `⚠ 形式エラー: 「外部ID項目名/値」 (スラッシュ区切り)。例: Email/foo@bar.com` を表示
  - **✨ `#apiId` プレースホルダ拡充**: `Id (get/update/delete) または ExtIdField/値 (例 Email/x@y.com)` + title 属性で詳細ヒント。max-width も 200→280px に拡張
  - **✨ popup `#loginAsSearch` プレースホルダ統一**: `Username / 姓名 / Alias / Email で検索 (Active のみ)` + title で SOQL 仕様明示 (`ORDER BY LastLoginDate DESC LIMIT 30`)
  - **🧪 検証完了**: Inspector reference 失敗→back の scrollTop 復元は `inspectHistory.push` が fetch 前なので OK (back で fresh doInspect → scrollTop restore 動作確認)
- **v1.56.0 (2026-05-20 09:00)** — Login as 0件ヒント + 設計書 th 視覚分離 + 検証完了:
  - **✨ popup Login as 検索結果 0 件時に詳細ヒント**: 検索語ありの時は `検索条件「<term>」に一致するユーザーがいません 💡 別のキーワード (Username の一部、Alias、姓名) で再検索してください`、無しの時は `権限不足の可能性 (Modify All Data / View All Users)` を案内。**従来「該当ユーザーなし」だけだったエラーが原因+対処を明示**
  - **✨ 設計書 markdown プレビュー内 th を非ソート可能と明示**: `.design-preview th { cursor: default }` + hover 時に背景色変化なし。**.grid th (sortable, cursor:pointer + hover 濃色) との視覚差別化** で「クリックできそうだけどできない」混乱を解消
  - **🧪 検証完了**: design-docs.js の markdownToHtml は plain `<th>` を生成 (sortable class なし) → markdown table はソート対象外 (修正不要)
- **v1.55.0 (2026-05-20 08:55)** — popup SOQL 結果テーブルも列ソート可能化 + 検証完了:
  - **✨ popup SOQL 結果テーブルにも列クリックソート対応**: `recordsToTableHtml` の th に `.sortable` クラス + sortTableByTh ハンドラ。panel/tool と同じ asc/desc/unsort トグル + ▲/▼ 矢印 (popup 用に font-size: 8px 縮小)。**popup でも 460px 幅で SOQL 結果を即ソート可能**
  - **🧪 検証完了 (3 件すべて修正不要)**:
    - SOQL ソート状態 vs 再実行: `soqlResult.innerHTML = recordsTable(recs)` で table 要素全入替なので sortDir 自然消滅 (OK)
    - 設計書 ▲ トップへ二重表示: `preview.innerHTML = ...` で毎回全消去 → 1 ボタンのみ追加 (OK)
    - 列ソート ↔ td.dblclick (コピー) 干渉: 別要素 (th vs td) なので干渉なし (OK)
- **v1.54.0 (2026-05-20 08:50)** — SOQL/grid 列クリックソート + 設計書 ▲ トップへボタン:
  - **✨ `.grid` 結果テーブル列ヘッダクリックでソート**: asc → desc → unsort の 3 段階トグル。文字列は `localeCompare('ja')`、数値判定 (`/^-?\d+(\.\d+)?$/`) されたら数値ソート。**SOQL/describe/metadata/logs/ChangeSet/export preview 全てで適用**。クリック先 th に `▲/▼` 矢印 + hover で背景濃色 (cursor: pointer)
  - **✨ 設計書プレビューに `▲ トップへ` ボタン (sticky 右下)**: 長い設計書 (1000+ 項目) 閲覧時、最下部から先頭に戻れる。`scrollTo({behavior:"smooth"})` で滑らかに移動。**Profile Reader の長スクロール対策に類似**
  - **🧪 検証完了**: chrome.contextMenus は background.js:51-54 で `onInstalled` 時に登録済 (修正不要)
- **v1.53.0 (2026-05-20 08:45)** — Apex Debug Log エラー UX + 参照ラベル + env transition:
  - **🐛 Apex Debug Log 取得失敗時に分かりやすいエラー表示**: 404 → 「削除済または期限切れ」、403 → 「ApexLog 参照権限不足 (Setup → ユーザー → 権限セット確認)」、その他 → HTTP コード + 「Trace Flag 未設定の可能性」のヒント。**従来は silent fail で out.textContent が空だった → 原因が即座に分かる**
  - **✨ Inspector reference 参照先ラベル `.ref-target-label` クラス化**: 従来インラインスタイル `color:var(--fg-dim); font-size:9px` → CSS クラス `color:#8aa3c8; font-size:10px; opacity:0.85` で **コントラスト向上 + 行ホバー時 accent 色に変化** で参照先が直感的
  - **✨ `.env-badge` に transition 追加**: orgInfo 更新 (Org 切替/再接続) 時の PROD/SBX/DEV バッジ色変化が滑らかに (0.2s ease)
- **v1.52.0 (2026-05-20 08:40)** — Inspector 履歴重複防止 + API op 入力制御 + 環境バッジ:
  - **🐛 Inspector 履歴重複防止**: 同一レコードを再 inspect しても `inspectHistory` に積まない。`sameAsLast` (履歴末尾と同一) と `movingToCurrent` (現在表示中と同一の raw 入力) の両方で判定 → **`back` ボタンで同じレコードを何度も巻き戻る現象を解消**
  - **✨ API URL Builder の op 切替時に不要 input を hide**: `API_OP_INPUTS` テーブルで 18 op それぞれに `{obj, id}` 表示要否を定義。`describe` は obj のみ / `query`/`limits`/`versions`/`userinfo` は両方非表示 / `get`/`update`/`delete` は両方表示。**画面ノイズ削減 + 何を入力すべきか即座に分かる**
  - **✨ orgInfo に環境バッジ追加 (ORGanizer 参考)**: `*.sandbox.*` → 🟢 `SBX` / `*.develop.*`/`*.scratch.*` → 🟡 `DEV` / それ以外 → 🔴 `PROD`。**本番組織での誤操作を視覚的に予防** (color tag per org の簡易版)
- **v1.51.0 (2026-05-20 08:35)** — Picker reload リセット + .meta smooth transition:
  - **🐛 Picker reload (⟳) ボタンで selectedIdx / scrollTop / 検索クエリも一緒にリセット**: 旧データ位置を指したまま新データを表示する違和感を解消。`scrollMemory.delete(cacheKey)` で前回スクロール位置記憶もクリア。`⏳/❌` 絵文字付きステータスメッセージで進捗可視化
  - **✨ `.meta` に `transition: opacity 0.25s ease`**: loading-pulse 完了時 (class removeChild 後) に opacity が ガクッと切替らず滑らかにフェード。**Inspector / SOQL / Login History の完了体感が滑らかに**
  - **🧪 検証完了 (3 件すべて修正不要)**: ①design-docs.js apiError は SF error 配列優先 + object error + JSON truncate (240) で多層フォールバック実装済 ②Login Status filter は WHERE Status='Success' / Status!='Success' / 空 (All) で正しく分岐 ③Picker reload のみ selectedIdx 残留問題あり → 修正済
- **v1.50.0 (2026-05-20 08:30)** — 🎉 累計50リリース節目 - 15→18桁展開 + CSV to clipboard + 検証完了:
  - **✨ Inspector 「📋 貼付」で 15桁 ID を 18桁に自動展開**: `to18CharId()` で checksum 計算、`📋 貼付: 001xxx (15→18 展開)` toast で可視化。**REST API は両方受け入れるが 18桁の方がオブジェクト判定で安全**
  - **✨ SOQL ツールバーに「📋 CSV」ボタン追加 (Inspector Reloaded 参考)**: ダウンロードせず直接クリップボード経由。Excel / Slack / メールに即ペースト可能。既存 `📥 CSV` (ダウンロード) と並列配置で用途別選択
  - **🧪 バグ検証完了 (3 件すべて修正不要)**: ①SOQL pinned toggle は `togglePinAt:399-401` で「pinned 先 + ts 降順」再ソート実装済 ②Apex Debug Log エラーは displayApiError() で HTTP 別ヒント表示済 ③Export CSV は同期処理だが state.lastRecords は API 上限内 (LIMIT 2000) で freeze 懸念低い
- **v1.49.0 (2026-05-20 08:25)** — Inspector 📋 貼付ボタン + グローバル KBSC + バグ検証完了:
  - **✨ Inspector に「📋 貼付」ボタン追加**: クリップボードから ID をワンクリック貼付 → 自動 doInspect 実行。URL からの貼付けにも対応 (regex で末尾 15/18 桁 ID を抽出)。**Salesforce Inspector Reloaded のクイックアクセス UX 相当**
  - **✨ グローバルキーボードショートカット (Inspector Reloaded 風)**: 入力欄でない場所で押下時、`Ctrl+Alt+I` → Inspector / `Ctrl+Alt+Q` → SOQL / `Ctrl+Alt+A` → Apex / `Ctrl+Alt+L` → Limits / `Ctrl+Alt+R` → REST / `Ctrl+Alt+D` → 設計書。**マウスを使わず瞬時にビュー切替** + panelToast でフィードバック
  - **✨ Inspector の取得ボタンに `(Enter)` ラベル追加**: 既存 keydown ハンドラで Enter キー対応済を可視化
  - **🧪 バグ検証 (3 件すべて修正不要と判定)**: ①apiBuildUrl は state.apiHost (toApiHost 経由) で Lightning→my.salesforce.com 正常変換 ②loadSelectedApex は apexCode のみ書換、soqlText 非干渉 ③Picker overlay は `display:flex; align-items:center; justify-content:center` で画面中央配置済
- **v1.48.0 (2026-05-20 08:20)** — loading pulse アニメ + タブ切替時 toast クリア:
  - **✨ `.toast.loading` / `.panel-toast.loading` に opacity pulse**: `@keyframes sfdtPulse` (1.2s ease-in-out infinite) で 1.0 ↔ 0.55 を行き来。**進行中であることが視覚的に分かる** (静的 ⏳ よりも明示的)
  - **✨ Inspector / Export describe / SOQL / LoginHistory の meta に `.loading-pulse` クラス付与**: 取得中表示も pulse、結果出ると removeClass で停止。**toast と meta の loading UX 統一**
  - **🐛 タブ切替時に前ビューの toast が画面外に残らない**: `switchToView()` 冒頭で `.panel-toast` を全 remove。**ナビ遷移時のゴースト toast 問題解消**
- **v1.47.0 (2026-05-20 08:15)** — toast loading 色 + background 通知絵文字統一:
  - **✨ `.toast.loading` / `.panel-toast.loading` 薄青グレー追加**: 進行中表示専用の控えめな色 (`#1a2540` + `var(--fg-dim)` border)。**OK/ERR/WARN の 4 色目として実装 → 完了前 toast (アップデート確認中等) の視覚的識別**
  - **✨ popup `⏳ アップデート確認中…` toast に `{kind:"loading"}` 適用**: 結果 toast (✅ ok / ❌ err) との差別化
  - **✨ background 通知メッセージに絵文字統一**: タイトル `🆕 DevToolsNext 自動更新` + 本文 `✨ vX.Y → vZ.W に更新しました…`。**v番号に `v` プレフィクス追加で見やすく**
- **v1.46.0 (2026-05-20 04:40)** — popup toast にも kind 対応 + 全 popup 呼出統一:
  - **✨ popup `.toast.ok / .err / .warn` 色分け CSS 追加**: panel と同じ 3 色 (深緑 / 深赤 / 深橙) + border-left
  - **✨ popup `toast(msg, {kind})` 実装**: 連続呼出で既存 .toast を全 remove (stack なし) + kind class 付与
  - **✨ popup 全 toast 呼出 (約 18 箇所) に kind を付与**: 接続成功 ok / クエリ復元 ok / ピン留め ok → `ok`、未接続/未入力警告 → `warn`、確認失敗 → `err`。**panel/tool/popup の 3 環境すべてで toast 色分け統一**
  - **🧪 design-docs.js / sf-api.js / picker.js には toast 呼出なし確認** (panel.js / popup.js の 2 ファイルで完結)
- **v1.45.0 (2026-05-20 04:35)** — panelToast kind 全箇所適用:
  - **✨ 全 panelToast 呼出 (約 18 箇所) に `{kind:"ok"|"err"|"warn"}` を付与**: コピー成功 / 追加 → `ok` (深緑)、 削除 / 警告 / 未取得 → `warn` (深橙)、コピー失敗 / Error → `err` (深赤)。**従来全部 accent 青で同じ見た目だった toast が、操作結果のシリアス度を色で即座に区別可能に**
  - **対象**: Apex/REST/Inspector JSON コピー成功/失敗、ChangeSet 追加/除外、URL/curl/設計書コピー、Inspector 戻る、Mermaid Live Editor 警告、Export 必須エラー、TD ダブルクリックコピー
- **v1.44.0 (2026-05-20 04:30)** — .grid td 列幅制限 + Toast 色分け:
  - **✨ `.grid td` に `max-width: 400px / max-height: 80px / overflow: auto`**: 巨大 description フィールドや長い JSON で 1 セルだけが幅 1000px+ に膨らみ他列が見えない問題を解消。**セル内スクロールで内容は完全保持**
  - **✨ panelToast({kind:"ok"|"err"|"warn"}) 色分け**: 既定 accent 青 + `.ok` 深緑/`.err` 深赤/`.warn` 深橙 background + アクセント border-left。**コピー成功 / エラー / 警告が一目で識別**
  - **🧪 popup `#statusMsg` の `white-space: pre-line` 確認**: 既存 popup.css:164 で適用済 → 非SFタブの複数行警告メッセージが正常表示される (修正不要)
- **v1.43.0 (2026-05-20 04:25)** — popup/describe/login ヒント + panelToast replace:
  - **✨ popup .result:empty::before**: `📊 SOQL 未実行 / 上にクエリを入力して「実行」をクリック` で popup 起動直後の空白解消
  - **✨ #describeResult:empty::before** (`🔍 describe 未取得`) + **#loginResult:empty::before** (`👤 Login History 未取得`) でガイド追加
  - **✨ panelToast 重複表示を replace 化**: 連続クリック時に新 toast 表示前に既存 `.panel-toast` を全 remove。**3 回連打しても最新のメッセージだけが画面に残る** (スタックしない)
- **v1.42.0 (2026-05-20 04:20)** — 結果ペイン空状態ヒント統一:
  - **✨ #soqlResult / #apexResult / #restResult / #limitsResult が空のとき `:empty::before` で自動ヒント**: 
    - SOQL: `📊 SOQL 未実行 / 上のクエリエリアにクエリを入力して「実行」をクリック`
    - Apex: `⚡ Apex 未実行 / 上のコードエリアに匿名 Apex を入力して「▶ 実行」をクリック`
    - REST: `📡 REST 未送信 / 上の URL バーで Method/Path を指定して「送信」をクリック`
    - Limits: `📊 Limits 未取得 / 上の「取得」ボタンで現在の上限使用状況を読込`
  - **設計思想**: 4 ペイン同一パターン (accent 色 + 中央配置 32px padding) で **初期画面に「何もない感」が消え、操作手順を即座に把握**
- **v1.41.0 (2026-05-20 04:15)** — 設計書プレビューに空状態ヒント + Picker/Org 切替の既存実装確認:
  - **✨ .design-preview 初期空状態にプレースホルダ**: `📋 まだ設計書未生成` + `↑ 設計書タイプを選択 → オブジェクト指定 → 「生成」をクリック` という 2 段階の手順ヒント。`.empty-hint` クラスでアクセント色 + パディング 40px の中央配置 → **初心者ユーザーが何をすればよいか即座に理解**
  - **🧪 Picker close 後 focus 復元を再確認**: `picker.js:259-261` で `focusReturnTarget.focus()` 呼出済 → **キーボード遷移後に呼び元 input/button にフォーカス戻る既存実装で OK**
  - **🧪 Org 切替時 cache invalidate 再確認**: `panel.js reconnect():1796-1801` で `invalidatePickerCache()` + `inspectHistory.length = 0` 同時実行済 → **別組織キャッシュ漏れない既存実装で OK**
- **v1.40.0 (2026-05-20 04:10)** — 🎉 サイクル50 達成 - Limits 4段階配色 + REST copy + Inspector scroll 復元:
  - **✨ Limits バー 4段階配色 (low/mid/warn/critical)**: `<50%` 純緑、`50-70%` 緑→accent、`70-90%` accent→warn、`90+%` warn→err。`.limit-bar-wrap` に 70%/90% の薄い縦ライン (`::before` / `::after`) を追加してしきい値視認
  - **✨ REST Result に 📋 結果コピーボタン**: Apex 同様 `navigator.clipboard.writeText` + panelToast。**巨大 JSON レスポンスを全選択不要で一発コピー**
  - **✨ Inspector reference 戻る時に scrollTop 復元**: `inspectHistory` の各エントリに `scrollTop` を保存、`doInspect({restoreScrollTop})` で `renderInspectorFields()` 完了後に復元。**3 階層クリックで深堀り→3 回戻る、各位置で同じスクロール位置に戻る**
- **v1.39.0 (2026-05-20 04:05)** — Inspector ヘッダ sticky + nav border-left + Apex copy:
  - **✨ Inspector フィールドヘッダを sticky 化**: `.field-row-header { position: sticky; top: 0; z-index: 2 }` + 下線 2px accent。**200+ 項目スクロール時に「API 名 / 型 / 値 / フラグ」列タイトル常時可視**
  - **✨ ナビゲーション active タブに左 3px accent border**: `.nav-btn.active` に `border-left: 3px solid var(--accent)` + padding-left 補正。**選択中のビューが Picker ホバー同様の視覚言語で識別可能**
  - **✨ Apex Result に 📋 結果コピーボタン追加**: `btnApexCopy` クリックで `navigator.clipboard.writeText` → panelToast `📋 Apex 結果コピー (N 文字)`。**長 debug log を選択せず一発コピー**
- **v1.38.0 (2026-05-20 04:00)** — 入力域拡大 + h3 sticky + Picker 検索確認:
  - **✨ `#restBody` / `#apexCode` / `#soqlText` の min-height を 140px、フォント 12px ui-monospace に**: 長い JSON ペーストや Apex スニペット編集時の縦スクロール頻度を削減
  - **✨ .design-preview h3 を sticky top: 28px**: h2 (top:0) の下に貼り付き、長セクション内で h3 (`### 2-3 子オブジェクト関係` 等) が常時可視。z-index:1 で table th (z:2) より下層
  - **🧪 Picker 検索確認**: `picker.js` の `hay` フィールドが既に name+label+keyPrefix/type/UserLicense等を連結済 → 「取引先」「営業時間」等 label 検索が機能していることを確認 (修正不要)
- **v1.37.0 (2026-05-20 03:55)** — 実行中表示の絵文字化 + Limits カード hover:
  - **✨ 主要ハンドラの進行中メッセージに絵文字付与**: SOQL/Inspector/CS候補/describe/LoginHistory `⏳ 取得中…`、Apex `⚡ 実行中…`、REST `📡 送信中…` で **どの操作が走っているか一目で識別可能**
  - **✨ Limits カードに hover エフェクト**: `transform: translateY(-1px) scale(1.02)` + `border-color: var(--accent)` + 軽い `box-shadow` で **上限値を眺めながらどのカードを見ているか視覚的に明確**
  - **🧪 .design-preview code/pre の等幅フォント確認**: 既に `font: 11px ui-monospace, Consolas, monospace` で適用済 (panel.css:187-188) → コード/JSON サンプルが Markdown プレビューで正しく等幅表示される
- **v1.36.0 (2026-05-20 03:50)** — 日付フォーマット + ローディング + Picker ホバー:
  - **✨ Inspector で date/datetime 型を整形表示**: ISO 文字列 (`2026-05-20T03:45:00.000+0000`) → date: `2026-05-20`、datetime: `2026-05-20 03:45` に整形。title 属性に raw 値併記
  - **✨ popup ローディング表示**: `setStatus("⏳ セッション取得中…")` で **⏳ 絵文字** 付き、待機中であることを明示
  - **✨ Picker 行ホバー強化**: 背景 `#112042` + 左 3px のアクセント色 border-left + padding 調整 → **どの行をホバーしているか視覚的に明確**
- **v1.35.0 (2026-05-20 03:45)** — 数値フォーマット + セルコピー:
  - **✨ Inspector で数値型のロケール 3桁区切り**: `int/double/currency/percent` で `v.toLocaleString("ja-JP")` 適用 (例: `1234567` → `1,234,567`)、currency に `¥`、percent に `%` 単位、title 属性に raw 値併記
  - **✨ 結果テーブルのセルをダブルクリックでコピー**: `td.cell-copyable` クラス + dblclick リスナー → `📋 コピー: <値先頭40字>...` toast、`cursor:copy` でカーソル明示
- **v1.34.0 (2026-05-20 03:40)** — Inspector JSON コピー + Excel 列幅 + transition 短縮:
  - **✨ Inspector に「📋 JSON」コピーボタン追加**: 全項目を JSON 形式でクリップボードへ。`navigator.clipboard.writeText` + panelToast 通知。**ダウンロードせずに即ペースト可能**
  - **✨ design-docs Excel 列幅を可変化**: 1列目 (No 等) 60、長い見出し (>20 文字) 220、それ以外 180 px。**従来一律 120 から見出し長さに応じた自動調整に変更**
  - **✨ hover transition を 0.15s → 0.1s に短縮**: タブ/ナビ切替のレスポンスが更にキビキビ
- **v1.33.0 (2026-05-20 03:35)** — reference 参照先表示 + 結果テーブル縞模様:
  - **✨ Inspector reference 値に「→ Object 名」併記**: 例 `001xxxxxx → Account` のように参照先オブジェクト名を `var(--fg-dim) 9px` で添える。**ID だけ見て何のレコードか分からない問題を解消**
  - **✨ 結果テーブルに縞模様**: `.grid tr:nth-child(even) td` / `.result tr:nth-child(even) td` に `rgba(27,150,255,0.025)` の薄背景。**長いリストで行を見失わない**、ホバー時は引き続きアクセント色
- **v1.32.0 (2026-05-20 03:30)** — Inspector 戻る toast + Picker キーヒント + Org 切替リセット:
  - **✨ Inspector 戻るボタンクリック時に panelToast**: `⏪ 戻る: Account:001xxx...` のように **どこに戻ったか即可視化**
  - **✨ Picker ヘッダにキーボード操作ヒント**: `⌨ ↑↓ / Home/End / Enter / Esc` を半透明バッジで常時表示 (600px 以下では非表示)
  - **🐛 Org 切替時に inspectHistory もリセット**: 別組織のレコード履歴が混入する潜在問題を予防 (Picker キャッシュ invalidate と同タイミング)
- **v1.31.0 (2026-05-20 03:25)** — 🎉 サイクル40 達成 - Inspector 戻る + focus-visible 統一:
  - **✨ Inspector に「← 戻る」ボタン追加**: reference クリックで遷移後、`inspectHistory` stack (最大 20 件) からポップで戻る。**Web ブラウザの戻るボタンと同等の操作性**。`doInspect({skipHistory:true})` で履歴汚染なし
  - **♿ グローバル focus-visible スタイル統一**: `button:focus-visible, a/input/select/textarea:focus-visible { outline: 2px solid var(--accent); offset:1px }`。**キーボード Tab 移動時のフォーカス位置が常時明確** (マウスクリック時は非表示)。Picker `.picker-close` にも個別 focus アウトライン
- **v1.30.0 (2026-05-20 03:20)** — 設計書 h2 sticky + ブランドクリック復帰:
  - **✨ 設計書プレビューの h2 を sticky 化**: 長い設計書 (フィールド権限マトリクス等) を下スクロール中もセクション見出し (`## 2.項目定義` 等) が画面上部に貼り付く。**今どのセクションを見ているか常時把握可能**
  - **✨ ヘッダの「DevToolsNext」ブランドをクリックで SOQL ビューに戻る**: cursor:pointer + title 説明。**ロゴクリック=ホーム回帰の Web 慣習に対応**
  - **🧪 popup .card padding は既に 10px 12px で統一済を確認**
- **v1.29.0 (2026-05-20 03:15)** — Picker recent Org 別 + API URL 解説行間:
  - **🐛 Picker recent items を Org 別管理**: `chrome.storage.local.sfdtPickerRecent` のキーを `${orgId}|${kind}` に変更。`showPicker({orgKey: state.orgId})` で渡す。**異なる Salesforce 組織を行き来しても "Account" が混在しない**
  - **✨ apiBuildHelp 解説の行間調整**: `line-height: 1.7`、`p { margin: 6px 0 }`、`blockquote { margin: 8px 0 }` で **長い説明文が読みやすく**
  - **🧪 apiBuildUrl ↔ apiBuildCurl 同期確認**: `apiOp change` イベントで `apiBuildUrl()` が呼ばれ、内部で両方更新する既存実装で OK
- **v1.28.0 (2026-05-20 03:10)** — pill 統一 + Picker scroll 復元 + Apex 結果折返し:
  - **✨ panel .pill に薄い背景色追加**: `.pill.ok/.err/.warn` に `rgba(色, 0.15)` の半透明背景。**popup .badge と同等の見た目で統一感**
  - **✨ Picker scrollTop 保持/復元**: モーダル閉じる時に位置記憶、同一 kind 再表示時に復元 (`scrollMemory` Map)。**同じ Picker を何度も開く時にスクロールしなおさなくて済む**
  - **✨ Apex/REST 結果の長文折返し**: `#apexResult.code` / `#restResult.code` を `white-space: pre-wrap + word-break: break-word` に。**長い debug ログや巨大 JSON も横スクロールせず確認可能**
- **v1.27.0 (2026-05-20 03:05)** — UI トランジション + 空メッセージ絵文字 + ボタンホバー:
  - **✨ popup tabs / panel nav-btn にトランジション**: `transition: color/border-color/background 0.15s` で **タブ切替が滑らかに**。tab ホバー時に薄いアクセント背景
  - **✨ recordsTable 空時メッセージを絵文字化**: `該当なし` → **`📭 該当データなし`** + 中央寄せ + padding 増やしてリッチに
  - **✨ button.primary ホバーで青いリング**: `box-shadow: 0 0 0 3px rgba(27,150,255,0.2)` で**フォーカスっぽいハロー効果**、押せる感の強調
- **v1.26.0 (2026-05-20 03:00)** — Picker キーボード拡張 + Excel 重複確認:
  - **✨ Picker のキーボード操作を Home/End/PageUp/PageDown まで拡張**: 従来は ↑↓ Enter Esc のみ → 先頭/末尾/10 行ジャンプ可能に。**大量候補からの素早い移動が可能**
  - **🧪 Excel シート名重複サフィックス確認**: `toExcelXml` で同名シートに `_2 / _3` を付与する既存ロジックを再確認 (31 文字制限内で切る)
- **v1.25.0 (2026-05-20 02:55)** — th sticky + recordsToCsv 全列クォート統一:
  - **✨ 全結果テーブルの th を完全 sticky 化**: `.grid th` / `.design-preview th` / `.result th` に `z-index: 2` 追加。**長スクロール時もヘッダ行が常時可視**、行を見失わない
  - **🐛 recordsToCsv 全列クォート統一**: sf-api.js の SOQL/Login History 用 CSV エクスポートも全フィールド `"..."` 統一形式に変更。**4 種類すべての CSV エクスポート (Limits/Export/Inspector/SOQL+Login) でフォーマット整合**
- **v1.24.0 (2026-05-20 02:50)** — ユーザー アバター + Picker ヘッダ tooltip:
  - **✨ popup loginAs ユーザー一覧にイニシャル円アバター**: 名前の頭 1〜2 文字、Id 末尾 6 文字を hash した HSL 色で**ユーザーごとに一意の色**。検索結果リストの視認性向上
  - **✨ Picker 列ヘッダに tooltip**: ヘッダ全体に「⏱ 最近選択 / ★ お気に入り / その他 順」、各列名にも個別 tooltip。**ソート規則がホバーで確認可能**
- **v1.23.0 (2026-05-20 02:45)** — タイムスタンプ統一 + コピー Toast 充実:
  - **✨ ダウンロードファイル名のタイムスタンプ統一**: `tsForFilename()` ヘルパー導入 → `YYYYMMDD-HHmm` 形式 (例: `Account_20260520-0245.csv`)。**Excel 出力/CSV/JSON/SFDX バンドル/SOQL/Limits/Login History の 7 種類で統一**。従来 `Date.now()` (ms タイムスタンプ) や `toISOString()` (`2026-05-20T...`) がバラついていたのを整理
  - **✨ 18桁 ID コピー toast を値表示付きに**: `"18桁ID をコピーしました"` → **`"📋 18桁ID をコピーしました: 0011x000abcdAAAA"`** で確認しやすく
  - **🧪 picker overlay z-index 99999 vs sticky ヘッダ 100 → 衝突なし確認済**
- **v1.22.0 (2026-05-20 02:40)** — 便利リンクカテゴリ化 + title 動的化:
  - **✨ popup の便利リンクをカテゴリ別グルーピング**: 「⚙️ Setup / 💻 開発 / 📊 監視 / 🔐 セキュリティ」の 4 カテゴリに 18 リンクを再編成。`.links-group-title` で各カテゴリヘッダをアクセント色で明示
  - **✨ tool.html の document.title を動的更新**: view 切替時に `<ビュー名> - DevToolsNext` 形式に。**ブラウザタブで現在のビューが一目で分かる**、複数 tool タブを開いていても識別可能
- **v1.21.0 (2026-05-20 02:35)** — 🎉 サイクル30 達成記念 + 入力ガード + ガイド充実:
  - **🐛 Export 0 件選択時のダウンロードガード**: SOQL 空 or `exState.selected` が空なら panelToast で警告して中断。**空 CSV が生成されない**
  - **✨ textarea プレースホルダ例文充実**: SOQL は `SELECT ... LAST_N_DAYS:30 ...`、Apex は `System.debug` / `DELETE [SELECT...]` 等の実用例を placeholder に
  - **🧪 README に「設計書ジェネレータ 22 種類 手動テストガイド」追加**: 各 design type の入力例 / 期待結果 / エラーパターンを 1 表で網羅。新規ユーザーの動作確認手順として最適
- **v1.20.0 (2026-05-20 02:30)** — CSV 全列クォート統一 + Inspector ヒント + フッタ改善:
  - **🐛 exToCsv も全列クォート方式に統一**: Limits CSV と同じく全フィールド `"..."` 形式、null は `""` 表現。**ロケール差で安全な統一フォーマット**
  - **✨ Inspector 空状態の説明強化**: 「📭 該当フィールドなし」+ 状況に応じた **💡 ヒント** (「空値も表示」/「System 項目を表示」/フィルタクリアの案内) を表示
  - **✨ popup フッタリンクをツール起動に**: 「DevTools パネルを開く方法」(toast 案内のみ) → 「🛠️ ツールを開く」(クリックで `tool.html` 新規タブ起動)。**1 クリックで全画面起動可能**
- **v1.19.0 (2026-05-20 02:25)** — CSV 互換性 + Picker 内訳 + 再接続強調:
  - **🐛 Limits CSV 出力で全列をダブルクォートで囲む**: ヘッダ含めて統一、内部の `"` は `""` エスケープ。**ロケール差 (カンマ区切り言語/タブ) や %/カンマ含む値でも Excel/Numbers/Google Sheets で安全に読込可能**
  - **✨ Picker ヘッダに「⏱X ★Y」内訳表示**: 最近選択した件数 (⏱) と お気に入り件数 (★) を `count` メタに併記。アクセント色で視認性向上
  - **✨ 再接続ボタンに ⟳ 絵文字**: tool.html / panel.html 両方の「再接続」ボタンを `⟳ 再接続` に。**何ができるボタンか視覚で即理解**できる
- **v1.18.0 (2026-05-20 02:20)** — ChangeSet toast + Picker focus + whats-new 折りたたみ:
  - **✨ ChangeSet builder で追加/除外時に toast 通知**: 「➕ 追加: ApexClass:MyClass」「➖ 除外: …」を表示。複数選択時の進行状況が分かりやすく
  - **✨ Picker 閉じる時のフォーカス復元**: トリガボタンに元の focus を戻す。**キーボードユーザーがタブ移動を途中から再開できる** (a11y 向上)
  - **✨ popup whats-new カードを折りたたみ可能化**: ヘッダクリックで body 表示切替、▼/▶ アイコン。状態を chrome.storage.local に保存し再表示時に維持
- **v1.17.0 (2026-05-20 02:15)** — ETA 拡張 + 接続失敗トラブルシュート:
  - **✨ fieldPermMatrix 進捗に ETA pill 追加**: 取得済件数と経過時間から `ETA 約 XX秒` を併記 (1秒以上経過後のみ)。設計書 Export 共に ETA 表示で**長時間処理の体感不安を軽減**
  - **✨ popup 接続失敗時のトラブルシュート案内をステップ化**: SF タブ無し時は「1. 開く / 2. ログイン / 3. ⟳」、sid 無し時は「1. ログイン確認 / 2. ブラウザ再起動の可能性 / 3. my.salesforce.com で開き直し」と**手順番号付きで何をすればよいか明確化**
- **v1.16.0 (2026-05-20 02:10)** — ソート明示 + 限度強調 + DL 強調:
  - **✨ SOQL 履歴ヘッダにソート規則を明示**: 「📌 ピン留め優先 / その後 最新順 (最大10件)」と表示。role="list" 付与で a11y 対応
  - **✨ Limits ダッシュボード 70% 超のカードを赤/橙ボーダー強調**: `.limit-card.critical { border-color:err; box-shadow:0 0 0 1px err }` で枠線色、危険な上限が一目で識別可能
  - **✨ 設計書生成完了後の DL ボタンを 3 秒間パルス強調**: `.ready-pulse` で緑背景 + 6px box-shadow パルスアニメーション 3 回。**「次にこれを押せばダウンロード」を視覚で誘導**
- **v1.15.0 (2026-05-20 02:05)** — Picker 多重防止 + ヘッダ sticky + ETA:
  - **🐛 Picker 多重表示防止**: `showPicker()` 呼出時に `.picker-overlay` が既存なら無視して resolve(null)。Picker トリガを連打しても 1 つだけ表示
  - **✨ tool.html ヘッダ sticky 化**: 長スクロール時もブランド/version/再接続/kbd-hint が常に見える (`position:sticky; top:0; backdrop-filter:blur(6px)`)
  - **✨ Export 進捗に ETA (残り時間概算) 表示**: 経過時間 / 取得済件数で 1 件あたりを算出 → 残件 × その = 概算残り時間。`⏱ ETA 約 XX秒/X分Y秒` pill 表示
- **v1.14.0 (2026-05-20 02:00)** — 進捗バー + toast 統一 + 履歴拡大:
  - **✨ Export 進捗バー視覚化**: ダウンロード中のプログレス領域に `<span class="dl-bar">` で **160×6 px のグラデーション進捗バー** (緑→青)、`<span class="pill">XXX / YYY 件 (NN%)</span>` と併記。**残り何件か直感的に把握可能**
  - **✨ panelToast を copy 系全てに適用**: `copyDesignSource` (📋 設計書ソースをコピーしました) / `apiCopyUrl` (📋 URL) / `apiCopyCurl` (📋 curl) / `csCopyXml` (📋 package.xml) を統一。**従来は meta 領域に "コピー完了" 追記する違和感ある形だった**
  - **✨ ナビ「最近開いたビュー」上限を 5 → 7 件**: 13 ビューの過半数が履歴に残り、頻用ビューへの戻りが速くなる
- **v1.13.0 (2026-05-20 01:55)** — ダウンロード可視化 + Mermaid Live 連携:
  - **✨ Export ダウンロード走行中のボタン文言を動的変更**: `CSV ダウンロード` → `⏸ 取消 (CSV)` のように切替。`button.dl-running` クラスで橙色背景に変色、ホバーで赤に。**キャンセル可能なことが視覚的に一目で分かる**
  - **✨ ER 図設計書プレビューに「🔗 Mermaid Live Editor で可視化」ボタン**: mermaid テキストを base64 エンコードして `mermaid.live/edit#base64:<...>` に **ワンクリックで遷移して描画**。エンコード失敗時は空ページ + toast 案内
- **v1.12.0 (2026-05-20 01:50)** — Export キャンセル + ✕ 共通化 + toast:
  - **🐛 データエクスポート途中キャンセル**: `exDownloadAll` 走行中に再度「ダウンロード」ボタンを押すとフラグで中断 → 取得済み件数で出力中止。`<span class="pill warn">⏸ キャンセル済</span>` 表示
  - **✨ ✕ クリアボタンを共通化**: `attachClearButton(inputId)` ヘルパーで Inspector フィルタ / エクスポート フィールド絞込 / 変更セット絞込 / オブジェクト入力 など主要入力欄に統一適用
  - **✨ panel/tool 共通 toast**: `panelToast(msg)` ヘルパー + `.panel-toast` CSS で popup と同じ右下スタイル
  - **✨ Excel format ヒント**: 設計書 format select に「⚠ 大量行は遅い」を併記
- **v1.11.0 (2026-05-20 01:45)** — Picker UX + popup ヘルプ:
  - **🐛 exRunPreview にもレースガード追加** (`exPreviewRunId`)。データエクスポートのプレビューを連続クリックしても古い結果が混じらない
  - **✨ Picker 検索ボックスに ✕ クリアボタン**: テキスト入力の右側に絶対配置、クリックで即クリア+フォーカス戻し
  - **✨ popup ヘルプカードにキーボードショートカット表示**: tool.html ヘッダだけだったキーボード操作ヒント (Ctrl+Enter / Esc / ↑↓) を popup の whats-new カードにも記載
- **v1.10.0 (2026-05-20 01:40)** — レースガード全面適用 + textarea Tab:
  - **🐛 残りハンドラにもレースガード追加**: doRunApex (`apexRunId`)、doRest (`restRunId`)、doGenerateDesign (`designRunId`) の 3 つにも `myId !== ...RunId` チェック導入。**設計書の onProgress コールバックも古い実行を無視** (DOM の意図しない上書きを完全防止)
  - **✨ エラー pill の自動 fade**: 30 秒経過で opacity 0.35 まで自然に薄くなる CSS animation。**ボタンは無効化せず、視認性のみ落とす**ことで操作可能性を維持
  - **✨ textarea Tab → 2 spaces 変換**: soqlText / apexCode で Tab キーが focus 移動せずインデントに使える。`enableTabToSpaces` ヘルパーで dataset で二重バインド防止
- **v1.9.0 (2026-05-20 01:35)** — レースガード + 統一スタイル:
  - **🐛 連続実行レースガード**: `doSoql`/`doInspect` に `soqlRunId`/`inspectRunId` カウンタを導入。連続クリックで古いリクエストの結果が新しい結果を上書きする問題を解消。古いレスポンスはコンソールに `discard stale ... result` を出して破棄
  - **🐛 Inspector describe エラー表示も displayApiError に統一**
  - **✨ disabled ボタン統一スタイル**: opacity 0.45 + grayscale 0.4 + cursor:not-allowed、ホバー時もアクセント色にならない
  - **✨ カスタムスクロールバー**: Chromium 系で 8px 細め、アクセント色 (`rgba(27,150,255,0.3)` → ホバーで 0.6) で控えめ統一
- **v1.8.0 (2026-05-20 01:30)** — エラー可読性 + Picker UX:
  - **🐛 design-docs.js apiError() の body 切り詰めを JSON 安全化**: SF エラー配列 `[{errorCode, message}]` を最優先で人間可読化、`data.error_description` / `data.message` を次選、その他は 240 字で切って `…(切詰)` 印を付加。**JSON の途中で切れて読みにくい**問題を解消
  - **✨ Picker モーダル背景スクロール抑止**: `body.picker-open { overflow:hidden }` でモーダル展開中に背景がスクロールしないように
  - **🧪 大量データ memory 検証手順 README 追加**: Performance Monitor で JS heap 観察、50000 件キャップ動作確認の 7 ステップ
- **v1.7.0 (2026-05-20 01:25)** — 細部洗練:
  - **🐛 sf-api.js getUserInfo の堅牢化**: Chatter `users/me` で `firstName`/`lastName` が null/undefined 時に `"undefined undefined"` 生成を防止。fallback 順 `displayName → fn+ln → username → id`。完全失敗時のエラーメッセージに 2 段 (chatter / oauth2) の HTTP コードを含む
  - **✨ tool.html サイドバー折りたたみ時のホバーツールチップ**: アイコンのみ表示時に右側にラベルを浮かせて表示 (`data-tooltip` 属性 + CSS `::after`)。ホバーで全機能名が確認できる
- **v1.6.0 (2026-05-20 01:20)** — UI 整理 + アクセシビリティ:
  - **✨ popup タブ 5→4 削減**: 「ID 解析」を単独タブから「ホーム」内のカード (🔢 Salesforce ID 解析) に統合。ID 入力 → 解析・レコードを開く はホームから直接利用可能
  - **♿ aria-label 追加 (主要要素)**: tabs にロール / 各タブ・主要ボタン (Login as 検索、ID 解析、再接続、API バージョン選択) に aria-label / orgInfo に role="status" aria-live="polite" / 結果領域に role="region"
  - **⌨️ tool.html ヘッダにキーボードショートカットヒント**: `Ctrl+Enter` 実行 / `Esc` 閉じる / `↑↓` Picker 移動 を kbd 要素で常時表示 (700px 以下では非表示)
- **v1.5.0 (2026-05-20 01:15)** — エラー対処リンク化 + ER 図エスケープ:
  - **✨ エラー hint をリンク化**: 401 → 「セッション管理を開く」「Login History (内部)」/ 403 → 「プロファイル一覧」「権限セット一覧」「OWD 設定」/ 404 → 「オブジェクトマネージャ」/ 400 → 「Describe ビュー (内部)」/ 429 → 「Limits (内部)」/ 500 → 「Status Trust ページ」。クリックで Setup の該当ページに直接遷移 (内部リンクは tool/panel 内のビュー切替)
  - **🐛 Mermaid ER 図エスケープ強化**: `mid()` で識別子を `[^A-Za-z0-9_]` で sanitize、`mlabel()` で backslash/改行/制御文字を除去。label 内のダブルクォートは ' に置換 (既存だが整理)
- **v1.4.0 (2026-05-20 01:10)** — Inspector 信頼性 + ナビ視覚:
  - **🐛 Inspector reference クリック修正**: 参照先オブジェクト名を `describe.fields[].referenceTo[0]` から取得して `<Object>:<Id>` 形式で渡すように変更。KeyPrefix 逆引きに頼らず、**カスタムオブジェクトでも確実に動作**
  - **✨ ナビ フラッシュアニメーション**: `@keyframes navFlash` 追加。ビュー切替時に対象ボタンが 0.45 秒で青色フラッシュ → 「最近開いたビュー」リスト経由でも視覚フィードバック明確
  - **🧪 data-view 13 個 panel.js 整合性確認**: tool.html / panel.html / panel.js handler の対応関係チェック完了
- **v1.3.0 (2026-05-20 01:05)** — エラー統一完了 + 進捗展開:
  - **🐛 残り throw を完全統一**: design-docs.js の 13 箇所の `throw new Error` を `apiError(ctx, response)` / `requireInput(value, hint)` / `HTTP 404` プレフィックス付き not-found に統一。20+ 箇所の `throw new Error` が完全に panel.js `displayApiError` の HTTP 検出と互換に
  - **✨ progressCallback 展開**: profileDetail (PermissionSet 検索中) / objectPermMatrix (ObjectPermissions 取得中) / flsReport (FieldPermissions 取得中) / fieldPermMatrix にも進捗表示
- **v1.2.0 (2026-05-20 01:00)** — エラー統一 + 進捗表示:
  - **🐛 design-docs.js エラー throw 統一**: `apiError(ctx, response)` ヘルパー導入で全エラーが `HTTP <status> <ctx>: <body>` 形式に。panel.js の `displayApiError` の HTTP 検出正規表現が確実に効く
  - **🐛 入力必須チェック統一**: `requireInput(value, hint)` ヘルパーで全ジェネレータの未入力エラーが「入力必須: <ヒント>」形式
  - **🐛 「結果 0 件」統一表示**: doGenerateDesign で totalRows=0 の場合 `<span class="pill warn">結果 0 件</span> XXX: 該当データなし` 表示
  - **✨ 進捗コールバック対応**: design-docs.js の長時間処理 (fieldPermMatrix 等) で `progress(msg)` 呼び出し → meta 領域に「⏳ 生成中… XXX 件取得中…」と表示
  - **🧪 401 テスト手順を README に追加**: セッション期限切れ動作確認のステップバイステップ
- **v1.1.0 (2026-05-20 00:55)** — 洗練継続:
  - **🐛 Org 切替時の Picker キャッシュ invalidate**: `panel.js reconnect()` で前回 OrgId と比較し、変わっていれば `invalidatePickerCache()` を呼んでキャッシュ全消去
  - **📱 tool.html レスポンシブ対応**: 横幅 < 1000px でサイドバーが 60px のアイコン専用バーに自動折りたたみ、ホバー or タップで展開。横幅 < 700px ではヘッダのブランド名も縮小、ツールバーが折り返し
- **v1.0.0 (2026-05-20 00:45)** — 1.0 メジャー (洗練成熟):
  - **🐛 エラー表示統一**: panel.js の 8 関数 (doSoql/doDescribe/doRest/doMetadataList/doFetchLogs/doRunApex/doFetchLoginHistory/exRunPreview) を `displayApiError` 共通ヘルパーに統一。HTTP 401/403/404/400 に対し「⚠ HTTP XXX + 詳細 + 💡 対処方法」フォーマットで表示
  - **✨ Picker お気に入り**: sobject 選択時に Account/Contact/Opportunity/Lead/Case/User/Task/Event/Campaign/Product2 を上部固定 (★ バッジ)
  - **✨ Picker 最近選択した履歴**: chrome.storage.local に kind 別最大 10 件保存、検索クエリ無し時は最近選択 → お気に入り → その他の順で表示 (⏱ バッジ)
  - **✨ ナビ「最近開いたビュー」**: chrome.storage.local に最大 5 件保存、サイドバー最上部に表示
  - **🐛 設計書「入力不要」タイプは入力欄を disable + 🔍 ボタン非表示**: profileList/permsetList/apexClassList 等で UI の混乱を解消
  - GitHub 公開: https://github.com/akira-kataoka/devtools-next
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

## v1.70.0 時点 機能サマリ 🎉 (累計 70 リリース達成)

| カテゴリ | 機能 | UX |
|---|---|---|
| 🗃️ データ操作 | SOQL / Inspector (レコード詳細) / Export (50000件CAP/Excel) | 列クリックソート、ID セル → Inspector ジャンプ、ネスト平坦化、CSV/コピー反映 |
| 💻 開発ツール | Apex (匿名実行 + Debug Log) / REST API / API URL Builder / Metadata 一覧 / Logs | 結果サイズ pill 色分け、getByExtId 形式チェック、grid 全体に td max-width + sortable |
| 📊 監視 | Limits ダッシュボード / Login History | 4段階配色 (low/mid/warn/critical) + @600px レスポンシブ、Login Status filter |
| 📦 メタデータ | ChangeSet / package.xml ビルダー (types ソート済) | SFDX バンドル生成 (retrieve.bat/.sh + sfdx-project.json) |
| 📋 設計書 | 22 種類 (Excel/Markdown/HTML/CSV/TSV/Mermaid ER) | h2/h3 sticky + ▲ トップへ + 空状態ヒント |
| 🎨 UI/UX | 4 色 Toast (ok/err/warn/loading) + pulse / 6 ペイン empty-hint / 環境バッジ (PROD/SBX/DEV) / 列クリックソート | Picker 共通 + 検索 + scroll memory + Org 別 recent / focus-visible / KBSC Ctrl+Alt+I/Q/A/L/R/D |
| ♿ アクセシビリティ | aria-label / role="status" / role="region" / focus-visible 統一 / pulse 通知 | キーボード Tab/Enter/Esc 完全対応 |
| 🔄 自動アップデート | VERSION.txt 30s ポーリング + chrome.runtime.reload + 🆕 通知 | 環境別バッジで本番組織誤操作予防 |

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

### 📚 設計書 22 種類 業務向け詳細解説 (v2.16.0 拡充)

各設計書が「何を出力し」「業務でどう使えるか」を 1-2 行で。Phase 1-6 で各設計書に凡例セクションを内蔵済 (ツール内で読める)。

| # | 設計書名 | 何を出力するか | 業務での使い所 |
|---|---|---|---|
| 1 | **オブジェクト定義書 (objectDef)** | 1 オブジェクトのサマリ + 全項目 17 列 (型/必須/参照先/作成可/更新可/暗号化/ヘルプ等) + 子リレーション + RecordType | 開発前の項目仕様確認 / 監査向け項目台帳 / インポート前のレイアウト把握 |
| 2 | **プロファイル詳細書 (profileDetail)** | 1 プロファイル または権限セットの 9 シート (Object/FLS/System/Apex/VF/Tab/RecordType/App 権限) | 監査時の権限スナップショット / ライセンス棚卸 / プロファイル統廃合検討 |
| 3 | **FLS レポート (flsReport)** | 全項目 × Profile/PermSet を縦持ちで一覧 | 「この項目を見られるのは誰か」を縦串で確認 / SOX 監査資料 |
| 4 | **フィールド権限マトリクス (fieldPermMatrix)** | 行=項目、列=Profile (👤) / PermSet (🔑)、セル RW/R-/-- + 必須列 | 項目アクセスの組織横断棚卸 / 改修前後の差分確認 (Excel diff) |
| 5 | **オブジェクト権限マトリクス (objectPermMatrix)** | 行=オブジェクト、列=Profile/PermSet、セル CRUDVM 6 桁 (Read/Create/Edit/Delete/ViewAll/ModifyAll) | オブジェクトレベルの全権限可視化 / 統制レポート |
| 6 | **プロファイル一覧 (profileList)** | 全 Profile のライセンス・ユーザ種別・更新日 | プロファイル数の棚卸 / 不要プロファイル削除候補抽出 |
| 7 | **権限セット一覧 (permsetList)** | 全 PermissionSet (プロファイル付随除く) のライセンス・種別 | 権限セット運用整理 / Spring '26 後の権限セット移行計画 |
| 8 | **Apex クラス一覧 (apexClassList)** | 全 ApexClass のステータス・コード行数・API バージョン | 6MB Apex Limit の進捗把握 / 古い API バージョンクラスの一覧化 |
| 9 | **Apex トリガ一覧 (apexTriggerList)** | 全 Trigger × 7 イベント (BI/AI/BU/AU/BD/AD/AUD) の有無 | トリガ実行順制御の調査 / 1 オブジェクト 1 トリガ原則の遵守確認 |
| 10 | **フロー一覧 (flowList)** | アクティブ Flow を業務種別 (画面/自動起動/レコード起動等) 日本語付きで列挙 | Process Builder 廃止対応の進捗 / フロー責任者の洗い出し |
| 11 | **入力規則一覧 (validationRuleList)** | ValidationRule + エラー表示位置・エラーメッセージ全文 | 業務ルールの文書化 / 「保存できない理由」のユーザ説明資料 |
| 12 | **レコードタイプ一覧 (recordTypeList)** | RecordType の有効/無効・営業プロセス連携状況 | レコードタイプ整理 / プロファイル別割当て棚卸の前準備 |
| 13 | **フィールドセット一覧 (fieldSetList)** | 指定オブジェクトの FieldSet 定義 | LWC/VF 連携時に動的項目セットを使っている箇所の確認 |
| 14 | **カスタム設定一覧 (customSettingList)** | CustomObject から CustomSettingsType=List/Hierarchy のみ抽出 | レガシー資産確認 / カスタムメタデータ型への移行候補抽出 |
| 15 | **アプリ一覧 (appList)** | AppDefinition + AppMenuItem | App Launcher に出ているアプリの完全把握 |
| 16 | **アクセスコントロール定義書 (accessControl)** | OWD (オブジェクト毎の組織既定共有設定) + UserRole 階層 + 凡例 | 共有設計レビュー / セキュリティ監査の必須資料 |
| 17 | **フロー詳細書 (flowDetail)** | 1 Flow を要素 14 種類 (Decision/Action/Record 操作等) に分解 | 担当者交代時の業務ロジック引継ぎ |
| 18 | **Apex 詳細書 (apexDetail)** | SymbolTable から methods / properties / innerClasses を抽出 | コードレビュー前の API 一覧把握 |
| 19 | **LWC 設計図 (lwcDetail)** | バンドル内全ファイル (html/js/xml/css/svg/json) + 公開設定 | LWC 改修着手前の構成確認 / IsExposed の状況把握 |
| 20 | **ER 図 (erDiagram)** | Mermaid 形式で Master-Detail (実線) と Lookup (点線) を区別 | データモデル説明資料 / Mermaid Live Editor で SVG/PNG 出力可 |
| 21 | **Apex メソッド呼出ツリー (apexCallTree)** | クラス間呼出関係 (SymbolTable ベース) | 影響範囲調査 / リファクタ前の依存把握 |
| 22 | **Limits ダッシュボード (limitsDashboard)** | 組織の API/Storage/Apex CPU 等の Limit 利用状況 | 容量増設タイミングの判断 / 月次レポート |

各設計書は 6 形式 (Markdown / HTML / Excel SpreadsheetML / CSV / TSV / JSON) でエクスポート可能。ツール上のプレビューには **0. 凡例** セクションが自動表示され、業務担当者でも読めるようになっています。

### 🧪 設計書ジェネレータ 22 種類 手動テストガイド

各 design type で「未入力時」「正常入力時」「存在しない値」を 3 段階でテスト:

| # | type | 入力例 (正常) | 期待結果 |
|---|---|---|---|
| 1 | objectDef | `Account` | 概要 + 項目定義 + 子リレーション + RecordType |
| 2 | profileDetail | `営業ユーザー` または `@MyPS` | 9 シート (Object/FLS/System/Apex/VF/Tab/RecordType/App) |
| 3 | flsReport | `Account` | 全項目 × Profile/PermSet 縦持ち |
| 4 | fieldPermMatrix | `Account` | 行=Field、列=Profile/PermSet、セル RW/R-/-- |
| 5 | objectPermMatrix | (入力不要) | セル CRUDVM 6 桁 |
| 6 | profileList | (入力不要) | 全 Profile 一覧 |
| 7 | permsetList | (入力不要) | 全 PermissionSet 一覧 |
| 8 | apexClassList | (入力不要) | 全 ApexClass 一覧 |
| 9 | apexTriggerList | (入力不要) | 全 Trigger 一覧 (BI/AI/BU/AU/BD/AD/AUD) |
| 10 | flowList | (入力不要) | Active Flow 一覧 |
| 11 | validationRuleList | (任意 `Account`) | 入力規則一覧 |
| 12 | recordTypeList | (任意 `Account`) | RecordType 一覧 |
| 13 | fieldSetList | `Account` | FieldSet 一覧 |
| 14 | customSettingList | (入力不要) | カスタム設定一覧 |
| 15 | appList | (入力不要) | AppDefinition + AppMenuItem |
| 16 | accessControl | (入力不要) | OWD + UserRole 階層 |
| 17 | flowDetail | `My_Flow` | Flow 内の 14 要素分解 |
| 18 | apexDetail | `AccountController` | SymbolTable から methods/properties/innerClasses |
| 19 | lwcDetail | `myComponent` | バンドル内全ファイル |
| 20 | erDiagram | `Account` | Mermaid + 「🔗 Mermaid Live Editor で可視化」ボタン |

未入力時は「入力必須: <ヒント>」、存在しない値は「⚠ HTTP 404 ... が見つかりません」が表示されることを確認。

### 🧪 大量データエクスポート memory 検証手順

50000 件キャップで動かす際に、ブラウザがフリーズしたりメモリリークしないことを確認する手順。

1. tool.html → 「📥 データエクスポート」を開く
2. オブジェクト = Account など大量のレコードがあるものを選択 → フィールド読込
3. WHERE 空、LIMIT = 50000 を設定
4. Chrome DevTools (右クリック→検証) → **Performance Monitor** タブ
   - JS heap size の上限を確認 (300 MB が目安)
5. 「Excel ダウンロード」を実行
6. 進捗表示で `XXX 件取得…` が増えていくのを確認
7. 完了後、JS heap size が 100 MB 程度に戻ること (急増したまま戻らなければ leak の兆候)

### 🧪 Inspector「現在タブから取得」の URL パターン対応 (v1.58.0+)

`/lightning/r/<Object>/<Id>/view` 以外でも ID を抽出できるよう、3 段階フォールバック実装済。動作確認手順:

| パターン | URL 例 | 動作 |
|---|---|---|
| Lightning レコード | `/lightning/r/Account/0011x00000abcde/view` | `Account:0011x00000abcde` を入力欄にセット |
| Lightning Setup (User 編集) | `/lightning/setup/ManageUsers/page?address=%2F005xx...` | `005xx...` を抽出 (encoded slash 対応) |
| Lightning Setup (Apex Class) | `/lightning/setup/ApexClasses/page?address=%2F01p...` | `01p...` を抽出 |
| Classic | `https://<org>.my.salesforce.com/0011x00000abcde` | `0011x00000abcde` を抽出 |
| Old Lightning fragment | `https://<org>.lightning.force.com/#/sObject/0011x00000abcde/view` | `0011x00000abcde` を抽出 |

抽出失敗時は `タブからレコードIDを抽出できません URL: ...` に **`💡 レコード詳細画面で再試行 (Setup ページからは抽出できないことがあります)`** のヒントが付与される。

### 🧪 SOQL 結果の列ソート + CSV/コピー反映 (v1.58.0+)

1. SOQL 実行 → 結果テーブルに行表示
2. 列ヘッダ (例 `Name`) をクリック → `▲` 矢印 + 行が asc ソート
3. もう一度クリック → `▼` desc / 3 回目で unsort (元順)
4. `📥 CSV` ダウンロード → ソート反映済の CSV が `.csv` ファイルとして保存
5. 完了 toast に `📥 CSV N 行 (Name asc ソート反映)` 表示で反映を確認
6. `📋 CSV` (クリップボードコピー) も同様に反映

(数値判定: `/^-?\d+(\.\d+)?$/` にマッチすると数値ソート、それ以外は `localeCompare('ja')` で日本語対応)

### 🧪 大量結果のスクロール FPS 計測手順 (v1.67.0+)

`#apexResult` / `#restResult` / `.design-preview` / `.result` に `contain: layout style` を適用済。1MB 超のテキストでもスクロールが軽くなることを Chrome DevTools で確認する手順:

1. Chrome DevTools (F12) → **More tools → Rendering** タブ
2. **Frame Rendering Stats** にチェック (画面右上に緑のオーバーレイで FPS 表示)
3. tool.html → Apex 実行 (またはサンプルとして REST `/sobjects/Account/describe` で巨大 JSON 取得)
4. 結果 pre / div 内をマウスホイールで上下スクロール
5. FPS 表示が 50〜60 fps を維持していれば最適化 OK (10〜30 fps だと再描画ボトルネック)
6. 比較したい場合は DevTools Console で `document.getElementById("apexResult").style.contain = "none"` → スクロール → 戻す

### 🧪 macOS キーボード対応 (v1.81.0 で正式記載)

すべての KBSC は Mac の `Cmd` (⌘) と Windows の `Ctrl` を両対応:

| 操作 | Win/Linux | Mac |
|---|---|---|
| SOQL 実行 | `Ctrl+Enter` | `Cmd+Enter` (⌘ Return) |
| Apex 実行 | `Ctrl+Enter` | `Cmd+Enter` |
| Inspector / SOQL / Apex 等ビュー切替 | `Ctrl+Alt+I/Q/A/L/R/D` | `Ctrl+Alt+I/Q/A/L/R/D` (Mac でも Ctrl のまま) |
| Picker close | `Esc` | `Esc` |
| Tab → 2 spaces (Apex/SOQL コードエリア) | `Tab` | `Tab` |

実装: `e.ctrlKey || e.metaKey` で両キーをハンドリング (`panel.js:329 / 371` + `popup.js:123`)。IME 変換中の Enter は確定キーとして扱い、確定後の 2 回目で実行 (`e.isComposing || keyCode === 229` ガード)。

### 🧪 Picker キーボード操作 & focus 戻りテスト手順 (v1.74.0+)

Picker モーダルのアクセシビリティ確認:

1. tool.html を開く → 接続 → Inspector または SOQL ビューへ
2. **Picker 起動**: 「オブジェクト選択」等の Picker 起動ボタンに **Tab キーで到達** → `Enter` または `Space` で Picker 開く
3. **キーボード操作**:
   - `↑ ↓` で行選択
   - `Home / End` で先頭・末尾ジャンプ
   - `PageUp / PageDown` で 10 行移動
   - `Enter` で現在ハイライト行を選択 → close
   - `Esc` でキャンセル close
4. **focus 戻り確認**:
   - Picker close 後、`document.activeElement` が **元のトリガボタン** (例 `btnPickObject`) に戻る
   - DevTools Console で `document.activeElement.id` を確認
5. **detached 防御 (v1.74.0)**: Org 切替で input が再生成されたケースでも、エラーなく Picker は閉じる (`document.body.contains` チェック)

#### Picker close 経路一覧 (v1.83.0+)

| 経路 | トリガ | close 値 | 伝播ガード |
|---|---|---|---|
| 行クリック | マウスクリックで `.picker-row:not(.header)` | 選択行の value | overlay click は `e.target === overlay` 判定で誤発火しない |
| Enter キー | `$input` keydown で `e.key === "Enter"` | 選択行の value (`sel.click()`) | `preventDefault` + `stopPropagation` (v1.83.0) |
| Esc キー | `$input` keydown で `e.key === "Escape"` | `null` (キャンセル) | `preventDefault` + `stopPropagation` (v1.82.0) |
| ✕ ボタン | `.picker-close` クリック | `null` | (overlay 外側 click と区別) |
| 背景クリック | `.picker-overlay` 自身のクリック | `null` | `e.target === overlay` で背景のみ |

各 close 後の処理:
1. `scrollMemory` に `$list.scrollTop` を保存 (同 kind 再表示時に復元)
2. `document.body.classList.remove("picker-open")`
3. `focusReturnTarget` に focus 戻し (DOM 接続確認、v1.74.0)
4. `resolve(val)` で `await showPicker()` を解決

### 📋 popup SOQL 履歴の仕様 (v2.1.0 で明記)

popup の SOQL 実行履歴 (`soqlHistory` in chrome.storage.local) の保持ルール:

- **非ピン留め項目**: 最大 10 件まで自動保持 (古いものから削除)
- **ピン留め項目**: 件数制限なし (📌 アイコンで明示、長押しで toggle)
- **同一クエリの重複防止**: 既存の同 SOQL がある場合、削除して先頭に再挿入 (ピン状態は維持)
- **`HISTORY_MAX = 10` 定数**: `popup.js:317` で定義

ピン留めを 20 件にすれば履歴一覧は 20+10=30 件まで肥大化しうる (UI スクロールで対応)。

### 📥 全 Download / Copy 一覧 (v1.90.0 時点)

すべての download/copy 操作は `panelToast` (panel) または `toast` (popup) で結果フィードバック (📥 成功 / 📭 未取得 / ❌ 失敗) を表示:

| 機能 | 関数 | 形式 | toast (実装 ver) | 未取得警告 |
|---|---|---|---|---|
| SOQL 結果 download | `exportCsv()` | CSV | `📥 CSV ...行` + ソート反映 (v1.58) | ✅ v1.49 |
| SOQL 結果 copy | `copyCsvToClipboard()` | CSV (clipboard) | `📋 CSV ...行` + ソート反映 (v1.58) | ✅ v1.49 |
| 設計書 download | `downloadDesignSource()` | MD/HTML/CSV/TSV/XLS | `📥 設計書ダウンロード: <fmt> <size>` (v1.87) | ✅ |
| 設計書 copy | `copyDesignSource()` | source (clipboard) | `📋 設計書ソースをコピー (<size>)` (v1.86) | ✅ |
| ChangeSet package.xml | `csDownloadXml()` | XML | `📥 package.xml ダウンロード (<size>)` (v1.88) | ✅ |
| ChangeSet SFDX bundle | `csDownloadSfdxBundle()` | MD | `📥 SFDX バンドル (.md) ダウンロード (<size>)` (v1.88) | ✅ |
| Inspector レコード JSON | `exportInspect("json")` | JSON | `📥 Object:Id を JSON ダウンロード (<size>)` (v1.89) | ✅ |
| Inspector レコード CSV | `exportInspect("csv")` | CSV | `📥 Object:Id を CSV ダウンロード (<size>)` (v1.89) | ✅ |
| Inspector レコード JSON copy | `btnInspectCopyJson` | JSON (clipboard) | `📋 Object:Id の JSON をコピー` (v1.45) | ✅ v1.45 |
| Limits CSV | `exportLimitsCsv()` | CSV | `📥 Limits CSV (35 項目 / <size>)` (v1.89) | ✅ |
| Login History CSV | `exportLoginCsv()` | CSV | `📥 Login History CSV (N 件 / <size>)` (v1.90) | ✅ v1.90 |
| Apex 結果 copy | `btnApexCopy` | text (clipboard) | `📋 Apex 結果コピー (N 文字)` (v1.45) | ✅ v1.45 |
| REST 結果 copy | `btnRestCopy` | text (clipboard) | `📋 REST 結果コピー (N 文字)` (v1.45) | ✅ v1.45 |
| popup SOQL CSV | `popup exportCsv()` | CSV | toast 標準 (v1.45+) | ✅ |
| popup 18桁ID copy | clickHandler | text | `📋 18桁ID をコピーしました: ...` (v1.45) | - |
| popup curl/URL copy | API Builder | text | `📋 URL をコピーしました` / `📋 curl ...` (v1.45) | - |

**累計 16 種類**の download/copy 操作で **統一 toast + 未取得警告** を完備。

### 🧪 VERSION 整合性チェック手順 (v1.85.0+)

リリース時に `VERSION.txt` / `manifest.json` の `version` フィールド / `README.md` の "更新履歴" 先頭行が一致しているか確認:

```powershell
# PowerShell
$v = (Get-Content VERSION.txt -Raw).Trim()
$m = (Get-Content manifest.json | ConvertFrom-Json).version
$r = (Select-String -Path README.md -Pattern '^- \*\*v(\d+\.\d+\.\d+)' | Select-Object -First 1).Matches.Groups[1].Value
"VERSION.txt:  $v"; "manifest:     $m"; "README:       $r"
if ($v -eq $m -and $m -eq $r) { "✅ 整合 OK" } else { "❌ 不一致 - 修正必要" }
```

```bash
# Bash
v=$(tr -d '[:space:]' < VERSION.txt)
m=$(grep -oP '"version":\s*"\K[\d.]+' manifest.json)
r=$(grep -oP '^\- \*\*v\K[\d.]+' README.md | head -1)
echo "VERSION.txt: $v / manifest: $m / README: $r"
[ "$v" = "$m" ] && [ "$m" = "$r" ] && echo "✅ 整合 OK" || echo "❌ 不一致"
```

3 ファイルの version が完全一致しないと自動アップデート (background.js の VERSION.txt ポーリング) で `chrome.runtime.reload()` が空振りする恐れあり。

### 🚨 起動時エラー対処 (v1.98.0+)

panel/tool.html / popup の上部に「初期化エラー: …」表示が出た場合の対処:

| エラー文 | 原因 | 対処 |
|---|---|---|
| `Cannot access 'XXX' before initialization` | モジュール内の `const` 宣言順 (TDZ バグ) | **v1.99.0 で queueMicrotask 化により恒久解決済**。古い拡張を使用している場合は最新版に更新 |
| `chrome.cookies is undefined` | 拡張権限不足 / Web ページから直接読込 | `manifest.json` の `permissions: ["cookies"]` を確認、Web ページとして単独ロードしないこと |
| `sid Cookie が見つかりません` | Salesforce にログインしていないタブで実行 | SF タブを開いてログイン → 再接続 (⟳) |
| `見つかりません (HTTP 404)` | レコード ID が違う / 削除済 / 別組織 | ID 形式 (15/18 桁) 確認、現在の組織を `PROD/SBX/DEV` バッジで確認 |
| `アクセス権限不足 (HTTP 403)` | Profile/PermSet で対象オブジェクト権限なし | Setup → 権限セット で確認 |
| 「初期化エラー: …」が消えない | 拡張のキャッシュ汚染 | chrome://extensions → 「再読み込み」ボタン |

#### 起動時 TDZ バグの再発防止 (内部実装)

v1.98.0 で発覚した `Cannot access 'API_OP_INPUTS' before initialization` バグの根本原因は、`init()` を **モジュール body 評価中** に同期実行していたため、`init()` 内から参照される後方の `const` が TDZ にあったこと。

v1.99.0 で `init()` の呼出を `queueMicrotask()` でラップ → モジュール body の全 const 評価完了後に init が走るように修正。今後 const を追加しても TDZ になり得ない構造に。

### 🧪 401 INVALID_SESSION_ID テスト手順

セッション期限切れの動作確認手順。期待動作: フッターに `⚠ HTTP 401` + 復旧 hint が表示され、UI が固まらない。

1. Salesforce タブにログインしている状態で拡張アイコン → 「接続OK」確認
2. **意図的にセッションを失効させる**: Setup → Session Management → 現在のセッションを終了 (End)
3. 別タブで DevToolsNext (tool.html) を開く
4. SOQL タブ → `SELECT Id FROM Account LIMIT 1` → 実行
5. **期待結果**: meta 領域に `⚠ HTTP 401 (SOQL 実行) — INVALID_SESSION_ID Session expired or invalid 💡 Salesforce にログインし直してから popup の ⟳ で再接続してください` が表示される (UI は固まらない、コンソールエラーも出ない)
6. Salesforce タブで再ログイン → popup の ⟳ ボタンで再接続 → 「接続OK」復帰確認
7. 同じ SOQL を再実行 → 成功すること

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

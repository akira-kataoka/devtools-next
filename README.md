# Salesforce DevTool (Chrome / Edge 拡張)  v0.6.0

Salesforce 開発者向けユーティリティ拡張機能 (Manifest V3)。
SOQL 実行 / レコードID 解析 / REST API 探索 / Setup ショートカット / Tooling API 経由のメタデータ一覧と Debug ログ閲覧 / **匿名 Apex 実行** / **Login History ビュー** / **設計書ジェネレータ (Excel / Markdown / HTML / CSV / TSV / Mermaid ER 図)** などを、ログイン済みタブの **Session ID (sid Cookie)** を借用して直接実行します。

## 更新履歴
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

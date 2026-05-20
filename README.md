# Salesforce DevTool (Chrome / Edge 拡張)  v0.6.0

Salesforce 開発者向けユーティリティ拡張機能 (Manifest V3)。
SOQL 実行 / レコードID 解析 / REST API 探索 / Setup ショートカット / Tooling API 経由のメタデータ一覧と Debug ログ閲覧 / **匿名 Apex 実行** / **Login History ビュー** / **設計書ジェネレータ (Excel / Markdown / HTML / CSV / TSV / Mermaid ER 図)** などを、ログイン済みタブの **Session ID (sid Cookie)** を借用して直接実行します。

## 更新履歴
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

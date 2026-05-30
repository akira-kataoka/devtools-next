# 🤝 DevToolsNext への貢献ガイド

このプロジェクトは **自律改修ループ** で継続的に磨き上げられている Salesforce 開発者向け Chrome / Edge 拡張です。Phase 1-530 の累積で **640+ リリース** (v3.440.0 + v3 系 440 連続リリース + 磨きシリーズ 180 サイクル達成、Phase 530 マイルストーン達成 + 第 4 弾「ファイルレベル documentation」6 JS ファイル完成 + 内部 drift 5 カテゴリ別構造化 + 業務シナリオ 7 全数値化完了 + 🏆 documentation 系列 6 弾全完了マイルストーン達成 [累計 61+ 成果] + 連鎖 self-drift 8 段階自己実証 + 2 サブパターン両方 2 回発生で再現性実証 + 予防的 Grep 検出 pattern 安定運用 4 段階完成 + 第 15 弾完結 + 🎊 **Phase 100 倍数大マイルストーン累計 5 回達成** + 🏗️ **累計実績 3 軸並列構造 (業務価値 + 品質 + 歴史) 確立** + 第 16 弾完結 + 🏗️ **3 階層構造 + 多視点 documentation 構造 (Phase 512/514 で確立、5 経路反映完了)** + 第 17 弾完結 + 🐞 **CRITICAL バグ修正 11 件 (Phase 526-528 連続 9-11 件目、3 段階フォールバック pattern 確立) + Chrome DevTools MCP 環境構築完了** + 第 18 弾完結 [ユーザー報告由来 CRITICAL バグ修正集中フェーズ + ブラウザデバッグ環境整備] + 第 19 弾 Phase 531+ 進行中で次の Phase 600 (Phase 100 倍数 6 回目) を目指す持続的進化フェーズ) を重ねてきました。新規貢献者を歓迎します。

---

## 🎯 5 大基本指針 (必読)

すべての変更は以下の指針に沿って評価されます:

1. **各モード整合性**: 💻 開発者 (panel/tool) / ⚙️ 管理者 (popup) / 👤 ユーザー (mini-panel) の 3 モード間で UX/動線が揃っていること
2. **使えない / 誤解させる機能の改修・廃止**: 中途半端な機能は積極的に削除 / 改修
3. **動かない機能の積極的な探索**: 「見えない不具合」(Markdown bold 未レンダリング / 未定義 CSS 変数 / null binding 等) を能動的に発見・修正
4. **誰もが使いやすい (a11y / UX / ドキュメント)**: prefers-reduced-motion / focus-visible / aria-label を全面適用、業務担当者向け note を併走
5. **判断が必要な場合はチーム議論**: 大規模変更は PR で議論 → 5 大基本指針の自己評価チェック必須

---

## 🚀 開発フロー

### 1. セットアップ

```bash
git clone https://github.com/akira-kataoka/devtools-next.git
cd devtools-next
# Chrome で chrome://extensions/ を開き「デベロッパーモード」ON → 「パッケージ化されていない拡張機能を読み込む」でこのフォルダを選択
```

### 2. 編集 → 動作確認 → コミット

- ファイル編集後、`chrome://extensions/` で 🔄 リロードボタン (または `background.js` の `VERSION.txt` ポーリングで自動)
- Salesforce タブで F12 → DevToolsNext タブで動作確認
- 3 モード (popup / panel / mini-panel) で影響を確認
- Phase 121 [リリース前 動作確認チェックリスト](README.md#-リリース前-全体動作確認チェックリスト-v3310-) の関連項目を実施

### 3. バージョン管理 (必須)

新規機能 / バグ修正は以下のすべてを更新します:

| ファイル | 内容 |
|---|---|
| `manifest.json` | `"version"` を `3.X.Y` の三桁形式で bump |
| `VERSION.txt` | 同じ `3.X.Y` を改行付きで記載 |
| `README.md` | **小規模 PR** は `## 更新履歴` の先頭に `- **v3.X.Y (YYYY-MM-DD HH:mm)** — 🎨絵文字 Phase N: タイトル: 詳細` を追記。**自律改修ループの累積 Phase** (v3 系 Phase 100+ 以降) は冒頭の「Phase NNN-NNN ブロック」「累計実績 (Phase 520 時点)」を更新する運用で代替 — 大量 Phase 分の `## 更新履歴` 追記は意図的に省略 (累計整理優先) |

> **CI による自動チェック**: [.github/workflows/version-check.yml](.github/workflows/version-check.yml) が `manifest.json` と `VERSION.txt` の差異を検出します。整合性を必ず保ってください。

### 4. ユニットテスト (v3.451.0 Phase 541 から)

純粋関数 (`js/sf-connections.js` の `formatAuthAge` / `isAuthStale` / `maskSecret` / `makeConnectionId` 等) には Node 組込み test ランナーを使ったユニットテストが整備されています。**外部依存 (jest 等) ゼロ**、Node 18+ で `npm test` だけで実行できます。

```bash
cd sf-devtool-extension
npm test          # node --test "tests/*.mjs" のショートカット
# または
node --test "tests/*.mjs"
```

新規ヘルパー関数を追加する際は `tests/*.test.mjs` にケースを追加してください。`chrome.*` API を使う関数 (loadConnections / connFetch 等) は IO 依存のため対象外、純粋関数のみ対象です。

#### テスト対象モジュール (Phase 540-599 で整備、累計 335 テストケース、🎉 Phase 600 milestone)

| モジュール | 公開 export (テスト対象) | テスト |
|---|---|---|
| [js/sf-connections.js](js/sf-connections.js) | 認証 API + 鮮度判定 (`loadConnections`, `formatAuthAge`, `isAuthStale`, `maskSecret`, `makeConnectionId`, `AUTH_STALE_THRESHOLD_MS`) | 19 ケース |
| [js/sf-rest-helpers.js](js/sf-rest-helpers.js) | REST/SOAP 補助 (`parseRestHeaders`, `wrapSoapEnvelope`) | 23 ケース |
| [js/sf-format-helpers.js](js/sf-format-helpers.js) | 表示・整形・XSS 防御・SOQL/SOSL/XML/Markdown エスケープ・現在ユーザー chip・ポップオーバー配置・一括インポート支援 (`tsForFilename`, `tsForFilenameCompact`, `formatError`, `escHtml`, `userInitials`, `relativeTimeJa`, `formatCurrentUser`, `escapeSoqlLiteral`, `userChipStateClasses`, `popoverPosition`, `formatSfDateTime`, `formatSfDateTimeLoose`, `escXml`, `escSoslKeyword`, `escMdTableCell`, `parseClipboardRecords`, `validateBulkOpRequiredColumns`, `summarizeBulkResults`, `bulkOpEmoji`, `bulkOpLabel`, `filterByNameLabel`) | 178 ケース |
| [js/sf-api.js](js/sf-api.js) + [js/sf-api recordsToCsv 専用](tests/records-to-csv.test.mjs) | ホスト判定・ID 変換 (`isSalesforceHost`, `toApiHost`, `parseOrgIdFromSid`, `to18CharId`, `lookupPrefix`, `SF_DOMAINS`, `KEY_PREFIX_MAP`) + CSV 変換 (`recordsToCsv` with `opts.excelBom`) | 55 ケース |
| [js/design-docs.js](js/design-docs.js) | 設計書整形 + Markdown 描画 + 出力 dispatch (`fmtNum`, `fmtBytes`, `fmtTrunc`, `fmtPercent`, `fieldTypeJa`, `FIELD_TYPE_JA`, `xmlText`, `xmlAttr`, `md`, `esc`, `splitMd`, `inline`, `markdownToHtml`, `formatOutput`) | 60 ケース |

**主な集約・改善履歴 (Phase 552-599)**:
- escHtml / escapeSoqlLiteral / escXml / escSoslKeyword / escMdTableCell の 5 種エスケープを各ファイルから集約 (Phase 552-571)
- ISO datetime 整形を formatSfDateTime / formatSfDateTimeLoose に集約 (Phase 565-566、12+ callers)
- ダウンロード処理 triggerDownload / リンクコピー copyLinkWithToast を panel.js 局所ヘルパー化 (Phase 573, 575)
- 一括インポート機能 (parser / UI / execute / 検証 / 集計 / 表示パターン) を helper 化＋テスト化 (Phase 579-599)
- 現在ログイン中ユーザー chip (リアルタイム表示 / 詳細ポップオーバー / 状態 CSS) (Phase 553-561)
- REST API 401 診断ガイド強化、Composite API エラー形式対応 (Phase 578, 597)

### 5. 実画面 UX 検証 (Chrome DevTools MCP、Phase 545-546 で実証)

純粋関数の unit test とは別に、 **拡張機能の UI が実際に意図通り描画されるか** を実 Chrome で検証するフローが整備されています。 npm test では検出できない「state 連動の不具合 (例: storage onChanged listener 漏れ)」「ボタン名と実動作の乖離」などはこちらで発見します (実例: Phase 545 / Phase 546)。

セットアップは [chrome-devtools-mcp (Anthropic 公式)](https://github.com/anthropics/chrome-devtools-mcp) を参照。 Windows では Chrome を専用 user-data-dir + `--remote-debugging-port=9222` で起動する必要あり (メインプロファイルでは singleton 制限で port が無視される)。

検証の基本フロー:

```javascript
// 1. 拡張をリロード (latest コードを反映)
//    chrome://extensions/ で shadow DOM trick で reload button を click

// 2. 検証対象画面へ navigate
//    chrome-extension://<EXTENSION_ID>/html/tool.html?view=connections
//    chrome-extension://<EXTENSION_ID>/html/popup.html

// 3. chrome.storage.local を直接操作して UX を強制発火
const r = await chrome.storage.local.get('sfdtConnections');
const list = r.sfdtConnections || [];
const original = list[0].tokenIssuedAt;
list[0].tokenIssuedAt = Date.now() - 7 * 60 * 60 * 1000; // 7h 前 → stale 化
await chrome.storage.local.set({ sfdtConnections: list });

// 4. DOM 状態を確認 (assert 相当)
await new Promise(r => setTimeout(r, 700)); // listener 発火待ち
const row = document.querySelector('#connList .conn-row');
console.assert(row.querySelector('.pill.warn')?.textContent?.includes('⏰ 古い'));

// 5. screenshot エビデンス (オプション)
//    take_screenshot で .mcp-screenshots/<phase>-<feature>-<state>.png に保存

// 6. ★必須★ 元の値に復元
list[0].tokenIssuedAt = original;
await chrome.storage.local.set({ sfdtConnections: list });
```

**重要なポイント**:
- Salesforce ログイン**不要** — UI レンダリングは `chrome.storage.local` の値だけで決まる。API 実行 (再認証 / SOQL / Apex) が必要な場合のみ SF 接続が要る
- `.mcp-screenshots/` はローカル専用 (gitignore 対象外だが repo にコミットしない運用)
- 検証後は必ず chrome.storage を元の状態に戻す (他テストへの汚染防止)
- panel.js は `chrome.storage.onChanged` で sfdtConnections を購読しているため (Phase 545)、 set 直後に自動再描画される

### 6. PR 提出

- GitHub UI で PR 作成 → [PULL_REQUEST_TEMPLATE.md](.github/PULL_REQUEST_TEMPLATE.md) が自動展開されます
- チェックリストすべて `[x]` に
- 5 大基本指針の自己評価を該当箇所で `[x]`
- UI 変更時は「📸 エビデンス」ボタン出力の Markdown を貼り付け推奨

---

## 🐞 Issue 起票

[ISSUE_TEMPLATE/](.github/ISSUE_TEMPLATE/) に 2 種のテンプレートがあります。

**先に確認すること**:
1. [🆘 トラブルシューティング](README.md#-トラブルシューティング-v3200-) — 13 種類の典型症状 × 対処法
2. [🙋 ロール別 FAQ](README.md#-ロール別-faq-v3220-) — 業務利用者 / 管理者 / 開発者 別 19 問
3. 既存 Issue / Closed Issue の検索

それでも解決しない場合のみ:
- `🐞 バグ報告` — 構造化フォーム (バージョン / モード / 環境 / 再現手順)
- `✨ 機能要望` — 業務シナリオを具体的に + 5 大基本指針との関係

---

## 🛠 コーディングガイド

### ファイル構成

```
sf-devtool-extension/
├── manifest.json        # Chrome 拡張 manifest v3
├── VERSION.txt          # 拡張バージョン (CI で照合)
├── background.js        # service_worker (自動アップデート / メッセージング)
├── html/
│   ├── popup.html       # ⚙️ 管理者モード
│   ├── panel.html       # 💻 開発者モード (DevTools パネル)
│   ├── tool.html        # 💻 開発者モード (フルスクリーン)
│   └── devtools.html    # devtools_page (panel を組み込む)
├── js/
│   ├── popup.js         # popup ロジック
│   ├── panel.js         # panel/tool 共通ロジック (3000+ 行)
│   ├── content.js       # mini-panel (shadow DOM)
│   ├── sf-api.js        # Salesforce REST/Tooling API ラッパー
│   ├── design-docs.js   # 設計書 21 種ジェネレータ (Phase 240 で orgSnapshot 追加、Phase 318 で実装数確認)
│   ├── picker.js        # ARIA listbox ピッカー (オブジェクト/プロファイル/Flow 等)
│   ├── ui-helpers.js    # 共通 UI ユーティリティ
│   └── background.js    # service_worker (entry: manifest.json 参照)
├── css/
│   ├── panel.css        # panel/tool 共通スタイル (2000+ 行)
│   └── popup.css        # popup 専用スタイル
├── icons/
│   ├── icon.svg         # マスター SVG (編集対象)
│   └── icon{16,32,48,128}.png  # SVG からエクスポート
└── _locales/ja/messages.json   # 日本語ロケール
```

### スタイル

- **コードコメント**: 「Why」を書く (「What」は識別子で表現)、Phase 番号や日付を含める (例: `// v3.46.0 (Phase 136): 3 モード SOQL 履歴同期`)
- **CSS**: panel.css の `:root` カラーパレット (`--accent` / `--bg2` 等) を使う。新色追加は避ける
- **JavaScript**: ES modules + `chrome.runtime.sendMessage` のメッセージングパターン。`null` セーフバインドは `$on(id, ev, fn)` を使用
- **a11y**: button / input には title + aria-label、focus-visible 対応必須

### 設計書追加

新規 design type を追加する場合 (`js/design-docs.js`):

1. `buildXxx(ctx)` 関数を実装 (cover / 凡例 / 主章を含む sections を返す)
2. `generateDesign` の `switch` に `case` 追加
3. `html/panel.html` + `html/tool.html` の `<select id="designType">` に option 追加
4. `setupDesignPicker` の `NO_INPUT_TYPES` / `OPTIONAL_TYPES` / `TYPE_REQUIRES_OBJ` を必要に応じ更新
5. `panel.js` の `doGenerateDesign` 早期バリデーション (`TYPE_REQUIRES_OBJ`) を更新

---

## 📋 リリースフロー

1. ローカルで動作確認 (Phase 121 チェックリスト)
2. `VERSION.txt` / `manifest.json` / `README.md` 更新
3. `git commit -m "v3.X.Y: Phase N タイトル..."`
4. `git push origin main` → CI (version-check) 通過確認
5. `git tag v3.X.Y && git push --tags` → CI (release) が `.zip` を自動ビルド → GitHub Release 添付
6. (任意) Chrome Web Store / Edge Add-ons へ手動アップロード

---

## 🙏 謝辞

このプロジェクトは Salesforce 業務担当者・開発者・管理者の声を取り入れて継続改修されています。ユーザー報告 50+ 件 / CRITICAL バグ修正 6 件の累積成果です。

質問は GitHub Issue または X / メールで。

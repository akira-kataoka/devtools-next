# 🤝 DevToolsNext への貢献ガイド

このプロジェクトは **自律改修ループ** で継続的に磨き上げられている Salesforce 開発者向け Chrome / Edge 拡張です。Phase 1-460 の累積で **570+ リリース** (v3 系 370 連続リリース、Phase 460 マイルストーン達成 + 磨きシリーズ 110 サイクル達成 + 第 4 弾「ファイルレベル documentation」6 JS ファイル完成 + 内部 drift 4 カテゴリ別構造化) を重ねてきました。新規貢献者を歓迎します。

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
| `README.md` | **小規模 PR** は `## 更新履歴` の先頭に `- **v3.X.Y (YYYY-MM-DD HH:mm)** — 🎨絵文字 Phase N: タイトル: 詳細` を追記。**自律改修ループの累積 Phase** (v3 系 Phase 100+ 以降) は冒頭の「Phase NNN-NNN ブロック」「累計実績 (Phase 460 時点)」を更新する運用で代替 — 大量 Phase 分の `## 更新履歴` 追記は意図的に省略 (累計整理優先) |

> **CI による自動チェック**: [.github/workflows/version-check.yml](.github/workflows/version-check.yml) が `manifest.json` と `VERSION.txt` の差異を検出します。整合性を必ず保ってください。

### 4. PR 提出

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

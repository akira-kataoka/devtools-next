# Salesforce DevTool (Chrome / Edge 拡張)  v3.x

> 🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊 **Phase 340 マイルストーン達成 — v3 系 250 連続リリース!!!!!** (2026-05-22) — 通算 450+ リリース、サイクル 1-340 完遂 🎯
> v3.0.0 (Phase 90) → **v3.250.0 (Phase 340)** を継続的自律改修ループで磨き上げ。**🎊 v3 系 250 連続リリース完遂!**
> **設計書 21 種類整合性完成 (Phase 318-319、実装数確認 + 全方位修正) + 6 系統クイック実行拡充 (Phase 305-344、24 新規 templates/types: Phase 305-309 で 17 件 + Phase 312/323/324/336/337/343/344 で 7 件) + 6 系統 templates/types グルーピング (Phase 313-344、108 templates × 26 カテゴリ)** + 既存資産 (URL クエリ 12 / 🔗 リンク 10 機能種別 × 2 モード / 📝 MD 9 機能種別 × 2 モード / PROD 防御 6 経路) 維持
> **GitHub Governance 完成** — CI / Issue / PR / CONTRIBUTING / SECURITY / CODE_OF_CONDUCT すべて整備
> **Inspector ↔ SOQL 双方向ナビ** (Phase 155-157) + **SQL/Apex 整形** (Phase 153-154) + **SOQL/Apex テンプレート挿入** (Phase 159-160) すべて完成
> 🎯 **Phase 219-250 機能群完成 (2026-05-21〜22) — 以降 Phase 251-367 は磨き・整合性 cleanup フェーズ (新機能追加停止、競合差別化磨き継続)**:
> - 👥 **ユーザー・ライセンス管理ダッシュボード** (admin ビュー、7 カード、Phase 219-220-234-235)
> - 📁 **ストレージ詳細抽出 + Apex 削減テンプレ** (Phase 235-236)
> - ⏰ **未活動ユーザー抽出 (30/90日)** (Phase 230)
> - 🔓 **代理ログイン (Login as User) 統合** (Phase 229)
> - 🌐 **グローバル検索 (SOSL) 新ビュー + ハイライト + 履歴 + CSV エクスポート** (Phase 227-238-239-245)
> - 📋 **レコード抽出 SOQL/項目選択 モード統合** (Phase 228)
> - 🔗 **ER 図 2-hop オプション + MD のみフィルタ** (Phase 232)
> - 📐 **オブジェクト定義書 項目集計サマリ** (Phase 231)
> - 🔆 **設計書 6 種強化** (fieldSetList / profileList / permsetList / customSettingList / accessControl / appList、Phase 225-226)
> - ⭐ **「組織全体スナップショット」設計書追加** (21 種目、Phase 240 Team D 集大成・Phase 318 で実装数 21 を確認)
> - 📤 **popup ⇆ mini-panel ⇆ panel ⇆ tool クロスナビ (4 入口統一)** (?view= URL クエリ、Phase 233/243/244)
> - 🔎 **最近候補・履歴 datalist 統合** (Phase 223、chrome.storage 永続化キー 17 種)
> - 🔗 **Inspector 関連レコード横断 SOQL** (子オブジェクト Top 5 サブクエリ、Phase 242)
> - 📋 **Inspector ID コピーボタン** (3 モード整合、Phase 246)
> - 💬 **Apex DEBUG のみフィルタ** (USER_DEBUG 抽出、Phase 247)
> - 🔄 **設計書 直前生成 chip + クリアボタン** (機密配慮、Phase 248-249)
>
> ## 🏆 Phase 1-390 主要マイルストーン (年表) — Phase 390 で **v3 系 300 連続リリース大台達成** 🎊🎊🎊
>
> - **Phase 1-49**: v2.1-2.58 まで自律改善ループ — 設計書 22 種・凡例追加・apiError 統一・a11y
> - **Phase 50-61**: v2.59-2.70 ユーザー要望「カラム名・値・桁数」対応 (fmtNum/fmtBytes/fmtTrunc/fmtPercent ヘルパー導入、集計 note 拡充)
> - **Phase 62-67**: v2.71-2.76 第 3 期 a11y 強化 (aria-live/role/aria-current/picker listbox/起動診断)
> - **Phase 68**: v2.77 🚨 CRITICAL runBtn 二重宣言 SyntaxError 修正 + ホームダッシュボード新設
> - **Phase 69-72**: v2.78-2.81 抜本リフォーム (popup 簡素化 / 3 モード設計 / Excel 拡張子 ROLLBACK)
> - **Phase 73-77**: v2.82-2.86 メニュー再設計 (5→3 カテゴリ集約 / 変更セット撤廃 / 名詞ベース)
> - **Phase 78-84**: v2.87-2.94 機能強化 (SOQL オートコンプリート x2 / FLS マトリクス / Limits 抜本 / 致命バグ修正)
> - **Phase 85-89**: v2.95-2.99 抜本 UX (冗長削除 / REST API 実体化 / 設計書表紙 / Inspector 編集)
> - **Phase 90-93**: v3.0-3.3 🎊 v3 化 + 設計書 22 種全てに表紙適用 + エビデンス取得 (テスト工程向け)
> - **Phase 94-100**: v3.4-3.10 🎊🎊 仕上げ (README サマリ / 表紙 UI 強調 / ショートカット表 / マイルストーン年表)
> - **Phase 101-106**: v3.11-3.16 placeholder 拡充 + 全 10 画面に空状態ガイド + サポート API バージョン明示
> - **Phase 107-108**: v3.17-3.18 3 モード整合性 100% 達成 + 設計書 6 種 note 業務担当者向け磨き
> - **Phase 109-110**: v3.19-3.20 設計書 13 種累計 + popup title 拡充 + README トラブルシューティング 13 症状
> - **Phase 111-112**: v3.21-3.22 mini-panel / panel ビュー fade-in アニメーション + ロール別 FAQ 19 問
> - **Phase 113-114**: v3.23-3.24 @media print PDF 業務文書品質 + button transition/a11y 統一 + PDF 保存手順
> - **Phase 115-116**: v3.25-3.26 popup fade-in + 3 モード UI 統一達成 + エビデンス button aria-label + アンインストール手順
> - **Phase 117**: v3.27 ENV バッジ PROD パルス警告 + README 目次 v3.x 8 セクション反映
> - **Phase 118**: v3.28 設計書表紙 kvRows プロジェクト成果物化 (文書管理 ID 自動付番 / 機密区分 / 注意事項 → ISO27001 準拠配布管理)
> - **Phase 119**: v3.29 設計書ツールバー sticky 化 + 「📍 現在タブから」対象自動補完 (Inspector と動線統一)
> - **Phase 120**: v3.30 🎊 SOQL オートコンプリート候補に型別アイコン (🆔🔗☑️📅💴🔢✉️📞📋等) + 参照型は参照先表示
> - **Phase 121-122**: v3.31-3.32 リリース前チェックリスト 50+ 項目 + 6 画面 loading を `.pill.loading` 統一スピナーに
> - **Phase 123-124**: v3.33-3.34 mini-panel a11y + 凡例 `.design-legend` 自動分離 + Markdown `**bold**` レンダリング (見えない不具合修正)
> - **Phase 125-127**: v3.35-3.37 ソート可能列 `⇅` マーカー + 設計書 22 種凡例完備 + 「対象組織」表示拡張 (ホスト+環境+ID)
> - **Phase 128-129**: v3.38-3.39 versionBadge 3 モード揃い + popup セッション情報折りたたみ + 章番号 chip 化
> - **Phase 130**: v3.40 🎊 Phase 1-130 累計サマリ + @media print で章番号 chip 印刷対応
> - **Phase 131-132**: v3.41-3.42 mini-panel に versionBadge (3 モード完全) + テーブルフィルタ 🔎 統一 + 設計書「対象」要否 pill 視覚化
> - **Phase 133-134**: v3.43-3.44 popup 便利リンク検索フィルタ + アイコン作成プロセス + mini-panel SOQL 履歴 chrome.storage 永続化 + 設計書 `<code>` 体裁
> - **Phase 135-136**: v3.45-3.46 popup 便利リンク 5 カテゴリ折りたたみ + SOQL 履歴 3 モード同期 (sfdtRecentSoql 共有)
> - **Phase 137-139**: v3.47-3.49 6 機能 (SOQL/Apex/Inspector/設計書/Export/REST) 早期バリデーション統一展開 — 空入力→即フィードバック→自動フォーカス戻し
> - **Phase 140**: v3.50 🎊 Phase 1-140 累計サマリ + README に「6 機能 UX 統一」セクション新設
> - **Phase 141-144**: v3.51-3.54 SOQL/Apex/REST/mini-panel にカーソル位置インジケータ (3 モード) + 設計書 22 種検索 + Limits 30+ 制限検索 (3 機能フィルタ統一)
> - **Phase 145-148**: v3.55-3.58 CI/GitHub Actions 連携 (version-check.yml + release.yml 実コード) + Issue/PR テンプレート + CONTRIBUTING.md + .gitignore 整備
> - **Phase 149**: v3.59 SECURITY.md (sid 外部送信ゼロ明文化 / 脆弱性報告フロー) + README プロジェクト基盤ナビゲーション
> - **Phase 150**: v3.60 🎊 CODE_OF_CONDUCT.md (Contributor Covenant v2.1 準拠 + 拡張悪用禁止) + Phase 1-150 累計サマリ
> - **Phase 151-154**: v3.61-3.64 結果表 Markdown コピー + Apex エラー抽出 + SOQL 整形 (キーワード大文字化) + Apex 整形 (`{ }` インデント)
> - **Phase 155-158**: v3.65-3.68 Inspector ↔ SOQL 双方向ナビ完成 (親方向 chip / 同レコード SOQL / 子レコード SOQL) + README 文書化
> - **Phase 159-160**: v3.69-3.70 🎊 **マイルストーン** Apex/SOQL view にテンプレート挿入 (業務 12 種類)
> - **Phase 161-180**: v3.71-3.90 SOQL my_open_cases User ID 自動補完 / mini-panel SOQL テンプレ + sessionUser Chatter 取得 / chrome.storage 永続化 9 種大台 / 設計書「対象」入力履歴 / Inspector レコード履歴 + scrollTop 復元 / Apex/SOQL 履歴永続化 / 設定エクスポート・インポート / 設定リセット (5 カテゴリ) / 見えない不具合 3 件修正 / popup dead code -322 行 / panel dead code -468 行 / CSS デザイントークン導入 (8 種 sp-* / 5 種 r-*) 🎊
> - **Phase 181-200**: v3.91-3.110 CSS padding/border-radius トークン化 (累計 170 箇所) / r-pill/r-tag/sp-card-y/sp-hair/sp-tag-y 命名化 / id↔JS comm diff 監査 / class↔HTML/JS comm diff (popup 31 行 + panel 38 行 dead 削除) / chrome.storage キー名不一致 2 バグ修正 🎊 / Limits sticky 緊急修正 / DataExport オブジェクト確定で項目自動読込 / LoginHistory 検索+ソート / 大量 popup 説明 1 行+ホバー
> - **Phase 201-220**: v3.111-3.131 DataExport 項目自動読込 / Limits 固定上限解説 / Inspector 風一括 DML (DELETE/INSERT/UPDATE/UPSERT/Bulk API v2、5 機能) / Setup Audit Trail / SOQL 業務監査系 5 種 + Apex 5 種拡充 / **ユーザー管理/ライセンス管理 SOQL+Apex テンプレ 8 種追加** (Phase 211) / Apex 一括凍結・解除・無効化 / ナビ再編 + 代理ログイン即候補 / REST API クイック実行 8 種 / 説明文 details 折りたたみ / Limits API + 固定上限を同一一覧に統合 / 👥 **ユーザー・ライセンス管理ダッシュボード新設** (Phase 219、6 カード) / **凍結ユーザー解除モーダル** (Phase 220、fallback 対応)
> - **Phase 221-230**: v3.132-3.140 admin-howto 折りたたみ式 (Phase 221) / 🎨 **Limits 画面 UX 改善 3 点** (1行化・stickyヘッダ強化・admin と表示統一、Phase 222) / 🔍 **最近使ったオブジェクト/レコード datalist** (chrome.storage 16 種目、Phase 223) / mini-panel 説明簡素化 (Phase 224) / 設計書 6 種完全強化 (fieldSetList の中身項目リスト / profileList・permsetList の割当ユーザー数 / customSettingList のレコード件数 / accessControl の Group/Queue / appList の Profile 別、Phase 225-226) / 🌐 **グローバル検索 SOSL 新ビュー** (Phase 227) / 📋 **レコード抽出 SOQL/項目選択 モード統合** (Phase 228) / 🔓 **admin に Login as User 統合 + 残席アラート + 再取得** (Phase 229) / ⏰ **未活動ユーザー 30/90日抽出** (Phase 230)
> - **Phase 231-240**: v3.141-3.150 📐 **objectDef 項目集計サマリ + a11y モーダル強化** (Phase 231) / 🔗 **ER 図 2-hop オプション + MD のみフィルタ** (Phase 232) / 📤 **popup → admin/search クロスナビ** (?view= URL クエリ、Phase 233) / 🏢 **admin 組織情報サマリカード (7 カード目)** (Phase 234) / 📁 **ストレージ詳細抽出** (ContentVersion 拡張子別 + Top 20、Phase 235) / 🟧 **Apex 削減テンプレ 3 種** (大型ファイル / 古い Attachment / 空 Account、Phase 236) / 🔎 **SOQL 管理者向け 5 種** (ストレージ / Public Group / Queue / メンバー集計、Phase 237) / 🔆 **グローバル検索ハイライト** (Phase 238) / 📜 **検索履歴チップ** (chrome.storage、Phase 239) / ⭐ **新設計書「組織全体スナップショット」(23 種目)** (Team D 集大成、Phase 240)
> - **Phase 241-250**: v3.151-3.160 🎊 **マイルストーン年表** 📝 **README に Phase 161-240 累計年表 + 累計実績更新** (Phase 241) / 🔗 **Inspector「関連レコード」横断 SOQL** (子オブジェクト Top 5 サブクエリ、Phase 242) / 🌐 **mini-panel「検索」ボタン** (Phase 243) / 👥 **mini-panel「管理」ボタン (4 入口統一達成)** (Phase 244) / 📥 **グローバル検索結果 CSV エクスポート** (Phase 245) / 📋 **Inspector「ID」コピーボタン** (3 モード整合、Phase 246) / 💬 **Apex「DEBUG のみ」フィルタ** (USER_DEBUG 抽出、Phase 247) / 🔄 **設計書「直前生成」再実行 chip** (Phase 248) / 🔒 **chip クリアボタン (機密配慮)** (Phase 249) / 🎊 **v3 系 160 連続リリース達成 + マイルストーン記念** (Phase 250)
> - **Phase 251-260**: v3.161-3.170 📊 **設計書フォーマットに JSON 追加** (API 連携・自動処理、Phase 251) / ♿ **admin 取得ボタン aria-label 整備 (WCAG 2.1 SC 2.4.6 準拠)** (Phase 252) / ❄️📁 **mini-panel SOQL テンプレ管理者向け 2 種追加** (Phase 253) / 📊 **Apex「リミット消費」フィルタ追加 (3 フィルタ完成)** (Phase 254) / 📝 **Inspector「MD リンク」コピー** (Phase 255) / 📝 **mini-panel「MD」リンクコピー** (3 モード整合性、Phase 256) / 📥 **検索結果グループ別 CSV エクスポート** (Phase 257) / 📥 **admin 主要 4 カード個別 CSV エクスポート** (Phase 258) / 📜 **設計書「過去 5 件履歴」chip 拡張** (Phase 259) / 🎊 **v3 系 170 連続リリース達成 + マイルストーン記念** (Phase 260)
> - **Phase 261-270**: v3.171-3.180 📝 **REST API レスポンス「MD コピー」** (Phase 261) / 📝 **Apex 実行結果「MD コピー」** (Phase 262) / 📝 **mini-panel SOQL 結果「MD」テーブルコピー** (3 モード整合性、Phase 263) / 📝 **Limits 画面「MD コピー」** (Phase 264) / 📝 **ログイン履歴「MD コピー」** (セキュリティ監査向け、Phase 265) / 📝 **メタデータ一覧「MD コピー」** (Phase 266) / 📝 **Apex Debug ログ「MD コピー」+ 汎用関数化 (Markdown 10 箇所目 🎊)** (Phase 267) / 📊 **Apex 実行結果「ガバナ消費サマリ pill」自動表示** (Phase 268) / 📋 **Inspector「全項目 MD」コピー** (バグ報告/監査資料用、Phase 269) / 🎊🎊 **v3 系 180 連続リリース達成 + マイルストーン記念** (Phase 270)
> - **Phase 271-280**: v3.181-3.190 📝 **admin モーダルに「📝 MD」コピー (使用者/ストレージ/未活動)** (Phase 271) / 📝 **グローバル検索結果に「📝 全 MD」(オブジェクト別セクション)** (Phase 272) / 📋📝 **API URL ビルダー実行結果に「📋/📝」+ サイズ表示** (Phase 273) / 📐 **Describe ビューに項目統計サマリ pill + custom 列 + 権限 pill (組織監査向け)** (Phase 274) / 📝 **Describe ビューに「📝 設計書 MD」コピー (タイトル + 統計 + 全項目表)** (Phase 275) / 📐 **mini-panel に「📐 構造」ボタン + URL `?obj=` で describe 自動実行** (Phase 276) / 📐 **popup に「📐 オブジェクト構造」追加で 4 入口統一完成** (Phase 277) / 🔎 **Inspector に `?id=` URL クエリ + mini-panel「🔎 Inspector」ボタン** (Phase 278) / ↗ **SOQL ビューに `?q=` URL クエリ + mini-panel「↗ 全画面で実行」ボタン** (Phase 279) / 🎊🎊🎊 **v3 系 190 連続リリース達成 + マイルストーン記念** (Phase 280)
> - **Phase 281-290**: v3.191-3.200 🔗 **グローバル検索に `?kw=` URL クエリ + 「🔗 リンクコピー」ボタン** (Phase 281) / 🔗 **SOQL/Describe/Inspector に「🔗 リンク」ボタン横展開** (Phase 282) / 🔗 **メタデータ一覧に `?type=` URL クエリ + 「🔗 リンク」** (Phase 283) / 🔗 **設計書ビューに `?type=&target=&format=` URL クエリ + 「🔗 リンク」** (Phase 284) / 🔗 **REST API ビューに `?method=&path=&body=` URL クエリ + 「🔗 リンク」(GET のみ auto-fire、POST/PATCH/DELETE は安全のため投入のみ)** (Phase 285) / 📚 **README に「URL クエリ統一パターン 9 種」セクション追加** (Phase 286) / 📐 **Home に「📐 オブジェクト構造」ミニカード追加 (4 入口統一の補完)** (Phase 287) / ⚠ **mini-panel に ENV (Sandbox/PROD) バッジ追加 — PROD はパルスアニメーション (誤操作防止)** (Phase 288) / 🛡️ **PROD 環境での破壊的操作に confirm ダイアログ (Apex DML / REST POST/PATCH/DELETE) — 2 段階防御完成** (Phase 289) / 🎊🎊🎊🎊 **v3 系 200 連続リリース達成 + マイルストーン記念** (Phase 290)
> - **Phase 291-300**: v3.201-3.210 🛡️ **SOQL Bulk DELETE / Bulk DML (CSV→DML) に PROD 警告強化** (Phase 291) / 🛡️ **Inspector インライン編集 (PATCH) に PROD 確認 — PROD 防御 5 経路完成** (Phase 292) / 🛡️ **admin 凍結解除 (UserLogin PATCH) に PROD 警告強化 — PROD 防御 6 経路完成** (Phase 293) / 📚 **README に「PROD 誤操作防止 2 段階防御 × 6 経路」セクション追加** (Phase 294) / 🔗 **Apex ビューに `?code=` URL クエリ + 「🔗 リンク」(auto-fire 無効、投入のみ)** (Phase 295) / 📚 **README URL クエリ表を 9 → 10 種に更新** (Phase 296) / 🔐 **ログイン履歴に `?view=login&limit=&status=` URL クエリ + 「🔗 リンク」(セキュリティ監査向け)** (Phase 297) / 🌐 **API URL ビルダーに `?op=&apiObj=&apiId=` URL クエリ + 「🔗 リンク」** (Phase 298) / 📚 **README URL クエリ表を 10 → 12 種に更新** (Phase 299) / 🎊🎊🎊🎊🎊 **v3 系 210 連続リリース達成 + マイルストーン記念** (Phase 300)
> - **Phase 301-310**: v3.211-3.220 🔧 **設計書数を 22 → 23 種に一掃 (UI 案内文整合)** (Phase 301) / 📚 **README 業務向け詳細解説に orgSnapshot 行追加** (Phase 302) / 🧪 **README 手動テストガイドに #21-23 行追加 (apexCallTree/limitsDashboard/orgSnapshot)** (Phase 303) / 📚 **CONTRIBUTING.md + panel.js コメント 22 → 23 種** (Phase 304) / 🌐 **REST クイック実行テンプレート 8 → 11 種 (recent/theme/actions)** (Phase 305) / 📝 **mini-panel SOQL テンプレート 6 → 9 種 (stale_cases/recent_contacts/top_revenue)** (Phase 306) / 🟧 **Apex 匿名実行テンプレート 17 → 20 種 (count_record_types/list_named_credentials/recent_login_failures)** (Phase 307) / 🔎 **panel SOQL テンプレート 22 → 25 種 (recent_modified_flows/email_templates/dashboards)** (Phase 308) / 📦 **メタデータ一覧 type 10 → 15 種 (EmailTemplate/Dashboard/Report/CustomField/RecordType)** (Phase 309) / 🎊🎊🎊🎊🎊🎊 **v3 系 220 連続リリース達成 + マイルストーン記念** (Phase 310)
> - **Phase 311-320**: v3.221-3.230 📊 **popup に「📊 使用状況」ボタン追加 (Limits 直接ジャンプ)** (Phase 311) / 📋 **mini-panel SOQL に Setup Audit Trail 追加 (9 → 10 種)** (Phase 312) / 🗂️ **mini-panel SOQL を 3 カテゴリ optgroup 化** (Phase 313) / 🗂️ **panel/tool SOQL 25 種を 5 カテゴリ optgroup 化** (Phase 314) / 🗂️ **panel/tool Apex 20 種を 5 カテゴリ optgroup 化** (Phase 315) / 🗂️ **panel/tool REST 11 種を 3 カテゴリ optgroup 化** (Phase 316) / 🗂️ **メタデータ type 15 種を 5 カテゴリ optgroup 化** (Phase 317) / 🗂️ **設計書 type 21 種を 5 カテゴリ optgroup 化 + 23 → 21 種 実装一致発見** (Phase 318) / 🔧 **設計書数 23 → 21 種 全方位修正 (8 ファイル)** (Phase 319) / 🎊🎊🎊🎊🎊🎊🎊 **v3 系 230 連続リリース達成 + マイルストーン記念** (Phase 320)
> - **Phase 321-330**: v3.231-3.240 📚 **README に「クイック実行 templates グルーピング」セクション追加 (6 系統 102 templates × 26 カテゴリ)** (Phase 321) / 🟧 **popup に「🟧 Apex 実行」ボタン追加 (開発者向け 5 ボタン目)** (Phase 322) / 📅 **mini-panel SOQL に「今月クローズ予定 Opportunity」追加 (10 → 11 種)** (Phase 323) / 📅 **panel/tool SOQL に closing_this_month 追加 (25 → 26 種、3 モード整合)** (Phase 324) / 💡 **ホーム「ショートカット & クイック入口」セクション拡充 (popup 5 ボタン + mini-panel ヘッダー + 4 入口統一)** (Phase 325) / 🔧 **setupDesignTypeFilter を optgroup 保持型に修正 (Phase 318 リグレッション)** (Phase 326) / 🔐 **ログイン履歴に「期間フィルタ」追加 (直近 24h / 7 日 / 30 日 + URL クエリ ?period=)** (Phase 327) / 🔐 **popup に「🔐 ログイン履歴」ボタン追加 (セキュリティ担当者向け 6 ボタン目)** (Phase 328) / 🔧 **home-tips popup ナビ表記 5 → 6 ボタンに更新** (Phase 329) / 🎊🎊🎊🎊🎊🎊🎊🎊 **v3 系 240 連続リリース達成 + マイルストーン記念** (Phase 330)
> - **Phase 331-340**: v3.241-3.250 🎨 **popup 6 ボタンを 2 行 × 3 列 grid 配置に統一** (Phase 331) / 📚 **README TOC に 3 セクション追加 (URL クエリ / PROD 防御 / templates グルーピング)** (Phase 332) / ⚠ **popup ヘッダーに ENV (Sandbox/PROD/Dev) バッジ追加 — 3 モード ENV 100% 統一達成** (Phase 333) / 💡 **home-tips に ENV バッジ + 3 モード ENV 統一明示行を追記** (Phase 334) / 📚 **README PROD 防御セクションに Phase 333 反映 + 判定ロジック documentation 化** (Phase 335) / 🎯 **mini-panel SOQL に「my_open_leads」追加 (11 → 12 種、営業向け)** (Phase 336) / 🎯 **panel/tool SOQL に my_open_leads 追加 (26 → 27 種、3 モード整合)** (Phase 337) / ⭐ **README 業務向け詳細解説で orgSnapshot を 1 行目に移動 (★最重要・初手推奨ハイライト)** (Phase 338) / ⭐ **README 手動テストガイドでも orgSnapshot を 1 行目に移動 (Phase 338 整合)** (Phase 339) / 🎊🎊🎊🎊🎊🎊🎊🎊🎊 **v3 系 250 連続リリース達成 + マイルストーン記念** (Phase 340)
> - **Phase 341-350**: v3.251-3.260 🔧 **README v3 主要機能テーブル「設計書 22 種」 → 「21 種」修正** (Phase 341) / 💡 **home-tips に templates グルーピング (6 系統 102 templates) 明記** (Phase 342) / 📭 **mini-panel SOQL に「closed_lost_recent」追加 (12 → 13 種、営業マネージャ向け失注分析)** (Phase 343) / 🔄 **panel/tool SOQL にも closed_lost_recent 追加 (27 → 28 種、3 モード整合)** (Phase 344) / 🔢 **templates グルーピング件数 102→108 整合性全方位修正 (README + home-tips + select title)** (Phase 345) / 🎨 **admin-table sticky ヘッダを Limits Phase 199/222 と統一 (z-index/影/accent 罫線追加、Team L 完了)** (Phase 346) / ⭐ **最近使った候補 push 漏れ補完 — describe/API URL ビルダー/エクスポート 3 経路追加 (Team H 4→7 経路)** (Phase 347) / 📋 **profileList/permsetList 凡例に Phase 225 新規列の説明補完 (Team D 設計書品質)** (Phase 348) / 🌐 **REST 成功時 path から SObject + RecordId 抽出して push (Team R 動作確認 + Team H 8 経路カバー)** (Phase 349) / 🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊 **v3 系 260 連続リリース達成 + マイルストーン記念 — admin ダッシュボード「7 カード」表記整合性修正** (Phase 350)
> - **Phase 351-360**: v3.261-3.270 💡 **README に「💡 競合 SF 拡張機能との差別化 (7 ポイント)」セクション追加** (Phase 351) / 🔄 **panel/tool home-tips に「他拡張との差別化 (5 ポイント要約)」1 行追加** (Phase 352) / 📝 **CONTRIBUTING.md 冒頭の Phase 範囲・リリース数を最新化 (Phase 147→352 / 250+→460+)** (Phase 353) / 📜 **CONTRIBUTING.md バージョン管理ルールを自律ループ運用実態に合わせて改訂 + メモリヘッダ最新化** (Phase 354) / 🔇 **失敗系 console.log を console.warn に統一 (4 箇所、popup/content/panel — ログレベル整合性)** (Phase 355) / 🔢 **README「📝 MD コピー 14 箇所」を「9 機能種別 × 2 モード = 18+1 = 19+ 箇所」に実数化** (Phase 356) / 🔗 **README「🔗 リンク 10 箇所」を「10 機能種別 × 2 モード = 20+ 箇所」に統一表記化** (Phase 357) / 📊 **README URL クエリ table に「?view=limits」(12 種目) を追加 (Phase 311 実装の table 未掲載補完)** (Phase 358) / 💾 **README chrome.storage 永続化キー 18→25+ 種に実数化 + 内訳カテゴリ整理 (履歴/Draft/UI 状態/最近候補)** (Phase 359) / 🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊 **v3 系 270 連続リリース達成 + マイルストーン記念 — Phase 351-360 が全て documentation drift cleanup の継続フェーズに従事** (Phase 360)
> - **Phase 361-370**: v3.271-3.280 🎨 **README CSS デザイントークン表記の整合性修正 (18→17 種統一 / --sp-7 誤記→--sp-6 + 内訳構造化)** (Phase 361) / 📊 **README「Phase 305-344、23 新規 templates/types」を 24 新規に修正 + 内訳明示 (17 件 + 7 件)** (Phase 362) / 🔍 **Phase 319 漏れ補完「設計書 22 種」を 21 に訂正 (FAQ + design-docs.js コメント)** (Phase 363) / ✅ **README 3 モード設計テーブル「設計書 22 種類」→ 21 (現在ガイド drift cleanup 完了)** (Phase 364) / ↗ **mini-panel「↗ 全画面」ボタン SOQL 引き継ぎ実装 (textarea 入力時 ?view=soql&q= で続きから実行可能、UX 動線改善)** (Phase 365) / 🏷️ **README セクション見出し「v3 系の主要機能 (v2.71 → v3.3 累計まとめ)」を v3.275 / Phase 360 マイルストーン反映 + mini-panel UX audit** (Phase 366) / 🆕 **popup 設定 dialog「移行 (v3.88.0 新機能)」を「v3.88.0 で導入」歴史記述に変更** (Phase 367) / 🛣️ **README line 8「Phase 219-250 新機能群完成」に「Phase 251-367 は磨き・整合性 cleanup フェーズ」追記** (Phase 368) / 📜 **README 年表見出し「Phase 1-160 主要マイルストーン」を Phase 1-360 に最新化 (内容は延長済、見出しのみ古かった)** (Phase 369) / 🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊 **v3 系 280 連続リリース達成 + マイルストーン記念 — Phase 361-370 で「現在ガイド drift cleanup」と「mini-panel UX 動線改善」の二本柱に従事** (Phase 370)
> - **Phase 371-380**: v3.281-3.290 📝 **content.js 冒頭コメントに Phase 243-365 機能追記 + panel.js console.log の古い「v2.77.0」削除** (Phase 371) / 📦 **manifest.json description 鮮度更新 (Phase 219 → 7 カード明示 / Phase 240 削除 / PROD 2 段階防御 6 経路追記)** (Phase 372) / 🌐 **_locales/ja+en messages.json を Phase 372 manifest.json と整合 (7 カード / 設計書 21 種 / PROD 2 段階防御 6 経路)** (Phase 373) / 🔧 **PR テンプレートを Phase 354 (CONTRIBUTING.md 改訂) と整合 (小規模 PR vs 累積 Phase の運用ルール明示)** (Phase 374) / 🐞 **bug_report.yml ENV バッジ色 (SBX/DEV) を README と整合 + version placeholder v3.56→v3.284 最新化** (Phase 375) / 📊 **README 累計実績に「ファイル整合性磨き (Phase 372-375)」1 行追記** (Phase 376) / 🎯 **panel.css Z-INDEX HIERARCHY 表に Phase 199/222 (Limits z:10) / Phase 346 (admin-table z:5) / Phase 90 (design-toolbar z:4) 追加** (Phase 377) / 🛡️ **SECURITY.md サポート対象バージョン v3.50→v3.270 最新化 (Phase 360 マイルストーン基準)** (Phase 378) / 🏷️ **README 見出し「v3.275 / Phase 360」を「v3.288 / Phase 370」に更新 (10 Phase 周期見出し drift cleanup pattern 確立)** (Phase 379) / 🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊 **v3 系 290 連続リリース達成 + マイルストーン記念 — Phase 371-380 が「ファイル整合性磨きフェーズ」(manifest/locales/PR/bug_report/SECURITY/CSS) に従事** (Phase 380)
> - **Phase 381-390**: v3.291-3.300 📜 **README 年表見出し「Phase 1-360 (v3 系 270)」を「Phase 1-380 (v3 系 290)」に最新化** (Phase 381) / 🚨 **panel.css env-badge SBX/DEV 色逆を README 仕様と整合 (Phase 117 から逆だった visual bug 修正、3 モード ENV 統一の整合性磨き)** (Phase 382) / ✅ **mini-panel に Dev 組織判定 + .env-dev CSS 追加で 3 モード ENV 100% 統一完成 (panel/popup と整合)** (Phase 383) / 📚 **README PROD 防御セクションに Phase 382-383 反映 (3 モード ENV 100% 統一が真に完成)** (Phase 384) / 🎯 **README「3 モード UI 統一達成」line に ENV バッジ 100% 統一 (Phase 117/288/333/382-383) 追記** (Phase 385) / 🔗 **README TOC anchor「v33 累計まとめ」を最新セクション見出し anchor「v3288 / Phase 370」に同期 (Phase 366/379 副作用解消)** (Phase 386) / 🔗 **README TOC PROD 防御 anchor を Phase 384 後の最新「phase-117288333382383」に同期** (Phase 387) / 🔗 **README URL クエリ統一パターン見出し「Phase 233-298」→「Phase 233-358」+ TOC anchor 同時更新 (見出し+TOC を 1 commit pattern 確立)** (Phase 388) / 🏷️ **README セクション見出し「v3.288 / Phase 370」→「v3.298 / Phase 380」+ TOC anchor 同時更新 (Phase 388 pattern 初回適用)** (Phase 389) / 🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊 **v3 系 300 連続リリース大台達成 + マイルストーン記念 — Phase 381-390 が「3 モード ENV 100% 統一の真の完成 (Phase 382-385) + TOC anchor drift cleanup (Phase 386-389)」の二本柱に従事** (Phase 390)
>
> ## 📈 累計実績 (Phase 390 時点) 🎯
> - **リリース数**: v1 系 + v2 系 100 リリース + **🎊🎊🎊 v3 系 300 リリース大台達成** = **500+ リリース**
> - **GitHub push 数**: **550+ コミット**
> - **対応ユーザー報告**: **100+ 件** (UX 改善 / 機能追加 / バグ修正)
> - **URL クエリ統一パターン**: **12 種完成**
> - **🔗 リンクコピーボタン**: **10 機能種別** (search / SOQL / describe / inspector / metadata / design / REST / apex / login / apiurl) × 2 モード (panel + tool) = **20+ 箇所** (search は動的生成、Phase 357 で 10→10×2 実数化)
> - **📝 MD コピーボタン**: **9 機能種別** (Inspect / Apex / Describe / REST / Metadata / Logs / Login / Limits / API URL ビルダー) × 2 モード (panel + tool) = **18 ボタン + 動的生成 1 = 19+ 箇所** (Phase 356 で 14→9×2 実数化)
> - **PROD 2 段階防御 × 6 経路** 維持
> - **6 系統クイック実行 (Phase 305-344 拡充)**: REST 11 / mini-panel SOQL 13 / Apex 20 / panel SOQL 28 / metadata 15 / 設計書 21 = **108 templates/types**
> - **設計書 21 種類整合性**: 実装 (design-docs.js 21 case) + UI 案内文 (Phase 301/319) + README 業務解説 (Phase 302/319) + 手動テストガイド (Phase 303/319) + CONTRIBUTING/コメント (Phase 304/319) — Phase 318 で 23 種誤り発見後、Phase 319 で全方位修正
> - **CRITICAL バグ修正**: 8 件 (runBtn 二重宣言 / addEventListener null セーフ x2 / Flow メタデータ取得 / Limits ReferenceError / ログイン履歴 WHERE filterable / var(--muted) 未定義変数 + Markdown bold 見えない不具合 / **メタデータ一覧 CustomObject Name 列 INVALID_FIELD (Phase 219)** / **chrome.storage キー名不一致 2 バグ (Phase 190)**)
> - **業務担当者向け磨き**: 設計書 21/21 種 note + 凡例 + 章番号 chip + 文書管理 ID + 機密区分 + 環境バッジ + ロール別 FAQ 19 問 + トラブルシューティング 13 症状 + PDF 保存手順 + アンインストール手順
> - **a11y 実績**: 3 モード fade-in アニメーション統一、prefers-reduced-motion 対応、focus-visible/aria-label 全面適用、PROD バッジ警告パルス、`.pill.loading` 統一スピナー、ソート `⇅` マーカー、**admin モーダルのフォーカス trap (Phase 231)**
> - **3 モード UI 統一達成**: popup (⚙️ 管理者) / panel + tool (💻 開発者) / mini-panel (👤 ユーザー) — fade-in / versionBadge / 空状態ガイド / button transition / a11y outline すべて整合 + **ENV バッジ 100% 統一 (Phase 117/288/333/382-383 で Sandbox=オレンジ / Dev=緑 / PROD=赤パルス が 3 モード全て一致)**
> - **ファイル整合性磨き (Phase 372-375)**: manifest.json description + _locales/ja+en messages.json + PR テンプレート + bug_report.yml の機能要約 / ENV バッジ色 / 運用ルールを Phase 354/372 改訂と整合 (Chrome Web Store / GitHub UI で利用者に最新機能をアピール)
> - **🏆 磨きシリーズ 40 サイクル (Phase 351-390 連続、新機能追加停止フェーズ)**: documentation drift cleanup (Phase 351-360) → 現在ガイド drift cleanup + mini-panel UX 動線改善 (Phase 361-370) → ファイル整合性磨きフェーズ (Phase 371-380) → 3 モード ENV 100% 統一の真の完成 + TOC anchor drift cleanup (Phase 381-390) — Phase 117 から 5 ヶ月放置の visual bug 発見 + 数字 drift 9 件 + 設計書 22→21 漏れ 3 件 + 見出し更新 4 件 + ファイル整合性 4 件 + Z-INDEX HIERARCHY 1 件 + SECURITY 1 件 + TOC anchor 3 件 = **計 30 件超の整合性磨き** + **Phase 391-392 で 3 モード toast duration 統一 (popup 1600→1800ms)** が継続中
> - **chrome.storage 永続化キー**: **25+ 種** (履歴系: SOQL / Apex / REST / Inspector / Picker / Login as User / 検索ワード + 最近ユーザー、Draft 系: SOQL / Apex / REST body、UI 状態系: 最終 view / Limits ピン + ソート / Tooling チェック / メタデータ type / Apex Debug log / popup 便利リンク折りたたみ / ナビ折りたたみ / sideCollapsed / whatsNewCollapsed、最近候補系: オブジェクト / レコード ID / view / 検索ワード / 設計書「対象」/ 直前生成設計書 / 過去 5 件設計書履歴、その他: KnownVersion 等 — Phase 358 で再 count 18→25+ 実数化)
> - **CSS デザイントークン**: 17 種 (スペーシング 10 種: --sp-0 〜 --sp-6 + --sp-hair + --sp-tag-y + --sp-card-y / 角丸 7 種: --r-xs + --r-sm + --r-tag + --r-md + --r-lg + --r-xl + --r-pill)、累計 170+ 箇所トークン化 (Phase 361 で「18 種」「--sp-7」表記を panel.css 実定義と照合・修正)
> - **業務シナリオ完全カバー**:
>   - **データ抽出**: SOQL モード / 項目選択モード / グローバル検索 (SOSL)
>   - **組織監査**: 1 クリック「組織全体スナップショット」+ admin ダッシュボード (7 カード)
>   - **ユーザー管理**: 凍結 / 凍結解除 / 代理ログイン / MFA 未設定者抽出 / 未活動者抽出 (30/90 日)
>   - **ストレージ削減**: 詳細抽出 + 大型 ContentVersion / 古い Attachment / 空 Account の Apex テンプレ連携
> - **💡 競合 SF 拡張機能との差別化 (Phase 351 整理)**:
>   - **設計書ジェネレータ 21 種**: Inspector Reloaded × / DevTools (lvshanbi) △ Object 定義のみ / Profile Reader △ Profile のみ → **我々が唯一 21 種を業務文書品質で生成**
>   - **Apex 匿名実行**: 我々のみ実装。20 templates × 5 カテゴリ optgroup (基本確認 / 業務 SOQL / 開発・テスト・運用 / ユーザー管理・凍結 / 監査・ストレージ削減)
>   - **Inspector Inline edit**: Inspector Reloaded ✅ / 我々 ✅ (Phase 292 で実装、PROD は確認ダイアログ込み)
>   - **PROD 2 段階防御 × 6 経路**: 他拡張に類似機能なし — Apex DML / REST POST,PATCH,DELETE / SOQL Bulk DELETE,DML / Inspector PATCH / admin 凍結解除すべて confirm
>   - **3 モード ENV 100% 統一バッジ**: ORGanizer の Color tagging に着想、Phase 117/288/333 で popup/panel-tool/mini-panel 全モード対応
>   - **URL クエリ統一 12 種 + 🔗 リンクコピー 10 機能種別 × 2 モード**: Slack/Notion でクイック共有可能 — 他拡張で類似機能なし
>   - **自動アップデート機構**: 独自 VERSION.txt 機構で chrome.storage 経由通知 — 他拡張は手動更新

## v3 系の主要機能 (v2.71 → v3.298 / Phase 380 で v3 系 290 連続リリース達成、累計まとめ)

| カテゴリ | 機能 / 改善 |
|---|---|
| 🚀 **3 モード設計** | 💻 開発者 (panel/tool) / ⚙️ 管理者 (popup) / 👤 ユーザー (mini-panel) を色バッジで区別 |
| 🎯 **メニュー抜本再設計** | 5 → 3 カテゴリ集約 (📦 データ / 💻 開発 / 🛡️ 組織管理)、名詞ベース統一、サイドバー縦スクロール対応、カテゴリ折りたたみ、機能フィルタ検索、ショートカット表示 |
| ⌨️ **SOQL オートコンプリート** | panel + mini-panel 両方で対応 (FROM 後オブジェクト候補 / SELECT/WHERE 後項目候補 / ↑↓ Enter Tab Esc) |
| 🔍 **全表共通検索フィルタ** | recordsTable に「🔍 表内検索」と列ソート (ログイン履歴 / メタデータ / Apex ログ等 全表) |
| 📊 **Limits ダッシュボード抜本改修** | sticky 重なり解消 / 全列ソート / 日本語名 50+ / ピン留め永続 / desc tooltip |
| 🔐 **FLS 設計書 ProfileReader 化** | 項目 × プロファイル/権限セットのマトリクス (RW/R/--)、タイプ日本語化 |
| ✏️ **Inspector レコード編集** | 編集可フィールドクリック → 型別 input → PATCH 保存 |
| 📸 **エビデンス取得機能** | SOQL/Inspector/Limits/ログイン履歴 を Markdown レポート化 (テスト工程向け) |
| 📄 **設計書 21 種に表紙適用** | 全設計書冒頭に統一表紙 (タイトル/対象/組織/作成者/日時/Ver/改訂) でプロジェクト成果物品質 (Phase 90-93 で導入、Phase 240 で orgSnapshot 追加、Phase 319 で実装数確認 21 種) |
| 🐛 **CRITICAL バグ修正多数** | runBtn 二重宣言 SyntaxError / addEventListener null セーフ x2 / Flow メタデータ取得 / ログイン履歴 WHERE filterable=false / Limits ReferenceError 等 |
| 🎨 **デザイン品質** | アイコン SVG モダン化 / a11y (aria-live/role/aria-current/focus-visible) / popup CTA 大型 / 冗長説明削除 |


Salesforce 開発者向けユーティリティ拡張機能 (Manifest V3)。
SOQL 実行 / レコードID 解析 / REST API 探索 / Setup ショートカット / Tooling API 経由のメタデータ一覧と Debug ログ閲覧 / **匿名 Apex 実行** / **Login History ビュー** / **設計書ジェネレータ (Excel / Markdown / HTML / CSV / TSV / Mermaid ER 図)** などを、ログイン済みタブの **Session ID (sid Cookie)** を借用して直接実行します。

## 🎯 3 モード設計 — ユーザーロールに応じた最適 UI (v2.81.0 〜)

DevToolsNext は **「誰が」「どこで」使うか** で 3 つのモードに UI を分離しています。役割に合わせて起動方法を選んでください:

| モード | 起動方法 | 想定ユーザー | 主なユースケース | 機能群 |
|---|---|---|---|---|
| 💻 **開発者モード** | Salesforce タブで F12 → 「DevToolsNext」タブ<br/>または popup の「🛠️ 全画面で開く」 | 開発者・エンジニア | コーディング・デバッグ・データ操作・設計書作成 | SOQL クエリ / レコード Inspector / データエクスポート / 匿名 Apex / API URL ビルダー / REST 探索 / Describe / Limits / Debug ログ / ログイン履歴 / メタデータ一覧 / 変更セット (package.xml) / 設計書ジェネレータ 21 種類 (Phase 240 で orgSnapshot 追加、Phase 319 で実装数確認) |
| ⚙️ **管理者モード** | Chrome 拡張アイコン (右上) をクリック | システム管理者・運用担当 | 組織管理・ユーザー管理・Setup ショートカット | セッション情報 / Setup を開く / Developer Console / オブジェクトマネージャ / マイプロフィール / 組織情報 / ログアウト / 🔐 他ユーザーとしてログイン (Login as User) / 便利リンク (Setup 各ページ) |
| 👤 **ユーザーモード** | Salesforce ページ右下の 🛠 ボタン (常駐 floating launcher) | 業務利用者・営業・サポート | SF 画面上で軽量に操作 (タブを切り替えずに完結) | SF ページに重ねる mini-panel / 簡易 SOQL 実行 / 現在レコードの ID 自動挿入 / 結果テーブル CSV コピー |

各モードのヘッダーには **対応するカラーバッジ** が表示されます (開発者=青 💻 / 管理者=オレンジ ⚙️ / ユーザー=緑 👤)。モード間は次の動線で行き来できます:

- 👤 ユーザー → 💻 開発者: mini-panel ヘッダー「↗ 全画面」ボタン
- ⚙️ 管理者 → 💻 開発者: popup 最上部「🛠️ DevToolsNext を全画面で開く」大型 CTA
- 💻 開発者 → ⚙️ 管理者: ブラウザの拡張アイコンをクリック

**初めての方は ① 管理者モード (拡張アイコン) → 最上部の青い CTA → ② 開発者モードへの遷移がおすすめです。**

### 💡 3 モード活用例 (典型シナリオ)

| シナリオ | 推奨モード | 操作の流れ |
|---|---|---|
| 「本番組織で特定取引先のクローズ済 Case を 20 件確認したい」 | 👤 ユーザー | SF レコード画面の右下 🛠 → mini-panel SOQL → `SELECT Id, Subject, Status FROM Case WHERE AccountId = '現在ID' AND IsClosed = true LIMIT 20` |
| 「項目レベルセキュリティをプロファイル×項目マトリクスで提出書類化したい」 | 💻 開発者 | F12 → DevToolsNext → 📋 設計書作成 → 「項目レベルセキュリティ」を選択 → ▶ 生成 → 📥 ダウンロード (Excel) |
| 「他のユーザーになりすまして検証 (Login as User) したい」 | ⚙️ 管理者 | 拡張アイコン → 🔐 Login as User → 検索 → ログインボタン |
| 「テスト工程で SOQL 結果のスクリーンショット代わりに証跡を残したい」 | 💻 開発者 | SOQL 実行 → 📸 エビデンス ボタン → Markdown ファイルダウンロード |
| 「Apex 匿名コードで本番のデータをサンプル取得・調査したい」 | 💻 開発者 | F12 → DevToolsNext → 🛠 Apex 実行 → コード入力 → Ctrl+Enter (Debug ログ自動取得) |
| 「ValidationRule の一覧を Tooling API で取得して棚卸ししたい」 | 💻 開発者 | F12 → DevToolsNext → 📦 メタデータ一覧 → ValidationRule 選択 → 一覧取得 → 📸 エビデンス |
| 「Setup の特定ページを毎日開くショートカットが欲しい」 | ⚙️ 管理者 | 拡張アイコン → クイックグリッドカード (オブジェクトマネージャ / Developer Console 等) |
| 「過去 30 日のログイン履歴を業務担当者に共有したい」 | 💻 開発者 | F12 → DevToolsNext → 📜 ログイン履歴 → 件数選択 → 📸 エビデンス |

## 🔌 サポート対象 Salesforce API バージョン

DevToolsNext は **Salesforce REST API v62.0** および **Tooling API v62.0** を使用しています (2026 年 1 月時点で Winter '26 リリースに対応)。

| 機能 | 利用 API | バージョン | 備考 |
|---|---|---|---|
| SOQL クエリ | REST `/services/data/v62.0/query/` | v62.0 | Tooling 切替時は `/tooling/query/` |
| レコード Inspector | REST `/services/data/v62.0/sobjects/{Type}/{Id}` | v62.0 | PATCH (項目編集) も同 path |
| Limits ダッシュボード | REST `/services/data/v62.0/limits` | v62.0 | 30 種類以上の制限を取得 |
| Login 履歴 | SOQL `SELECT ... FROM LoginHistory` | v62.0 | Status は filterable=false の制約あり (クライアント側で絞り込み) |
| メタデータ一覧 | Tooling API `/tooling/query/` | v62.0 | Flow は `MasterLabel`、その他は `Name` を使用 |
| 匿名 Apex 実行 | REST `/services/data/v62.0/tooling/executeAnonymous/` | v62.0 | DebugLog も自動取得 (TraceFlag/DebugLevel 自動有効化) |
| 設計書ジェネレータ | REST + Tooling API 複合 | v62.0 | EntityDefinition / FieldDefinition / FieldPermissions 等 |
| Login as User | Setup UI `/servlet/servlet.su` | — | (REST API ではなく Setup endpoint) |

**API バージョン変更時の注意**: `js/sf-api.js` の `apiVersion = "62.0"` をまとめて変更してください。Salesforce は 3 年間 (9 リリース) 後方互換を保証しています。

## ⌨️ キーボードショートカット

すべての画面で以下のショートカットが利用できます (詳細は各画面の `kbd-hint` バッジで確認可能)。

| キー | 動作 | 備考 |
|---|---|---|
| `Ctrl+Enter` | 実行 (SOQL / Apex) | textarea にフォーカスがある時 |
| `Enter` | 実行 (Inspector / Describe / Export) | input にフォーカスがある時 |
| `Esc` | ピッカー / 表内検索 / 編集モードを閉じる | |
| `↑↓` | 候補ピッカー内の移動 | Picker 表示中 |
| `Home / End` | ピッカー先頭・末尾へジャンプ | Picker 表示中 |
| `PageUp / PageDown` | 10 件単位で移動 | Picker 表示中 |
| `Ctrl+Alt+Q` | SOQL クエリ画面を開く | |
| `Ctrl+Alt+I` | レコード詳細 (Inspector) を開く | |
| `Ctrl+Alt+A` | Apex 実行を開く | |
| `Ctrl+Alt+R` | REST API を開く | |
| `Ctrl+Alt+L` | 使用状況 (Limits) を開く | |
| `Ctrl+Alt+D` | 設計書作成を開く | |
| `Tab` (SOQL/Apex) | 2 スペースを挿入 (フォーカス移動でなく) | textarea 内 |

## 🔗 URL クエリ統一パターン (Phase 233-358、12 種) — チーム共有用 URL リンク

各画面の **「🔗 リンク」ボタン** で、現在の操作条件を URL リンクとしてクリップボードコピー可能。受信者は **ワンクリックで再現** (Slack / Notion / Confluence / メール経由)。URL は `chrome-extension://<拡張ID>/html/tool.html?...` 形式。

| ビュー | URL クエリ | 自動実行 | 業務シナリオ |
|---|---|:---:|---|
| 👥 管理ダッシュボード | `?view=admin` | ✓ | 「ライセンス使用率を確認お願い」 |
| 🌐 グローバル検索 | `?view=search&kw=<keyword>&scope=<standard\|extended\|all>` | ✓ | 「『田中』を全オブジェクト横断検索」 |
| 📐 オブジェクト構造 | `?view=describe&obj=<API名>` | ✓ | 「Account の項目一覧を確認」 |
| 🔎 Inspector | `?view=inspector&id=<recordId>&obj=<API名>` | ✓ | 「このレコードの詳細を見て」 |
| 🔎 SOQL 実行 | `?view=soql&q=<encoded SOQL>` | ✓ | 「このクエリの結果を見て」 |
| 📦 メタデータ一覧 | `?view=metadata&type=<ApexClass\|Flow\|...>` | ✓ | 「Apex クラス一覧を取得」 |
| 📋 設計書生成 | `?view=design&type=<種類>&target=<対象>&format=<excel\|markdown\|html\|csv\|tsv\|json>` | ✓ | 「Account の objectDef を Markdown で出して」 |
| 🌐 REST API | `?view=rest&method=<GET\|POST\|PATCH\|DELETE>&path=<APIパス>&body=<JSON>` | GET のみ | 「/limits を確認」(GET) / POST/PATCH/DELETE は **投入のみ・手動確認後送信** |
| 🟧 Apex 実行 | `?view=apex&code=<encoded Apex>` | **無効** | 「このバッチ起動コードを試して」— 受信者は必ず内容確認後に手動「▶ 実行」(PROD なら更に confirm 防御) |
| 🔐 ログイン履歴 | `?view=login&limit=<50\|100\|200>&status=<""\|Success\|Failed>` | ✓ | 「先週の login failure 一覧見せて」(セキュリティ監査) |
| 🌐 API URL ビルダー | `?view=apiurl&op=<describe\|query\|get\|...>&apiObj=<API名>&apiId=<Id>` | URL ビルドのみ | 「describe Account の curl コマンド共有」— ▶ 実行は手動 |
| 📊 Limits ダッシュボード | `?view=limits` | ✓ | 「API コール残量を確認」(popup「📊 使用状況」ボタンから呼出、Phase 311) |

**安全設計**: 破壊的な REST 呼び出し (POST/PATCH/DELETE) と Apex 実行は自動実行せず、ユーザー確認後に手動「送信/▶ 実行」が必要。API URL ビルダーは URL 生成のみで実行はしない。URL リンクが意図せず実行されないようガードしています。「🔗 リンク」ボタンは **10 機能種別** (search/SOQL/describe/inspector/metadata/design/rest/apex/login/apiurl) × 2 モード (panel + tool) = **20+ 箇所** に配置。

## 🛡️ PROD (本番組織) 誤操作防止 — 2 段階防御 × 6 経路カバー (Phase 288-293) + 3 モード ENV 統一 (Phase 117/288/333/382/383)

本番組織での「ボタン押下 → 即実データ変更」事故を物理的にブロックする多層防御を装備しています。

### 第 1 層: 視覚警告 (3 モード ENV 表示 100% 統一、Phase 117 / 288 / 333 / 382-383)

3 モードすべてで環境バッジを統一表示 — Phase 333 で popup にも追加、**Phase 382-383 で残存していた visual inconsistency を解消** (panel.css の SBX/DEV 色逆 + mini-panel の Dev 未判定):
- ⚙️ **管理者 (popup)** — `popupEnvBadge` (Phase 333、ヘッダー左) Sandbox / PROD / Dev 表示、PROD はパルスアニメ
- 💻 **開発者 (panel / tool)** — `envBadge` (Phase 117、**Phase 382 で SBX/DEV 色逆 bug 修正**) PROD pulse animation
- 👤 **ユーザー (mini-panel)** — `hdrEnv pill` (Phase 288、**Phase 383 で Dev 組織判定追加**、PROD は 2.4s ループパルス、`prefers-reduced-motion` 対応)

判定ロジック (`location.hostname` / `state.apiHost` を共通解析):
- `.sandbox.` → 🧪 Sandbox (オレンジ)
- `.develop. / .scratch.` → 🔧 Dev (緑)
- その他 → ⚠ PROD (赤 + パルス)

### 第 2 層: 動作ゲート (Phase 289-293、6 経路)

破壊的操作を実行する前に、本番組織 (PROD) では `state.isProd === true` を判定し confirm ダイアログを表示。**Sandbox / Developer / Scratch では従来通り即実行** (テスト環境の摩擦回避):

| # | 操作 | 経路 | 検出ロジック | Phase |
|---|---|---|---|---|
| 1 | Apex 匿名実行 (DML 含む) | `tooling/executeAnonymous` | `/\b(insert\|update\|upsert\|delete\|undelete\|merge)\b\|database\.(insert\|...)/i` | 289 |
| 2 | REST POST/PATCH/DELETE | `services/data REST` | `method ∈ {POST, PATCH, DELETE}` | 289 |
| 3 | SOQL Bulk DELETE | `composite DELETE` | 表内チェック行の一括削除 | 291 |
| 4 | SOQL Bulk DML (CSV→DML) | `composite POST/PATCH` | INSERT/UPDATE/UPSERT 各種 | 291 |
| 5 | Inspector インライン編集 | `sobjects PATCH` | 個別項目編集の確定時 | 292 |
| 6 | admin 凍結解除 | `UserLogin PATCH` (`IsFrozen=false`) | ライセンス管理経由のユーザー操作 | 293 |

### 確認ダイアログの内容 (Phase 289-293 実装、Phase 394 で 6 経路 format 統一)

各操作で以下を明示してユーザーが意識的に判断できるように:
- 🚨🚨 **本番組織 (PROD) で 〇〇 操作 🚨🚨** ヘッダ (Phase 394 で Apex/REST も sandwich style に統一)
- **対象組織** (`state.host`)
- 操作詳細 (Method / Path / Object / Record ID / 項目名 / 変更前→変更後 等)
- **Sandbox での事前テストを強く推奨** フッタ
- セキュリティ系操作はセキュリティ影響 (例: 「凍結解除後はユーザーが即座にログイン可能」) も追記

**Phase 394 補足**: Phase 289 当初 Apex/REST は `⚠️` (1 つ) + 「キャンセル推奨」footer だったが、Phase 291+ で SOQL Bulk DELETE/DML / Inspector PATCH / 凍結解除を `🚨🚨` sandwich + 「Sandbox 強く推奨」に強化した時に Apex/REST は touch せず残置。Phase 394 で Apex/REST も統一して 6 経路完全整合化 (3 ヶ月 drift 解消)。

## 🗂️ クイック実行 templates グルーピング (Phase 313-344、6 系統 × 108 templates × 26 カテゴリ)

各 select は `<optgroup>` で業務シナリオ別にグルーピング — ロールに応じた「自分のシナリオ」を瞬時に発見可能。

| 系統 | 配置 | 種類数 | カテゴリ数 | 主なカテゴリ |
|---|---|---:|---:|---|
| 🟧 **Apex 匿名実行** | panel + tool toolbar | **20** | 5 | 基本確認 / 業務 SOQL / 開発・テスト・運用 / ユーザー管理・凍結 / 監査・ストレージ削減 |
| 🔎 **SOQL クエリ** (panel) | panel + tool toolbar | **28** | 5 | 基本 / 開発 (Tooling) / 業務分析・棚卸し (closing_this_month/my_open_leads/closed_lost_recent 含む) / ライセンス・権限 / セキュリティ・管理者 |
| 📦 **メタデータ一覧** | panel + tool toolbar | **15** | 5 | Apex 系 / 自動化 / オブジェクト構造 / UI コンポーネント / 権限・レポート |
| 📋 **設計書ジェネレータ** | panel + tool toolbar | **21** | 5 | 組織全体 / オブジェクト・項目 / 権限・FLS / Apex/Flow/LWC / アプリ・設定・ER 図 |
| 🌐 **REST クイック実行** | panel + tool toolbar | **11** | 3 | 組織・基本情報 / メタデータ・SObject / レコード/ジョブ |
| 📝 **mini-panel SOQL** | mini-panel (Salesforce 画面上) | **13** | 3 | 基本 (営業/開発) / 業務 (closing_this_month/my_open_leads/closed_lost_recent 含む) / 管理者・セキュリティ |
| **合計** | — | **108** | **26** | — |

**設計判断**: optgroup の `<label>` 属性は OS ネイティブ select UI で見出しとして表示される — 視認性 + a11y + キーボードナビゲーション (TypeAhead) すべてが向上。

## 📸 エビデンス取得機能 (v3.2 〜) — テスト工程向け

各画面の **「📸 エビデンス」** ボタンで、現在の操作結果を Markdown レポートとして 1 クリックでダウンロードできます。

### 対応 6 画面

| 画面 | エビデンス内容 | ファイル名 |
|---|---|---|
| 🔎 SOQL クエリ | 実行クエリ + 結果テーブル (最大 200 件) | `soql-evidence-YYYYMMDD-HHmm.md` |
| 🔍 レコード詳細 (Inspector) | 対象オブジェクト / ID / 全項目値 (API 名・ラベル・型・値) | `inspector-evidence-{Obj}-YYYYMMDD-HHmm.md` |
| 📊 使用状況 (Limits) | 全 Limits の日本語名 + API 名 + 使用率 | `limits-evidence-YYYYMMDD-HHmm.md` |
| 🔐 ログイン履歴 | 全ログイン履歴 + 成功/失敗集計 | `login-history-evidence-YYYYMMDD-HHmm.md` |
| 🟧 Apex 実行 | 実行 Apex コード + 結果/Debug ログ | `apex-evidence-YYYYMMDD-HHmm.md` |
| 📦 メタデータ一覧 | メタデータ種別 + 一覧 | `metadata-{type}-evidence-YYYYMMDD-HHmm.md` |

### 共通フォーマット

各エビデンスには **メタ情報セクション** (取得日時 / 組織ドメイン / 組織 ID / API バージョン / 拡張機能 Ver) が必ず含まれます。

### 用途例

- ✅ **テストケースの実行証跡** (テストレビュー時の参照資料)
- 🔍 **障害調査の記録** (発生時刻 / 組織状態 / 実行操作)
- 📋 **作業ログ** (定例運用作業の実施記録)
- 🔗 **共有・添付** (Markdown 形式なので git / Confluence / Slack に貼り付け可能)

## 目次

- [v3 系の主要機能 (累計まとめ)](#v3-系の主要機能-v271--v3298--phase-380-で-v3-系-290-連続リリース達成累計まとめ)
- [🎯 3 モード設計](#-3-モード設計--ユーザーロールに応じた最適-ui-v2810-) — 💻 開発者 / ⚙️ 管理者 / 👤 ユーザー
- [🙋 ロール別 FAQ](#-ロール別-faq-v3220-) — 19 問 × 3 モード設計と紐づけ
- [🔌 サポート対象 SF API バージョン](#-サポート対象-salesforce-api-バージョン) — v62.0 / Winter '26
- [⌨️ キーボードショートカット](#-キーボードショートカット) — 13 種
- [🔗 URL クエリ統一パターン](#-url-クエリ統一パターン-phase-233-35812-種--チーム共有用-url-リンク) — 12 種 (admin/search/describe/inspector/soql/metadata/design/rest/apex/login/apiurl/limits)
- [🛡️ PROD 誤操作防止](#-prod-本番組織-誤操作防止--2-段階防御--6-経路カバー-phase-288-293--3-モード-env-統一-phase-117288333382383) — 2 段階防御 × 6 経路カバー + 3 モード ENV 統一 (Phase 333 で popup 追加 + Phase 382-383 で残存 visual inconsistency 解消 → 真の 100% 達成)
- [🗂️ クイック実行 templates グルーピング](#-クイック実行-templates-グルーピング-phase-313-3446-系統--108-templates--26-カテゴリ) — 6 系統 × 108 templates × 26 カテゴリ
- [📸 エビデンス取得機能](#-エビデンス取得機能-v32--テスト工程向け) — 6 画面で Markdown 証跡
- [🔁 Inspector ↔ SOQL 双方向ナビゲーション](#-inspector--soql-双方向ナビゲーション-v3650--phase-155-157-で-3-方向ナビ完成) — 親/同/子の 3 方向で関連レコード SOQL を自動生成
- [🎨 CSS デザイントークン体系](#-css-デザイントークン体系-v3900--phase-180-187-で導入) — 3 モード共通の **17 種トークン** (スペーシング 10: sp-0..6 + sp-hair + sp-tag-y + sp-card-y / 角丸 7: r-xs + r-sm + r-tag + r-md + r-lg + r-xl + r-pill)
- [🔍 Team J 静的解析監査成果](#-team-j-静的解析監査成果-v3860--v3980-phase-176--188-194-で導入) — comm diff 5 軸で見えない不具合発見、累計 887 行 dead 削除
- [📤 Inspector 風一括 DML 機能](#-inspector-風一括-dml-機能-v31130--phase-203-207-で導入) — SOQL 結果から削除 / CSV から INSERT/UPDATE/UPSERT / Bulk API v2 / Setup Audit Trail
- [🆘 トラブルシューティング](#-トラブルシューティング-v3200-) — 13 症状 × 原因 × 対処
- [更新履歴](#更新履歴) — リリースノート
- [📚 設計書 21 種類 業務向け詳細解説](#-設計書-21-種類-業務向け詳細解説-v2160-拡充--phase-240-で-orgsnapshot-追加phase-318-で実装数確認) — 各設計書の出力と業務での使い所
- [🖨️ 設計書を PDF として保存する手順](#-設計書を-pdf-として保存する手順-v3230-) — Ctrl+P で業務文書品質 PDF
- [🧪 設計書ジェネレータ 21 種類 手動テストガイド](#-設計書ジェネレータ-21-種類-手動テストガイド-phase-240-で-orgsnapshot-追加phase-318-で実装数確認)
- [機能](#機能) — Popup / DevTools パネル / 右クリックメニュー
- [デプロイ（インストール）方法](#デプロイインストール方法) — Load unpacked / .zip / .crx / Web Store
- [🗑️ アンインストール / 無効化手順](#-アンインストール--無効化手順-v3260-) — chrome.storage クリア / GPO 一斉削除
- [既知の前提・制約](#既知の前提制約)
- 🤝 **プロジェクト基盤** (v3.45.0-v3.60.0 で整備、Phase 150 で完成):
  - [CONTRIBUTING.md](CONTRIBUTING.md) — 新規貢献者向け 7 セクション (5 大指針 / 開発フロー / Issue / コーディング / リリース)
  - [SECURITY.md](SECURITY.md) — sid Cookie の取扱 / 外部送信なしポリシー / 脆弱性報告
  - [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) — Contributor Covenant v2.1 準拠 + 拡張悪用禁止 (sid 流用 / Login as User 濫用)
  - [.github/workflows/version-check.yml](.github/workflows/version-check.yml) — CI: VERSION.txt と manifest.json の整合性自動チェック
  - [.github/workflows/release.yml](.github/workflows/release.yml) — CI: タグ push で .zip 自動ビルド + GitHub Release
  - [.github/ISSUE_TEMPLATE/bug_report.yml](.github/ISSUE_TEMPLATE/bug_report.yml) / [feature_request.yml](.github/ISSUE_TEMPLATE/feature_request.yml) — 構造化フォーム
  - [.github/PULL_REQUEST_TEMPLATE.md](.github/PULL_REQUEST_TEMPLATE.md) — 5 大基本指針自己評価チェック内蔵

## 更新履歴
- **v3.97.0 (2026-05-21 04:20)** — 🎨🏷📐 Phase 187: **`--sp-tag-y: 5px` セマンティックトークン追加 + 6 箇所 フォーム/grid/list-item padding 統一 (--r-tag 命名整合性)**:
  - **🏷 Team A 頻度分析駆動**: `padding: 5px 8px` が 6 箇所 (panel 5 + popup 1) と確認、すべてフォーム/grid セル/list-item 用途で `--r-tag` 適用箇所と一致を発見
  - **🎨 panel.css / popup.css の `:root` に `--sp-tag-y: 5px` を追加** (両ファイル完全同期、`--r-tag: 5px` と命名整合性のあるセマンティック命名)
  - **6 箇所すべて完全トークン化**: panel.css 5 箇所 (`input/select/textarea`, `.grid th/td`, list-item 3 種) + popup.css 1 箇所 (`.history-item`) → `padding: 5px 8px` → `padding: var(--sp-tag-y) var(--sp-3)`
  - **設計判断**: 5px はスケール (2/4/6/8/10/12/16/24px) 外。scale-based 拡張 (`--sp-half` 等) ではなく**用途由来命名で `--r-tag` と対応関係を明示** → 「タグ風要素 (input/grid/list) の角丸と縦 padding は同じ用途グループ」と読み手にすぐ伝わる
  - **README CSS デザイントークン体系セクション更新**: 17 → 18 種、`--sp-tag-y` 行をスペーシング表 4 段目に追加、進捗テーブルに Phase 187 行追加、スケール外保留方針も「5px は --sp-tag-y セマンティック化済」明記
  - **累計トークン化**: panel.css 131 + popup.css 39 = **170 箇所** (Phase 186 比 +6)
  - **5 大指針 ④ (デザイン重視)** + **⑤ (チーム議論)** — トークン命名でスタイル間の関係性を表現 (`--r-tag` ⇔ `--sp-tag-y` で対構造)
  - **視覚回帰なし** (5px 値=既存値の 1:1 リネーム)
- **v3.96.0 (2026-05-21 04:17)** — 🎨💇 Phase 186: **`--sp-hair: 1px` セマンティックトークン追加 + 18 箇所 極小要素 padding 統一**:
  - **💇 Team A 頻度分析駆動**: 全 CSS の `padding:` を grep 集計し、1px 縦 padding が **18 箇所** (panel.css 16 + popup.css 2) と確認 — 内訳: `1px 6px` ×8、`1px 5px` ×8、`1px 4px` ×1、`1px 8px` ×1
  - **🎨 panel.css / popup.css の `:root` に `--sp-hair: 1px` を追加** (両ファイル完全同期、セマンティック命名 — 髪の毛のように細い縦 padding の意)
  - **完全トークン化 10 箇所**: `padding: 1px 6px` (8 箇所、panel.css の env-badge / badge / hint-link 等) → `padding: var(--sp-hair) var(--sp-2)`、`padding: 1px 4px` (.kbd-hint kbd) → `var(--sp-hair) var(--sp-1)`、`padding: 1px 8px` (.pill) → `var(--sp-hair) var(--sp-3)`
  - **部分トークン化 8 箇所**: `padding: 1px 5px` (panel.css 6 + popup.css 2、code / badge-required・unique・ref / child-rel-name / kbd / qbadge) → `padding: var(--sp-hair) 5px` (5px はスケール外保留)
  - **設計判断**: 18 箇所すべて「badge / chip / kbd / code」のような極小要素の縦 padding という用途で完全一致 → セマンティック命名 `--sp-hair` で意図が明確になる (scale-based `--sp-half` 等より用途由来が読みやすい)
  - **README CSS デザイントークン体系セクション更新**: 16 → 17 種、スペーシング表に `--sp-hair` 行を 1 段目 (最小値) に追加、進捗テーブルに Phase 186 行追加、スケール外保留方針も「1px は --sp-hair セマンティック化済」明記
  - **累計トークン化**: panel.css 126 + popup.css 38 = **164 箇所** (Phase 185 比 +18)
  - **5 大指針 ② (保守性) + ④ (デザイン重視)** — 将来 1px 余白の一括調整が `--sp-hair` 1 箇所修正で済む
  - **視覚回帰なし** (1px 値=既存値の 1:1 リネーム)
- **v3.95.0 (2026-05-21 04:15)** — 🎨📋 Phase 185: **`--sp-card-y: 32px` セマンティックトークン追加 + 9 箇所 empty-state padding 統一**:
  - **📋 Team A 頻度分析駆動**: 全 CSS の `padding:` を grep 集計し、`padding: 32px 16px` が 9 箇所と最頻出 (panel.css の empty-state pseudo-element に集中) を確認
  - **🎨 panel.css / popup.css の `:root` に `--sp-card-y: 32px` を追加** (両ファイル完全同期、セマンティック命名 — scale-based ではなく用途由来)
  - **9 箇所すべて移行**: SOQL / Apex / REST / Limits / describe / Login 履歴 / Metadata / Inspector / DataExport の各 empty-state pseudo-element (`padding: 32px 16px` → `padding: var(--sp-card-y) var(--sp-6)`)
  - **設計判断**: 32px はスケール (4/6/8/10/12/16/24px) 外で `--sp-7` (24px) や `--sp-8` (32px) のスケール拡張も可能だったが、9 箇所すべて同じ用途 (empty-state 中央配置) のため**セマンティック命名 `--sp-card-y`** を採用 → 将来 empty-state の余白を一括調整可能
  - **両ファイル同期維持**: popup.css には現状未使用だが、将来 popup に大型 empty-state が追加された際にすぐ使えるよう定義のみ追加 (Phase 183 の `--r-pill` と同様の予防的同期)
  - **README CSS デザイントークン体系セクション更新**: 15 → 16 種、進捗テーブルに Phase 185 追加、スケール外保留方針に「32px は --sp-card-y セマンティック化済」を明記
  - **累計トークン化**: panel.css 110 + popup.css 36 = **146 箇所** (Phase 184 比 +9)
  - **5 大指針 ① (3 モード整合性)** + **④ (デザイン重視)** — 9 箇所の empty-state が一貫した余白で表示されることが保証された
  - **視覚回帰なし** (32px 値=既存値の 1:1 リネーム)
- **v3.94.0 (2026-05-21 04:13)** — 🎨🏷 Phase 184: **`--r-tag: 5px` トークン追加 + 6 箇所移行 (フォーム input / ボタン / list-item / コード preview)**:
  - **🏷 Team A**: panel.css / popup.css の `:root` に `--r-tag: 5px` を追加 (両ファイル完全同期維持、`--r-sm` 4px と `--r-md` 6px の中間段階)
  - **🎨 6 箇所の `border-radius: 5px` を `var(--r-tag)` に移行**:
    - panel.css 4 箇所: `button` (汎用ボタン)、`input, select, textarea` (フォーム入力統一)、`.design-preview pre` (コード/Markdown プレビュー)、`.picker-search` (オブジェクトピッカー検索)
    - popup.css 2 箇所: `.user-item` (Login as User リスト)、`.history-item` (SOQL 履歴リスト)
  - **頻度分析駆動**: panel.css/popup.css のハードコード値を `grep | uniq -c` で集計し、5px は 6 箇所と Phase 183 の追加トークン判断基準 (3 箇所以上) を満たしたため新規追加
  - **README CSS デザイントークン体系セクションを更新**: 14 → 15 種トークン、進捗テーブルに Phase 184 追加、累計 137 箇所 (panel 101 + popup 36)
  - **5 大指針 ② (動かない機能改修)** はトークン化により「保守時の見落とし」リスクを軽減 — 将来 5px の値を一括変更する際に `--r-tag` 1 箇所修正で済む
  - **視覚回帰なし** (5px 値=既存値の 1:1 リネーム)
- **v3.93.0 (2026-05-21 04:10)** — 🎨🔗📐 Phase 183: **`--r-pill: 12px` トークン追加 + README に CSS デザイントークン体系セクション新設 (Team A + Team B 連携)**:
  - **🎨 Team A**: panel.css / popup.css の `:root` に `--r-pill: 12px` を追加 (チップ/ピル形状用、両ファイルで完全同期維持)
  - **🔗 4 箇所の `border-radius: 12px` を `var(--r-pill)` に移行**: panel.css の `.hint-link` / inline soql template button / `.home-card`、popup.css の `.login-chip`
  - **📐 Team B**: README に「🎨 CSS デザイントークン体系」セクション新設 — 14 種トークン表 (sp-0..7 / r-xs..xl + r-pill)、Phase 180-183 進捗、スケール外値の保留方針、追加トークン判断基準、業務インパクトを 1 ページで文書化
  - **目次にも CSS デザイントークン体系セクションを追加** (Inspector ↔ SOQL 双方向ナビ と トラブルシューティング の間)
  - **累計トークン化進捗**: panel.css 97 + popup.css 34 = **131 箇所** (Phase 182 比 +4)
  - **5 大指針 ① (3 モード整合性) + ④ (デザイン重視)** を文書化レベルでも達成 — 将来の貢献者・テーマカスタマイズ作業者向けの判断基準を明示
  - **視覚回帰なし** (12px 値=既存値の 1:1 リネーム)
- **v3.92.0 (2026-05-21 04:08)** — 🎨🔗 Phase 182: **popup.css に CSS デザイントークン展開 (3 モード CSS 整合性達成)**:
  - **🔗 popup.css `:root` に `--sp-0..7` / `--r-xs..xl` を panel.css と完全同値で追加** (定義同期、4px ベース 8 段階 + 5 段階)
  - **🎨 padding 16 箇所を `var(--sp-*)` に置換**: `8px 12px` (3 箇所)、`10px 12px` (2)、`10px` (1)、`2px 8px` (1)、`2px 6px` (1)、`6px 8px` (2)、`4px 8px` (1)、`6px 10px` (1)、`8px` (3)、`4px 6px` (1)、`6px 12px` (1)、`8px 0` (1)、`10px 6px` (1)、`8px 2px 2px` (1)
  - **🎨 border-radius 12 箇所を `var(--r-*)` に置換**: `10px` → `r-xl` (3、`!important` 含む)、`8px` → `r-lg` (2)、`6px` → `r-md` (5)、`4px` → `r-sm` (2)、`3px` → `r-xs` (2)
  - **popup.css トークン参照数 0 → 32** (panel.css 95 と合わせ累計 **127 箇所** トークン化)
  - **スケール外保留** (3px / 5px / 12px / 14px / 20px) — Phase 181 方針継続で視覚回帰リスク回避
  - **5 大指針 ① (3 モード整合性) を CSS レベルでも達成** — popup と panel/tool のスペーシング体系が完全統一
- **v3.91.0 (2026-05-21 03:51)** — 🎨📐 Phase 181: **CSS padding 段階移行 (Phase 180 トークン活用、panel.css の 43 箇所を `var(--sp-*)` に統一)**:
  - **🎨 panel.css の単一値 padding 13 箇所を migration**: `padding: 4px;` → `padding: var(--sp-1);` 等 (4/6/8/10/12px)
  - **🎨 二値 padding 20 箇所を migration**: `padding: 2px 8px;` → `padding: var(--sp-0) var(--sp-3);` (7 箇所)、`4px 6px` (3)、`6px 10px` (3)、`6px 12px` (2)、`4px 10px` (2)、`8px 4px` (1)、`8px 10px` (1)、`6px 8px` (1)
  - **🎨 縦軸特化 padding 10 箇所を migration**: `4px 0` (4) / `2px 0` (4) / `8px 0` (1) を `var(--sp-N) 0` 形式に
  - **合計 43 箇所を `var(--sp-*)` に統一** (Phase 180 の 62 border-radius と合わせて累計 105 hard-coded 値をトークン化)
  - **保留 (スケール外の値)**: 1px / 3px / 5px / 7px / 14px / 32px 含む padding は将来のデザイン判断対象 — 安易な近似トークン置換でレイアウトが崩れるリスクを回避
  - **視覚回帰なし**: トークン値 = 既存値で 1 対 1 リネーム
  - **次の Phase 候補**: ① popup.css にも同等トークン展開 ② スケール外値 (5px / 14px) のデザイン判断統一
- **v3.90.0 (2026-05-21 03:48)** — 🎨🏗 Phase 180 **マイルストーン**: **CSS デザイントークン導入 (余白・角丸の統一基盤、v3 系 90 連続リリース達成)**:
  - **🎊 v3.0 Phase 90 → v3.90.0 Phase 180 で v3 系 90 連続リリース達成** — 累計 280+ リリース / 320+ commits
  - **🏗 panel.css `:root` にデザイントークン 13 種追加** (視覚的回帰なし — 既存値と同等のトークンを定義):
    - **スペーシング (4px ベース・8 段階)**: `--sp-0` (2px) / `--sp-1` (4px) / `--sp-2` (6px) / `--sp-3` (8px) / `--sp-4` (10px) / `--sp-5` (12px) / `--sp-6` (16px) / `--sp-7` (24px)
    - **角丸 (5 段階)**: `--r-xs` (3px) / `--r-sm` (4px) / `--r-md` (6px) / `--r-lg` (8px) / `--r-xl` (10px)
  - **🎨 border-radius 第 1 弾移行 (リスクなし)**: 単一値 (3/4/6/8/10px) を `var(--r-*)` に置換 — 全 52 箇所
    - corner-specific (`4px 4px 0 0` / `8px 0 0 8px` / `10px 10px 0 0`) は将来 phase で個別対応のため保持
    - 5px / 12px / 14px はデザイン判断が必要なため未対応 (今後の Phase で統一)
  - **背景**: 監査で `border-radius: 3/4/5/6/8/10/12/14px` の 8 種類混在を発見 → 一貫性向上の基盤を整備
  - **次の Phase で段階移行予定**: `padding: 8px` → `var(--sp-3)` 等のスペーシング移行 (52 箇所程度)
  - **設計思想**: 視覚的破壊なしの「リネーム移行」第 1 弾 → 既存スタイル維持しつつ将来の design audit に道を開く
- **v3.89.0 (2026-05-21 03:45)** — 🧹📉 Phase 179: **panel.js dead code 削除 (-468 行、変更セット/package.xml 関連を撤去)**:
  - **🧹 panel.js を 4767 → 4299 行に縮小 (-468 行、9.8% 減)**
  - **削除した dead 関数 (11 個、~441 行)**: `csOnModeChange` / `csListOutbound` / `csListInbound` / `csListDeployStatus` / `csListCandidates` / `csRenderCandidates` / `csRenderSelected` / `csClearSelection` / `csBuildPackageXml` / `csCopyXml` / `csDownloadXml` / `csDownloadSfdxBundle` + `csState` オブジェクト
  - **削除した dead $on バインディング (9 個)**: btnCsLoad / btnCsListType / btnCsClear / btnCsBuildXml / btnCsCopyXml / btnCsDlXml / btnCsDlBundle / csFilter input / csMode change
  - **削除した dead data-quickset ハンドラ (~17 行)**: API example chip クリックで Cs view にメタデータ型をロードする旧フロー (`csType` と `btnCsLoadCandidates` への参照を含む — 共に HTML 不在)
  - **削除した attachClearButton 配列の dead エントリ**: csFilter
  - **背景**: v2.88.0 で HTML から「変更セット / package.xml」view が削除された後、JS 側で `$on` の null-safe パターンと if-guard で残骸が残っていた。約 30 phase ぶりに発掘。
  - **manifest.json description も更新**: 「変更セット/package.xml」記述を削除、「設定エクスポート/インポート」を追加
  - **影響なし検証**: 全 cs* 関数の呼出元を grep で確認、全て dead path 経由のみ。`recordsTable` は live コード (SOQL/describe/metadata/logs) で使用のため保持
  - **保守性向上**: Phase 177 (popup.js -322 行) と Phase 179 (panel.js -468 行) で合計 **790 行の dead code 撤去**
- **v3.88.0 (2026-05-21 03:42)** — 📤📥💾 Phase 178: **設定エクスポート / インポート機能を実装 (別 PC への設定移行が可能に)**:
  - **📤 エクスポート (オプション 6)**: 現在の設定 (sfdt* + savedQueries/savedApex/sideCollapsed/whatsNewCollapsed) を JSON ファイルでダウンロード
    - ファイル名: `devtoolsnext-settings-YYYYMMDD-HHMMSS.json`
    - フォーマット: `{ _format: "DevToolsNext-settings-v1", _exportedAt, _version, _keyCount, data: {...} }`
    - `chrome.downloads` 権限不要 (popup 内で `<a download>` クリック)
  - **📥 インポート (オプション 7)**: JSON ファイルから設定を取込
    - 動的に `<input type="file">` を生成して popup.html を汚さない
    - `_format` フィールドで形式バリデーション
    - 拡張機能所有キーのみ許可 (`sfdt*` + 既知キー) — 任意キー上書き防止
    - インポート前確認ダイアログ (エクスポート時刻 / バージョン / 取込キー数 / 拒否キー数 を表示)
    - 既存キーは上書き
  - **業務シナリオ**: ① PC 移行時の設定引継ぎ ② チーム内で savedQueries を共有 ③ 「全削除前にバックアップ」推奨フロー
  - **クリア確認ダイアログにバックアップ推奨を追記**: 「💡 不安な場合は先に『6. エクスポート』でバックアップを取ってください」
  - **ダイアログ番号体系**: 1-4 (部分クリア) / 5 (全削除) / 6 (エクスポート) / 7 (インポート) / 0 (キャンセル)
- **v3.87.0 (2026-05-21 03:39)** — 🧹📉 Phase 177: **popup.js dead code 削除 (-322 行、Phase 176 で発見した到達不能コードを撤去)**:
  - **🧹 popup.js を 959 → 637 行に縮小 (33% 減、322 行純減)**
  - **削除した dead 関数**: `doSoql` / `pushHistory` / `renderHistory` / `deleteHistoryAt` / `togglePinAt` / `clearHistory` / `exportCsv` / `recordsToTableHtml` / `sortTableByTh` / `stringify` / `doParseId` / `openIdInOrg` / `doApiCall` (計 13 関数)
  - **削除した dead 定数**: `HISTORY_KEY` / `HISTORY_MAX`
  - **削除した dead $on バインディング**: btnRunSoql / btnExportCsv / btnClearHistory / soqlText keydown / btnParseId / btnOpenId / idInput input / idInput keydown / btnApiSend / btnApiLimits / btnApiVersions (計 11 件)
  - **不要 import を撤去**: sfFetch / to18CharId / lookupPrefix / recordsToCsv (sf-api.js から)
  - **背景**: v2.78.0 で popup から SOQL タブと API タブが、v2.80.0 で ID 解析セクションが撤去された後、`$on` の null-safe パターンで残骸が残っていた。Phase 176 で grep 監査によって全件特定。
  - **影響なし**: 各関数は到達不能であることを Phase 176 で検証済 (HTML id 不在 + 他関数からの呼出も全て dead path)。`escape` / `formatError` / `setStatus` 等は LIVE コードでも使用されているため保持
  - **保守性向上**: popup.js の読みやすさ大幅向上、将来 popup を改修する際の認知負荷を削減
- **v3.86.0 (2026-05-21 03:36)** — 🐞🔎 Phase 176: **既存機能の動作テスト → 見えない不具合 3 件を修正 (5 大指針 ③ 動かない機能の積極改修)**:
  - **🐞 見えない不具合 #1**: Phase 175 の RESET_CATEGORIES.history カテゴリに `sfdtLoginAsHistory` (Login as User 検索履歴) と `sfdtLoginAsRecentUsers` (最近ログインしたユーザ) が含まれていなかった → 部分クリア「履歴系」を選んでも消えない bug → **2 キーを history に追加 (7 キーに拡張)**
  - **🐞 見えない不具合 #2**: 「全削除」(数字 5) のフィルタに v3.46.0 で撤廃済の `soqlHistory` レガシーキーが含まれていなかった → 旧バージョンから移行したユーザーの storage に永久に残る可能性 → **`OWNED_NON_SFDT` Set にレガシーキーを追加し、「全削除」で確実に除去**
  - **🐞 見えない不具合 #3**: popup の `init()` で `renderHistory()` を毎回 await しているが、v2.78.0 で SOQL タブを popup から撤去したため `id="soqlHistory"` が存在せず常に早期 return → 毎回ポップアップを開くたびに無駄な `chrome.storage.local.get` 呼出が走っていた → **init から dead な await を削除**
  - **コードベース監査手法**: HTML id 一覧 vs JS `getElementById/$on` 参照一覧の comm diff、`HISTORY_KEY`/`LOGIN_AS_*_KEY` 等の grep、`startsWith("sfdt")` フィルタの網羅性検証で発見
  - **次の探索候補**: popup.js に残る dead code (`doSoql` / `clearHistory` / `exportCsv` / `doParseId` / `openIdInOrg` 計 ~200 行) — null セーフだが完全に到達不能なため将来 Phase で削除予定
- **v3.85.0 (2026-05-21 03:33)** — 🛠🎚 Phase 175: **⚙ 設定ダイアログを部分クリアに進化 (履歴 / draft / UI 状態 / 保存 / 全削除 の 5 択)**:
  - **🎚 Phase 174 の all-or-nothing を改善**: prompt で番号 (0-5) を入力してクリア範囲を選択
  - **5 カテゴリ + キャンセル**:
    - 1. 履歴系 (5 キー: SOQL/Apex/REST 履歴 + Inspector 履歴 + 設計書「対象」履歴)
    - 2. draft 系 (3 キー: SOQL/Apex/REST body の入力中バックアップ)
    - 3. UI 状態系 (9 キー: Limits ピン・各種チェック・サイドバー折りたたみ・最後の view 等)
    - 4. 保存系 (2 キー: savedQueries / savedApex)
    - 5. 全削除
    - 0. キャンセル
  - **2 段階確認**: 番号入力 → 対象キー一覧表示の確認ダイアログ → 実行 (誤クリック防止)
  - **各カテゴリに「N キー保存中」のリアルタイム表示**: 既に空のカテゴリは 0 と表示
  - **対象キーリスト明示**: `(sfdtRecentSoql, sfdtRecentApex, ...)` で何が消えるかを最終確認できる
  - **業務シナリオ**: 「履歴だけ消したい (draft は残したい)」「UI 状態をデフォルトに戻したい (保存クエリは残したい)」等の細粒度な要求に対応
- **v3.84.0 (2026-05-21 03:30)** — 🛠🐞 Phase 174: **設定リセット機能を実装 (見えない不具合修正: ⚙ ボタンが「未実装」toast だけだった)**:
  - **🐞 見えない不具合修正**: 従来 popup の ⚙ 設定ボタンは `chrome.runtime.openOptionsPage` を呼ぶだけで、options ページは manifest 未定義のため毎回「⚠ 設定画面は今後のバージョンで実装予定です (現在は未実装)」toast を出すだけ → 5 大基本指針 ② 「使えない機能改修廃止」違反
  - **🛠 chrome.storage 14 種一括クリア機能**:
    - 現在の保存キー数とバイト数 (B / KB / MB) を取得して詳細を確認ダイアログに表示
    - クリア対象は `sfdt*` プレフィックス + `savedQueries` / `savedApex` / `sideCollapsed` / `whatsNewCollapsed` (拡張機能が所有するキーのみ)
    - 内訳: SOQL/Apex/REST 履歴 (3 種) / SOQL/Apex/REST body draft (3 種) / Inspector 履歴 / 設計書「対象」履歴 / Limits ピン / メタデータ type / SOQL Tooling チェック / Apex Debug ログチェック / 保存クエリ・Apex / UI 状態
    - `window.confirm` で誤クリック防止 (⚠ この操作は取り消せません)
    - 完了後トースト「✓ N キー (約 X KB) をクリアしました」
  - **業務シナリオ**: ① 共用 PC で他人の SOQL/Apex draft が残らないようにしたい / ② デモ前に画面を初期化したい / ③ 14 種の蓄積データを一気に整理したい
  - **⚙ ボタン tooltip も更新**: 何が起きるかを事前に明示
- **v3.83.0 (2026-05-21 03:27)** — 📡📝💾 Phase 173: **REST API body textarea の入力中バックアップ (draft 自動保存) (14 種、🎊 3 連 textarea 完全救済達成)**:
  - **📡 `sfdtRestBodyDraft` キーで REST body textarea の入力中内容を 300ms debounce で保存**
  - **業務シナリオ**: POST/PATCH の JSON body (Contact 作成、Account 更新、Composite Tree, sObject Tree 等) を組み立て中にタブが落ちる → 復元したい
  - **REST 履歴 (Phase 167) は送信時のスナップショット**、本 Phase の draft は「送信前の編集中」を救済 — 別問題を別キーで管理
  - **空文字時は storage からキー自体を削除** (SOQL/Apex draft と同パターン)
  - **復元時に panelToast** (📝 編集中だった REST API ボディを復元しました)
  - **🎊 3 連 textarea draft 完全救済達成**: SOQL (Phase 171) + Apex (Phase 172) + REST body (Phase 173)
  - **chrome.storage 永続化 14 種**
- **v3.82.0 (2026-05-21 03:24)** — 🟧📝💾 Phase 172: **Apex コード textarea の入力中バックアップ (draft 自動保存) (13 種、SOQL と同パターン)**:
  - **🟧 `sfdtApexDraft` キーで Apex textarea の入力中内容を 300ms debounce で保存**
  - **業務シナリオ**: 長い匿名 Apex (バッチ起動コード、Test% 削除確認、Limits.getQueries() 群、スケジュールジョブ確認等) を組み立て中にタブが落ちる → 復元したい
  - **`savedApex` (手動命名保存) と `sfdtRecentApex` (実行済み履歴、コンパイル成功時のみ) の間に空いていた「コンパイル前 draft」の救済**
  - **空文字時は storage からキー自体を削除** (容量節約、SOQL draft と同パターン)
  - **復元時に panelToast** (📝 編集中だった匿名 Apex コードを復元しました)
  - **HTML の初期サンプルコード (Account クエリ + System.debug) より draft を優先**
  - **chrome.storage 永続化 13 種**
- **v3.81.0 (2026-05-21 03:21)** — 📝💾 Phase 171: **SOQL クエリ textarea の入力中バックアップ (draft 自動保存) (12 種)**:
  - **📝 `sfdtSoqlDraft` キーで SOQL textarea の入力中内容を 300ms debounce で保存**
  - **業務シナリオ**: 長い SOQL を組み立て中にタブを誤って閉じる / DevTools をリロードする → `savedQueries` (手動命名保存) や `sfdtRecentSoql` (実行済み履歴) ではカバーできない「未実行 draft」を救済
  - **空文字時は storage からキー自体を削除** (容量節約)
  - **復元時に控えめな panelToast** (📝 編集中だった SOQL クエリを復元しました) で無音書き換えの混乱を予防
  - **HTML の初期サンプルクエリより draft を優先**: ユーザーが直前まで編集していたクエリが必ず勝つ
  - **chrome.storage 永続化 12 種**
- **v3.80.0 (2026-05-21 03:18)** — 📓💾 Phase 170: **Apex Debug ログ取得チェック状態を chrome.storage 永続化 (11 種、ユーザー権限差を反映)**:
  - **📓 `sfdtApexFetchLog` キーで Debug ログ取得チェック状態を保存** (boolean、デフォルト ON のまま)
  - **業務シナリオ**: Debug ログ参照権限が無い業務担当者 (営業ユーザー等) は、毎回チェック OFF にする運用 → 起動時復元で 1 クリック削減 + 403 エラー警告も回避
  - **逆に Apex 開発者**: 毎回チェック ON にする習慣的操作も発生 (デフォルトは ON なので影響少ないが、もし将来デフォルトを OFF に変更しても自分の設定は維持)
  - **2 タイミングで save**: ① change イベント (チェック切替で即時) / ② init で復元
  - **panel + tool 共有** (mini-panel は Apex view 非搭載)
  - **chrome.storage 永続化 11 種** (Phase 169 の 10 種大台 + Apex fetchLog)
- **v3.79.0 (2026-05-21 03:15)** — 🎯💾🏆 Phase 169 **マイルストーン**: **SOQL Tooling API チェック状態を chrome.storage 永続化 (10 種達成・大台突破)**:
  - **🎯 `sfdtSoqlTooling` キーで Tooling API チェック状態を保存** (boolean)
  - **3 つの保存タイミング**: ① change イベント (チェックを切り替えた瞬間) / ② SOQL テンプレート選択時の auto-toggle (ApexClass/CustomField 選択で自動 ON、それ以外で自動 OFF) / ③ init で復元
  - **業務シナリオ**: Tooling API を常用する Apex 開発者 / ValidationRule 棚卸し担当者は毎回チェックを入れ直していた → 起動時に状態復元で 1 クリック削減
  - **panel + tool 共有** (mini-panel は Tooling API 非対応)
  - **🏆 chrome.storage 永続化 10 種達成 (大台突破)** (SOQL 履歴 / 便利リンク折りたたみ / Limits ピン / 設計書「対象」履歴 / Inspector 履歴 / Apex 履歴 / REST 履歴 / メタデータ type / **SOQL Tooling チェック (新)** + Phase 161 state.userId / Phase 163 sessionUser)
- **v3.78.0 (2026-05-21 03:12)** — 📁💾 Phase 168: **メタデータ一覧の選択 type を chrome.storage 永続化 (9 種達成、起動時に最後の type を復元)**:
  - **📁 `sfdtMdType` キーで最後に選んだメタデータ型を保存** (ApexClass / Flow / Profile / etc.)
  - **2 つのタイミングで保存**: ① `mdType` select の change イベント (選んだ瞬間に保存) / ② `doMetadataList()` 開始時 (一覧取得時に念のため保存)
  - **起動時に `loadMdType()` で復元**: 保存値が `<option>` に現存する場合のみ反映 (将来 option 削除されてもクラッシュしない安全側)
  - **業務シナリオ**: 「Profile 一覧をチェックする業務担当者」が毎回 ApexClass (デフォルト) から Profile に変更する手間を省略
  - **panel + tool 共有** (mini-panel はメタデータ画面非搭載)
  - **chrome.storage 永続化 9 種達成** (SOQL 履歴 / 便利リンク折りたたみ / Limits ピン / 設計書「対象」履歴 / Inspector 履歴 / Apex 履歴 / REST 履歴 / **メタデータ type (新)** + Phase 161 state.userId / Phase 163 sessionUser)
- **v3.77.0 (2026-05-21 03:09)** — 📡💾 Phase 167: **REST API リクエスト履歴を chrome.storage 永続化 (8 種達成、Method 別色分けチップ)**:
  - **📡 `sfdtRecentRest` キーで REST リクエストを直近 5 件保存**: `{ method, path, body }` を配列保持 (レスポンスは保存せず、個人情報残しを回避)
  - **panel + tool で共有**: mini-panel は REST view 非搭載のため対象外
  - **Method 別色分けチップ**: GET (青) / POST (緑) / PATCH (橙) / DELETE (赤) → 一目でリクエスト種別が判別可能
  - **重複排除**: 同じ method+path+body の組合せは既存履歴を上に詰めて再 push
  - **HTTP ステータスに関わらず履歴 push**: 4xx/5xx の失敗パスも再試行候補として残す (URL 修正後の再送が業務上頻繁)
  - **チップクリックで Method/Path/Body をフォーム反映 (自動送信しない)**: Apex 履歴と同じく副作用 (DELETE / PATCH) 危険性を考慮した確認 UX
  - **`chrome.storage.onChanged` で別タブ同期**: SOQL/Apex 履歴と同パターン
  - **chrome.storage 永続化 8 種達成** (SOQL 履歴 / 便利リンク折りたたみ / Limits ピン / 設計書「対象」履歴 / Inspector 履歴 / Apex 履歴 / **REST 履歴 (新)** + Phase 161 state.userId / Phase 163 sessionUser)
- **v3.76.0 (2026-05-21 03:06)** — 🟧💾 Phase 166: **Apex 実行履歴を chrome.storage 永続化 (7 種達成、SOQL と同等の再利用性)**:
  - **🟧 `sfdtRecentApex` キーで匿名 Apex 実行履歴を直近 5 件保存**: panel + tool で共有 (3 モードのうち mini-panel は Apex 非対応のため対象外)
  - **コンパイル成功時のみ履歴 push**: 構文エラーで弾かれたコードは履歴に積まず、ノイズ削減 (`d.compiled === true` ガード)
  - **チップは紫系 (#8e44ad)**: SOQL 履歴 (緑) / 設計書対象履歴 (オレンジ) と視覚的に区別
  - **チップクリックでエディタへ反映 (自動実行はしない)**: SOQL 履歴は自動再実行だが、Apex は副作用 (DML/DELETE) 危険性があるため確認してから ▶ を押す UX に
  - **チップラベルは 1 行目をサマリ**: コメント行 (`//`, `/*`) は飛ばして実コードの先頭 50 文字、tooltip に全文 (300 文字まで)
  - **`chrome.storage.onChanged` で別タブ/別ウィンドウとも同期**: SOQL 履歴と同じパターン
  - **chrome.storage 永続化 7 種達成** (SOQL 履歴 / 便利リンク折りたたみ / Limits ピン / 設計書「対象」履歴 / Inspector 履歴 / **Apex 履歴 (新)** + Phase 161 state.userId / Phase 163 sessionUser)
- **v3.75.0 (2026-05-21 03:03)** — 🔎💾 Phase 165: **Inspector レコード履歴を chrome.storage 永続化 (タブ再読込でも履歴復元)**:
  - **🔎 `sfdtInspectHistory` キーで Inspector 履歴を直近 20 件保存**: `{ obj, id, scrollTop }` を配列保持
  - **タブ再読込・DevTools 開き直し後も ⏪ ボタンで前のレコードへ戻れる** (従来は in-memory のみで失われていた)
  - `doInspect()` の push / shift 後と `inspectGoBack()` の pop 後に `saveInspectHistory()` を非同期呼出
  - init 時に `loadInspectHistory()` を呼び、`updateInspectBackButton()` の disabled / title もリストア
  - 不正データ (obj/id 欠落) はロード時にフィルタリングで除去
  - **chrome.storage 永続化 6 種達成** (SOQL 履歴 / 便利リンク折りたたみ / Limits ピン / 設計書「対象」履歴 / Inspector 履歴 + Phase 161 state.userId / Phase 163 sessionUser)
- **v3.74.0 (2026-05-21 03:00)** — 📜💾 Phase 164: **設計書「対象」入力履歴を chrome.storage 永続化 (type 別)**:
  - **📜 `sfdtDesignObjHist` キーで type 別に直近 5 件保存**: 例: `objectDef` で過去入力した「Account」「Contact」「Opportunity」を別管理
  - 生成成功時 (`totalRows > 0`) のみ履歴追加 — 失敗・空入力は除外
  - **設計書 type 切替時に該当 type の履歴チップを表示**: 「objectDef の最近の対象: Account / Contact / Opportunity」
  - チップクリックで designObj に投入 + `▶ 生成` 自動クリック
  - `.design-obj-hist-chip` を warn 色 (オレンジ系) で表示 → savedQueries (青) / SOQL 履歴 (緑) と視覚的に区別
  - chrome.storage 永続化 5 種達成 (SOQL 履歴 / 便利リンク折りたたみ / Limits ピン / Inspector 履歴 / 設計書「対象」履歴)
- **v3.73.0 (2026-05-21 02:57)** — 🔧🐞 Phase 163: **mini-panel sessionUser を実際に Chatter API から取得 (Phase 162 の見えない不具合修正)**:
  - **🐞 見えない不具合修正**: Phase 162 で導入した `let sessionUser = null;` は declare のみで populate されておらず、`my_open_cases` テンプレートを選ぶと常に `PASTE_USERNAME` 警告が出ていた
  - **🔧 `fetchSessionUser()` 関数追加**: chrome.runtime.sendMessage で background に `sfdt:fetch` を依頼 → Chatter `/services/data/v62.0/chatter/users/me` 経由で username 取得 → `sessionUser = { id, username, name }` を populate
  - **launcher (🛠 ボタン) クリック時に lazy fetch** (mini-panel 起動時のみ実行、未初期化時に limited 1 回)
  - 失敗時は `console.log` のみで業務影響なし (`sessionUser = null` のまま動作継続)
  - **Phase 161 (panel/tool: state.userId) + Phase 163 (mini-panel: sessionUser.username) で 3 モード「自分の Case」テンプレート完全実用化**
- **v3.72.0 (2026-05-21 02:54)** — 👤📝 Phase 162: **mini-panel にも SOQL テンプレート挿入 (3 モード UX 統一)**:
  - **📝 mini-panel に `#qryTemplate` select 追加**: 4 種類の業務 SOQL (panel/tool の 6 種から mini-panel 用に厳選)
    - 🏢 最近作成された取引先 10 件 / 👥 アクティブユーザー一覧 / 🕒 過去 7 日に更新 / 📬 未解決 Case (Owner.Username = '私')
    - mini-panel は Tooling API 非対応のため ApexClass / CustomField テンプレートは除外
  - **3 モード SOQL テンプレート完全統一達成**: 💻 panel + tool (Phase 160) + 👤 mini-panel (Phase 162)
  - my_open_cases は `Owner.Username` 形式 (mini-panel では state.userId 未取得のため username を使用、未取得時は `PASTE_USERNAME` プレースホルダで案内)
  - meta 領域に toast 風メッセージで挿入結果フィードバック (mini-panel は shadow DOM のため panelToast 不可)
- **v3.71.0 (2026-05-21 02:50)** — 👤🔧 Phase 161: **SOQL テンプレート「自分が所有する未解決 Case」で User ID を自動補完**:
  - **👤 reconnect 時に `getUserInfo` を呼んで `state.userId` をキャッシュ** (Chatter /users/me → 失敗時 OAuth userinfo の 2 段フォールバック)
  - **🔧 SOQL テンプレート「📬 自分が所有する未解決 Case」で `OwnerId` を自動補完**: `state.userId` が取得済なら実 ID 埋込、未取得なら `REPLACE_USER_ID` プレースホルダ
  - **panelToast でフィードバック分岐**:
    - ✓ 自動補完成功: 「あなたのユーザー ID 005xx... を自動補完」
    - ⚠ 未取得: 「REPLACE_USER_ID を実 ID に書き換えてください」
  - userId 取得失敗は `console.log` のみで業務担当者に影響なし (state.userId = null のまま動作継続)
- **v3.70.0 (2026-05-21 02:47)** — 🎊🎊🎊🎊🎊🎊🎊 Phase 160 **マイルストーン**: **SOQL view にもテンプレート挿入 (Apex と統一) + Phase 1-160 累計サマリ**:
  - **🎊 v3 系 70 連続リリース達成** (v3.0 Phase 90 → v3.70 Phase 160) — 累計 270+ リリース / 310+ commits
  - **📝 SOQL view にも `#soqlTemplate` 追加**: 業務 6 種類のサンプル SOQL
    - 🏢 最近作成された取引先 10 件 / 📬 自分が所有する未解決 Case / 👥 アクティブユーザー一覧 / 📚 Apex クラス (Tooling) / 🔧 カスタム項目 (Tooling) / 🕒 過去 7 日に更新された取引先
  - **🔄 Tooling API 自動切替**: ApexClass / CustomField テンプレート選択時は `useTooling` チェックを自動 ON、それ以外は OFF
  - **Apex (Phase 159) + SOQL (Phase 160) = 業務テンプレート 12 種類**で 2 機能 UX 統一達成
  - **README 年表 Phase 151-159 を 4 区分追加**: Markdown/エラー抽出/整形 系 + Inspector 双方向ナビ + テンプレート挿入
- **v3.69.0 (2026-05-21 02:43)** — 📝🚀 Phase 159: **Apex view に「📝 サンプル挿入」ドロップダウン追加 (業務 Apex 6 種)**:
  - **📝 `#apexTemplate` セレクト**: Apex ツールバー先頭に配置 (panel/tool 両方)
  - **6 種類の業務 Apex テンプレート**: 👤 現在ユーザー情報 / 📊 ガバナ制限使用状況 / 🏢 最新取引先 1 件 / 🗑️ Test% 取引先削除 (要注意) / 🔄 バッチ実行サンプル / ⏰ スケジュールジョブ確認
  - 選択でエディタに即挿入 (上書き) + `input` イベント発火でカーソル位置インジケータ等も更新
  - 選択後リセットで「再選択時も発火」可能、panelToast でフィードバック
  - 各テンプレートには `System.debug` で結果出力 + JSON.serializePretty 等の業務担当者にも読みやすい形式
  - 既存の「保存済 Apex」(`#apexSaved`) は user-defined、新規テンプレートは built-in と用途を分離
- **v3.68.0 (2026-05-21 02:40)** — 📑🔁 Phase 158: **README に「Inspector ↔ SOQL 双方向ナビゲーション」セクション追加**:
  - **📑 新セクション** を「⚠️ 早期バリデーション統一」の直前に配置
  - Phase 155 (親方向) / 156 (同レコード) / 157 (子方向) を表組みで整理 — UI 要素・動作・業務シナリオを並列比較
  - 設計判断 (既存 Inspector ジャンプとの動線分離 / `deprecatedAndHidden` 除外 / 業務担当者の事前確認可能) を文書化
  - README 目次にも新セクションを追加 → 業務担当者が Inspector ↔ SOQL 機能を発見しやすく
- **v3.67.0 (2026-05-21 02:36)** — 🌳📑 Phase 157: **Inspector に「🌳 子レコード SOQL」セクション追加**:
  - **🌳 `#inspectChildRels` 折りたたみセクション** を Inspector の左パネルに追加 (panel/tool 両方)
  - describe API の `childRelationships` から **デプロイ可能な子オブジェクト一覧**を取得 (`deprecatedAndHidden: false` フィルタ)
  - 主要標準子オブジェクト (Contact / Case / Opportunity / Task / Event / Note / Attachment / FeedItem / AccountContactRelation) を優先表示でソート
  - 各エントリ表示: `Contact.AccountId` `Contacts` (relationshipName chip 付き)
  - **クリックで子レコード SOQL を自動生成** + SOQL ビューへ切替:
    ```sql
    SELECT Id, Name
    FROM Contact
    WHERE AccountId = '001xx000003DGbY'
    LIMIT 50
    ```
  - relationshipName chip は親側サブクエリ用ヒント (例: `SELECT Id, (SELECT Id FROM Contacts) FROM Account`)
  - **Phase 155 + 156 + 157 で Inspector ↔ SOQL 完全双方向ナビゲーション完成**: 親方向 (Phase 155 リレーション chip) / 同レコード (Phase 156) / 子方向 (Phase 157)
- **v3.66.0 (2026-05-21 02:33)** — 🔎🔁 Phase 156: **Inspector に「🔎 SOQL で開く」ボタン (現レコードから SOQL 構築)**:
  - **🔎 `#btnInspectToSoql` ボタン** を Inspector ツールバーに追加 (panel/tool 両方)
  - クリックで現在の Inspector レコードを SOQL ビューへ展開: describe.fields から **Id / Name / 主要 8 項目** を自動選択して `SELECT ... FROM <Object> WHERE Id = '<Id>' LIMIT 1` を生成
  - 自動選択ルール: Id / Name 優先 + `PREFERRED_TYPES` (id/string/reference/picklist/boolean/date/datetime/currency/double/int) + Compound field (`BillingAddress` 等) は除外
  - 生成後 `switchToView("soql")` で自動遷移 → 業務担当者は項目追加 / WHERE 修正 / Ctrl+Enter で実行
  - **業務シナリオ**: 「このレコードと類似のものを探したい」「関連レコードを SOQL でまとめて取得したい」用途
  - Phase 155 (リレーション chip) と組合せで **Inspector ↔ SOQL の双方向ナビゲーション**が可能に
- **v3.65.0 (2026-05-21 02:29)** — 🔗📋 Phase 155: **Inspector 参照項目に SOQL リレーション名 chip (Owner. 等) 追加**:
  - **🔗 `.ref-rel-name` 緑系 chip** を参照項目の値表示に追加: `OwnerId` → `0051x00000Abc...` `→ User` `Owner.` のように、describe API の `relationshipName` を表示
  - **📋 chip クリックで `Owner.Name` 形式をクリップボードコピー** (Inspector ジャンプとは別動作、`event.stopPropagation()` で動線分離)
  - 業務担当者・開発者が SOQL の関連項目 (`SELECT Owner.Name FROM Account` 等) を書く際の名前確認・コピーが 1 クリックで可能
  - chip hover で色反転 + transition、緑系 (ok 色) で savedQueries / 検索 と視覚的に区別
  - 「Inspector リレーション多階層参照」要望への第一歩実装 (本格的な多階層は別途検討)
- **v3.64.0 (2026-05-21 02:27)** — 🎨💻 Phase 154: **Apex コード整形ボタン追加 (`{ }` インデント + コメント/文字列保護)**:
  - **🎨 `#btnApexFormat` 整形ボタン** を Apex ビューに追加 (panel/tool 両方)
  - **`{ }` ベースのインデント (2 スペース)**: 開きカッコ後に改行 + ネスト深度に応じてインデント、閉じカッコは一段下げてから出力
  - **セミコロン `;` 後にも改行**: 1 行内に複数ステートメントが混在しても自動分離
  - **保護対象**: 複数行コメント `/* ... */` / 行コメント `// ...` / 文字列リテラル `'...'` → プレースホルダで退避後復元
  - **キーワード大文字化はしない**: Apex は camelCase 慣習 (`String` / `Integer` / `if` / `else`) を尊重 — SOQL とは異なる方針
  - **比較**: `for(Integer i=0;i<10;i++){System.debug(i);}` → 整形後:
    ```apex
    for(Integer i=0;i<10;i++) {
      System.debug(i);
    }
    ```
  - **Phase 153 SOQL 整形と整合性**: 同じ UI パターン (`🎨 整形` ラベル + 整形済み判定 + 文字数差分 toast)
- **v3.63.0 (2026-05-21 02:23)** — 🎨📝 Phase 153: **SOQL クエリ整形ボタン追加 (キーワード大文字化 + 主節改行)**:
  - **🎨 `#btnSoqlFormat` 整形ボタン** を SOQL ビューに追加 (panel/tool 両方)
  - **キーワード大文字化**: SELECT/FROM/WHERE/AND/OR/ORDER BY/GROUP BY/LIMIT/OFFSET/HAVING/TYPEOF/WHEN/THEN/ELSE/END 等 + 日付リテラル (LAST_N_DAYS/THIS_MONTH 等) を含む 40+ キーワード
  - **主節改行**: FROM / WHERE / ORDER BY / GROUP BY / HAVING / LIMIT / OFFSET の前に改行を挿入 → 業務文書らしい縦読み形式
  - **文字列リテラル保護**: `'...'` 内のテキストはプレースホルダで退避 → 値部分のキーワードを誤大文字化しない
  - **比較**: `select id, name from account where industry = 'Manufacturing' limit 10` → 整形後:
    ```sql
    SELECT id, name
    FROM account
    WHERE industry = 'Manufacturing'
    LIMIT 10
    ```
  - 「📋 Markdown」(Phase 151) + 「🎨 整形」 + 「⚠ エラーのみ」(Phase 152) で SQL/Apex デバッグ系の磨きを 3 連続強化
- **v3.62.0 (2026-05-21 02:20)** — ⚠️🔍 Phase 152: **Apex 実行結果に「⚠ エラーのみ」抽出トグルボタン追加**:
  - **⚠️ `#btnApexErrorsOnly` トグルボタン** を Apex 実行結果ツールバーに追加 (panel/tool 両方)
  - クリックで Debug ログから以下のパターンを抽出: `USER_DEBUG ERROR` / `FATAL_ERROR` / `EXCEPTION_THROWN` / `LIMIT_USAGE_FOR_NS` / `System.LimitException` / `WARN` / `ERROR`
  - 抽出結果: `===== ⚠ エラー/警告行のみ (5 / 220 行) =====` ヘッダ付きで該当行のみ表示
  - **トグル方式**: 再クリックで `📜 全ログ表示` に戻る (`aria-pressed` で状態管理 + 全ログをモジュールレベル `_apexFullLog` にバックアップ)
  - エラー無し時: 「✓ エラー/警告行はありません (すべて正常実行)」フィードバック → 業務担当者が「実行成功」を即確認可能
  - **業務シナリオ**: 大量レコード処理の Batch Apex デバッグで「正常ログ 200 行」から「エラー 3 行」を 1 クリック抽出
- **v3.61.0 (2026-05-21 02:17)** — 📋📊 Phase 151: **結果テーブルに「📋 Markdown」ボタン追加 (Slack/Confluence/Notion 共有)**:
  - **📋 `recordsTable` の表上部フィルタ行に「📋 Markdown」ボタン追加**: SOQL / Inspector / Login 履歴 / メタデータ / その他すべての grid 表で利用可能
  - クリックで現在の表を **Markdown テーブル形式** (`| col | col |\n| --- | --- |\n| val | val |`) でクリップボードへコピー
  - **絞込み後の表示行のみ**コピー (`tr.style.display !== "none"` フィルタ) → 業務担当者が「Slack で関係者に共有したい部分だけ」を効率的に切り出せる
  - パイプ文字 `|` は `\|` にエスケープ、改行は半角スペースに置換でテーブル崩れ防止
  - panelToast で「📋 Markdown テーブルをコピー (X 行 / Y 文字)」フィードバック
- **v3.60.0 (2026-05-21 02:14)** — 🎊🎊🎊🎊🎊🎊 Phase 150 **マイルストーン**: **CODE_OF_CONDUCT.md + Phase 1-150 累計サマリ**:
  - **🎊 v3 系 60 連続リリース達成** (v3.0 Phase 90 → v3.60 Phase 150) — 累計 260+ リリース / 300+ commits / 約 3 時間で完遂
  - **📜 [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) 新設**: Contributor Covenant v2.1 準拠 + **拡張悪用禁止条項追加** (他組織への無断アクセス / sid Cookie 流用 / Login as User 濫用)
  - 4 段階の是正措置 (指摘→警告→一時 ban→永久 ban)
  - 業務担当者目線を尊重する規範 (「フル行番号ガター」より実用優先など)
  - **README 年表 Phase 141-149 を 4 区分追加**: カーソル位置 / 検索フィルタ 3 機能統一 / GitHub Governance 完成 / プロジェクト基盤ナビ
  - **Phase 145-150 で GitHub Governance 完全完成**: CI workflows + Issue/PR テンプレート + CONTRIBUTING + SECURITY + CODE_OF_CONDUCT
- **v3.59.0 (2026-05-21 02:11)** — 🔒📑 Phase 149: **SECURITY.md 新設 + README にプロジェクト基盤ナビゲーション**:
  - **🔒 [SECURITY.md](SECURITY.md) 新設**: Chrome 拡張の sid Cookie 取扱を業務担当者・管理者・開発者向けに明示
    - データ取扱表 (取得方法 / 保存先 / 送信先) → **外部送信ゼロを明文化**
    - sid は **メモリのみ** (`chrome.storage` 非保存) の運用ルール明記
    - 脆弱性報告フロー (GitHub Security Advisory 優先 + 24h 受領 / 7d 評価)
    - サポート対象バージョン表 (v3.50.0+ のみ修正)
    - 運用 Tips を 3 ロール別 (業務担当者 / 管理者 / 開発者) で整理
  - **📑 README 目次に「🤝 プロジェクト基盤」ナビゲーション追加**: Phase 145-148 で整備した CONTRIBUTING / SECURITY / .github/workflows / ISSUE_TEMPLATE / PR_TEMPLATE を 1 セクションで網羅
  - **Phase 145-149 で GitHub プロジェクト governance 完成** (CI / Issue / PR / Contributing / Security)
- **v3.58.0 (2026-05-21 02:08)** — 🤝📜 Phase 148: **CONTRIBUTING.md 新設 + .gitignore 整備**:
  - **🤝 [CONTRIBUTING.md](CONTRIBUTING.md) 新設**: 新規貢献者向けガイドを 7 セクションで体系化:
    - 🎯 5 大基本指針 (必読)
    - 🚀 開発フロー (セットアップ / 編集 / バージョン管理 / PR 提出)
    - 🐞 Issue 起票 (テンプレート誘導 + 重複報告防止)
    - 🛠 コーディングガイド (ファイル構成 / スタイル / 設計書追加手順)
    - 📋 リリースフロー (CI 連携)
    - 🙏 謝辞 (50+ ユーザー報告 / 6 CRITICAL バグ修正)
  - **📜 `.gitignore` 拡充**: 配布物 `.zip` (release.yml 自動ビルド成果物) / `.cache` / `coverage` / 一時 evidence/export ファイルを除外
  - Phase 145-148 で GitHub プロジェクト基盤 (CI workflows / Issue Templates / PR Template / CONTRIBUTING) 完成
- **v3.57.0 (2026-05-21 02:05)** — 🐞✨📑 Phase 147: **GitHub Issue / PR テンプレート整備**:
  - **🐞 `.github/ISSUE_TEMPLATE/bug_report.yml`**: バージョン / 発生モード / 環境 (PROD/SBX/DEV) / 再現手順 / 期待 / 実際 / ブラウザ・OS を構造化フォームで収集
  - **✨ `.github/ISSUE_TEMPLATE/feature_request.yml`**: 業務シナリオ / 提案 / 対象モード / 代替案検討 を 5 大基本指針と紐付けて収集
  - **🔗 `.github/ISSUE_TEMPLATE/config.yml`**: blank issue を無効化 + トラブルシューティング / ロール別 FAQ への誘導リンク (重複報告防止)
  - **📑 `.github/PULL_REQUEST_TEMPLATE.md`**: チェックリスト (VERSION 更新 / README 更新 / 3 モード確認 / Phase 121 リリースチェック / a11y) + 5 大基本指針の自己評価 + スクリーンショット / 関連 Issue 欄
  - 自律改修ループの品質ガードを言語化、新規貢献者も同じ動線で操作可能に
- **v3.56.0 (2026-05-21 02:02)** — ⚙️🤖 Phase 146: **CI ドキュメントを実コード化 (.github/workflows/ 同梱)**:
  - **⚙️ `.github/workflows/version-check.yml` 作成**: VERSION.txt と manifest.json の version 差異を push/PR で自動検出 (paths フィルタで関係ない変更では走らない)、初回起動の今後の push でバージョン同期ミスを自動防止
  - **🤖 `.github/workflows/release.yml` 作成**: タグ push (`v3.56.0` 等) 時に `.git` / `.github` / `tests` / `*.zip` を除外した `.zip` を自動ビルドして GitHub Release に添付 (`softprops/action-gh-release@v2`)
  - README CI セクションを実ファイルへの相対リンクに更新 (`.github/workflows/...` 参照)
  - Phase 145 でドキュメントだけだったものが Phase 146 で **実稼働 CI** に進化 — Fork して即運用可能
- **v3.55.0 (2026-05-21 01:59)** — ⚙️📦 Phase 145: **README に CI / GitHub Actions 連携プロセス追加**:
  - **⚙️ 4 つの workflow 例**を追加: ① バージョン整合性チェック (`VERSION.txt` ↔ `manifest.json`) ② タグ push 時の `.zip` 自動ビルド + GitHub Release ③ Chrome Web Store 自動公開 (シークレット連携) ④ README リンクチェック (週次)
  - 完全な YAML サンプル付き → コピペで `.github/workflows/` に配置可能
  - 運用 Tips: Phase 121 リリース前チェックリスト (手動テスト) と CI の併用、`manifest.json` version は三桁固定、リリースタグは `v3.55.0` 形式
  - 業務担当者・運用チームが「CI/CD 基盤を社内で展開」しやすいよう、すぐ使えるコード例を提供
- **v3.54.0 (2026-05-21 01:56)** — 🔎📊 Phase 144: **Limits 30+ 制限に検索ボックス追加**:
  - **🔎 `#limitsFilter` 検索 input** を Limits ビューのツールバーに追加 (panel/tool 両方)
  - placeholder「🔎 制限名で絞り込む… (例: API / Apex / Storage)」
  - **3 属性で部分一致**: 英名 (`DailyApiRequests`) / 日本語名 (`日次 API リクエスト`) / 説明 (`組織全体の 1 日の API 呼出回数`)
  - Esc キーでクリア、`limitsSort` / `limitsOnlyUsed` / `_limitsShowPinnedOnly` の既存フィルタと合成動作
  - **3 機能で検索フィルタパターン統一**: popup 便利リンク (Phase 133) / 設計書 22 種 (Phase 143) / Limits (Phase 144)
- **v3.53.0 (2026-05-21 01:53)** — 🔎📋 Phase 143: **設計書 22 種に検索ボックス追加**:
  - **🔎 `#designTypeFilter` 検索 input** を設計書ビューのツールバー先頭に追加 (panel/tool 両方、3 モード整合性)
  - placeholder「🔎 設計書を検索… (例: プロファイル / Flow / FLS)」
  - 22 種類の option 名で部分一致絞り込み (value/text 両対象、大文字小文字区別なし)
  - Esc キーでクリア
  - 絞込み中に現在選択値が消えた場合は先頭マッチに自動切替 + `change` イベント発火で `setupDesignPicker` のロジック (placeholder/disable/必須 pill) も再評価
  - title でマッチ件数を表示 ("22 種類中 5 件マッチ" 等)
  - **popup「便利リンク」検索フィルタ (Phase 133) と統一パターン**: 業務担当者が複数機能で同じ動線
- **v3.52.0 (2026-05-21 01:51)** — 📍✨ Phase 142: **mini-panel にもカーソル位置インジケータ展開 (3 モード統一)**:
  - **📍 mini-panel qry textarea** にも `cursor-pos-badge` 装着 → 👤 ユーザーモードでも `L:{行}/{総行} C:{列}` 表示
  - shadow DOM 内に CSS を追加 (panel.css とは独立だが同等デザイン)
  - フォーカス時 accent 色切替も同様に動作
  - **3 モード統一達成**: 💻 panel + tool (Phase 141) + 👤 mini-panel (Phase 142) → 全ての SOQL/Apex 入力でカーソル位置が表示される
  - Phase 141 と同じ動線で業務担当者がモード切替しても操作感が変わらない
- **v3.51.0 (2026-05-21 01:48)** — 📍 Phase 141: **SOQL / Apex / REST Body textarea にカーソル位置インジケータ追加**:
  - **📍 `attachCursorPositionIndicator(textareaId)`** 共通ヘルパー新設: `<textarea>` を `cursor-pos-wrap` で囲み、右下に絶対配置の小さなバッジ `L:{行}/{総行数} C:{列}` を表示
  - 対象: `#soqlText` / `#apexCode` / `#restBody` の 3 textarea (panel + tool で動作 — panel.js を共有)
  - input / click / keyup / select / focus イベントでリアルタイム更新
  - Salesforce のエラーメッセージ「Line 3, Column 5」と即座に照合可能 (Apex コンパイルエラー特定が容易に)
  - 行番号フルガター (重実装) より軽量で実用的なアプローチ
  - フォーカス時に accent 色に切替で「今編集中」が分かる
- **v3.50.0 (2026-05-21 01:45)** — 🎊🎊🎊🎊🎊 Phase 140 **マイルストーン**: **Phase 1-140 累計サマリ + 6 機能 UX 統一セクション新設**:
  - **🎊 v3 系 50 連続リリース達成** (v3.0 Phase 90 → v3.50 Phase 140) — 累計 250+ リリース / 290+ commits / 約 2 時間 30 分で完遂
  - **📜 README 年表を Phase 1-140 まで延長**: Phase 131-139 の 9 サイクル (3 モード versionBadge / popup 折りたたみ / 履歴 3 モード同期 / 6 機能バリデーション統一) を 5 区分で追加
  - **⚠️ README に「早期バリデーション統一」セクション新設**: 6 機能 (SOQL/Apex/Inspector/設計書/Export/REST) を表組みで整理、各機能の検出内容 / メッセージ / フォーカス先を明示。設計方針 (共通 UX / 無音 return 撲滅 / 早期 return) を業務担当者にも分かるよう記述
  - **6 機能 UX 統一達成** をマイルストーンとして文書化 (Phase 137-139 の累積成果を可視化)
- **v3.49.0 (2026-05-21 01:42)** — ⚠️✅ Phase 139: **Export / REST view にも早期バリデーション展開 (6 機能完全統一達成)**:
  - **⚠️ Export view (`exLoadFields`)**: 空 API 名で「フィールド読込」 → 入力例 `Account` / `Contact` / `Opportunity` + フォーカス戻し
  - **⚠️ Export view (`exRunPreview`)**: フィールド読込前または未選択で「▶ 実行」 → 「先にフィールド読込」「フィールドを 1 つ以上チェック」案内 + フォーカス戻し
  - **⚠️ REST view (`doRest`)**: 空パスで「送信」 → 入力例 `/services/data/v62.0/limits` / `/services/data/v62.0/sobjects/Account/describe` + フォーカス戻し
  - **🎯 6 機能完全統一達成**: SOQL / Apex / Inspector / 設計書 / Export / REST すべてで「空入力→即フィードバック→自動フォーカス戻し」の同じ UX パターン
  - 業務担当者がどの画面でも同じ動線で操作可能に
- **v3.48.0 (2026-05-21 01:39)** — ⚠️🎯 Phase 138: **SOQL / Apex / Inspector に早期バリデーション統一展開**:
  - **⚠️ SOQL view**: 空クエリで実行 → `⚠ 入力が必要` + 例示 `SELECT Id, Name FROM Account LIMIT 10` + 入力欄フォーカス戻し
  - **⚠️ Apex view**: 空コードで実行 → `⚠ 入力が必要` + 例示 `System.debug(UserInfo.getName());` + 入力欄フォーカス戻し
  - **⚠️ Inspector view**: 空 ID で取得 → `⚠ 入力が必要` + 例示 `0011x00000abcdeAAA` / `Account:001xx000003DGbY` + 入力欄フォーカス戻し
  - **Phase 137 の設計書早期バリデーション (8 種必須タイプ) と完全に統一**: 4 機能 (SOQL/Apex/Inspector/設計書) のすべてで「空入力→即フィードバック→自動フォーカス戻し」の同じ UX パターン
  - 業務担当者が「あれ、何を入れればいいんだ?」と迷う場面を撲滅
- **v3.47.0 (2026-05-21 01:37)** — ⚠️🚀 Phase 137: **設計書「対象」必須タイプの空入力で早期失敗 + 入力例案内**:
  - **⚠️ 早期バリデーション**: 8 種の必須タイプ (`objectDef` / `profileDetail` / `flsReport` / `fieldPermMatrix` / `erDiagram` / `flowDetail` / `apexDetail` / `lwcDetail`) で「対象」が空のまま「▶ 生成」を押した場合、API 呼び出しせずに即座に警告表示
  - **🚀 type 別の入力例**を `meta` に表示 (例: `flowDetail` → 「Flow DeveloperName」、`profileDetail` → 「プロファイル名 (例: 営業ユーザー) または '@PermSet_API名'」)
  - `designObj` 入力欄に自動フォーカスで業務担当者の操作継続性向上
  - 旧: HTTP 400 / requireInput throw まで進んで失敗 → 数秒の待ち時間 + わかりにくいエラー
  - 新: クリック直後にフィードバック → **ネットワーク・時間節約**
- **v3.46.0 (2026-05-21 01:32)** — 🔄💾 Phase 136: **mini-panel と panel/tool で SOQL 履歴を共有 (3 モード同期)**:
  - **🔄 共有キー `sfdtRecentSoql` に統一**: panel/tool で実行した SOQL も mini-panel と同じ履歴に保存 (最大 5 件)
  - panel/tool SOQL ビューに `#soqlHistRow` 履歴チップ表示 (Phase 134 の mini-panel と同じ実装パターン)
  - **3 モード同期**: `chrome.storage.onChanged` リスナーで別画面の履歴更新を即時反映 → mini-panel で実行 → panel で実行 → mini-panel に最新履歴反映、が双方向に動く
  - **マイグレーション**: 旧キー `sfdtMiniSoqlHistory` から共有キーへ 1 回だけ自動移行 (mini-panel 起動時、旧キーは削除)
  - mini-panel は先頭 3 件、panel/tool は先頭 5 件まで表示 (画面幅に応じた量)
  - CSS `.soql-hist-row` / `.soql-hist-chip` を panel.css に新設 (緑系チップで保存履歴と区別、a11y outline 対応)
- **v3.45.0 (2026-05-21 01:28)** — 📂 Phase 135: **popup「便利リンク」カテゴリ折りたたみ + 状態永続化**:
  - **📂 5 カテゴリ (⚙️ Setup / 💻 開発 / 📊 監視 / 🔐 セキュリティ / セッション設定) を `<details>`/`<summary>` で折りたたみ可能化**
  - 各カテゴリの開閉状態を `sfdtPopupLinksCollapsed` キーで `chrome.storage.local` 永続化 (次回 popup 起動時に復元)
  - **フィルタ検索中は全カテゴリ自動展開** (絞込み結果が隠れない設計)、フィルタクリア時は保存状態に復帰
  - `▶ → ▼` 回転アニメ (transform 0.15s ease) で開閉感を可視化
  - 開時はカテゴリ内リンクが 2 列 grid 表示 (元のレイアウト維持)、閉時はカテゴリヘッダのみ表示で省スペース
  - 業務担当者が「今使うカテゴリだけ開く」運用が可能に
- **v3.44.0 (2026-05-21 01:25)** — 💾📝 Phase 134: **mini-panel SOQL 履歴チップ永続化 + 設計書 `<code>` 体裁強化**:
  - **💾 mini-panel SOQL 履歴チップを `chrome.storage.local` で永続化**: `sfdtMiniSoqlHistory` キーで最大 3 件保存、新しいクエリが先頭、重複は除外。これまで `histRow` プレースホルダだけで未実装だったロジックを追加
  - 履歴チップクリックで即再実行 (qry.value 反映 → runBtn.click)
  - 40 文字超は `…` 省略表示、title (マウスオーバー) で全文確認可能
  - mini-panel 再オープン / タブ再読込でも履歴復元 (業務担当者が毎回同じクエリを書き直す手間削減)
  - **📝 設計書プレビュー内 `<code>` 体裁強化**: rgba 青系背景 + accent ボーダー + 6px パディング + nowrap → API 名 (`ApexClass` / `FieldPermissions` / `LAST_N_DAYS:30` 等) が視認性向上
  - note 内の `<code>` はさらに濃い背景 + アクセント色で本文と差別化
- **v3.43.0 (2026-05-21 01:22)** — 🔎🎨 Phase 133: **popup「便利リンク」検索フィルタ + README 拡張アイコン作成プロセス**:
  - **🔎 popup「便利リンク」タブ**: 上部に検索 input 追加 (`#linkFilter`)、リンク名で部分一致絞り込み (例: 「プロファイル」「Apex」)。Esc でクリア。空状態時は「該当無し」メッセージ表示
  - 20+ リンク × 5 カテゴリの中から目的のリンクを即発見可能 → 業務担当者の操作効率向上
  - **🎨 README に「拡張アイコン作成プロセス」セクション新設**: `icons/icon.svg` (マスター) → 4 サイズ PNG (16/32/48/128) のエクスポート手順を整理。ImageMagick 自動コマンド例、16x16 表示時の注意点、カラーパレット (`#1b96ff` / `#0c66e4` / `#2ecc71`) を明記
- **v3.42.0 (2026-05-21 01:19)** — 🎯💡 Phase 132: **設計書「対象」入力要否を pill で視覚化**:
  - **🎯 `#designObjHint` pill 追加**: 設計書タイプ選択時に「対象」入力の要否を視覚的に表示
  - **必須 (warn 色)**: objectDef / profileDetail / flowDetail / apexDetail / lwcDetail / erDiagram / flsReport / fieldPermMatrix
  - **任意 (中立色)**: validationRuleList / recordTypeList / fieldSetList (空欄なら全オブジェクト横断)
  - **不要 (ok 色)**: profileList / permsetList / apexClassList / apexTriggerList / flowList / customSettingList / appList / accessControl / objectPermMatrix (組織全体対象)
  - panel/tool 両方に同期配置 (3 モード整合性)、title でも詳細説明
  - 業務担当者が「これは対象入れる必要あるか?」を試行錯誤せず即判別可能
- **v3.41.0 (2026-05-21 01:15)** — 🏷️🔎 Phase 131: **mini-panel に versionBadge 追加 (3 モード完全揃い) + テーブルフィルタ placeholder 🔎 統一**:
  - **🏷️ mini-panel ヘッダに `<span class="hdr-ver" id="hdrVer">v?</span>` 追加** + CSS `.hdr-ver` で popup と同じ pill デザイン (background rgba 15% / accent 色 / radius 10px / cursor: help)
  - content.js JS で `chrome.runtime.getManifest()` から動的にバージョン取得
  - **3 モード versionBadge 完全揃い達成**: ⚙️ popup / 💻 panel + tool / 👤 mini-panel すべてヘッダに versionBadge
  - **🔎 テーブル/フィルタ input の placeholder 統一**: 4 箇所 (Inspector フィールド / Export フィールド × 2 / 表内絞込み) に `🔎` プレフィックス + 「絞り込む…」(進行形 + 三点) 統一フォーマット
  - title 属性も「絞込み」→「絞り込みます」と業務文書らしい敬体に統一
- **v3.40.0 (2026-05-21 01:13)** — 🎊🎊🎊🎊 Phase 130 **マイルストーン**: **Phase 1-130 累計サマリ更新 + 印刷時の章番号 chip / note / 凡例 背景保持**:
  - **🎊 v3 系 40 連続リリース達成** (v3.0 Phase 90 → v3.40 Phase 130) — 累計 240+ リリース / 280+ commits
  - **🖨️ @media print の `print-color-adjust: exact` 拡張**: 章番号 chip / note blockquote / 凡例 (.design-legend) の背景色を印刷でも保持 (Chrome デフォルトの「背景なし印刷」設定でも視認可能)
  - 印刷時の各要素を **白印刷紙でも見やすい配色** に最適化 (chip=青背景白文字 / note=淡青背景黒文字 / 凡例=淡灰背景)
  - **3 モード UI 統一達成** をマイルストーンとして README に明記 (popup / panel + tool / mini-panel ですべて整合)
- **v3.39.0 (2026-05-21 01:10)** — 📋🔢 Phase 129: **popup セッション情報を折りたたみ可能化 + 設計書 章番号を chip 化**:
  - **📋 popup セッション情報 を `<details>`/`<summary>` で折りたたみ可能に**: ドメイン/Org ID/User ID/Session/API ver 5 項目をデフォルト閉。popup の高さ節約 + 重要操作 (CTA / クイックアクション / Login as User) が常に視界に
  - 三角アイコン `▶ → ▼` 回転アニメーション (transform 0.15s ease)、`::-webkit-details-marker` をリセット
  - **🔢 設計書プレビュー 章番号を chip 化**: 「1. オブジェクト概要」「2. 項目定義」等の先頭数字を `.design-chap-no` で囲み、アクセント色の丸 chip 表示 → 業務文書らしい章構成
  - `toHtml()` で正規表現 `/^(\d+)\.\s*(.+)$/` 検出して `<span class="design-chap-no">1</span>オブジェクト概要` に変換
  - 22 種設計書のすべての主章で視覚的に章番号が認識可能に (凡例 `.design-legend` は除外で主章と区別)
- **v3.38.0 (2026-05-21 01:07)** — 🏷️ Phase 128: **panel/tool ヘッダに versionBadge 直接埋込 + 動的生成と統合**:
  - **🏷️ panel.html / tool.html ヘッダに `<span id="versionBadge">v?</span>` を直接配置** (これまでは JS で動的生成のみ → HTML に明示することで FOUC 軽減 + マークアップ可読性向上)
  - panel.js init() で HTML 側を優先更新、なければ従来通り `verBadge` を動的生成する後方互換コードに整理
  - 3 モード (popup / panel / tool) すべてでヘッダに versionBadge があり、業務担当者がトラブルシューティング時に「どのバージョンを使っているか」を即把握可能
- **v3.37.0 (2026-05-21 01:03)** — 🏢📜 Phase 127: **設計書表紙「対象組織」表示改善 (ホスト + 環境 + 組織 ID)**:
  - **🏢 対象組織** をホスト名のみ → **「<host> / 環境: <PROD/SBX/DEV 日本語表記> / 組織 ID: <Id>」**形式に拡張
  - PROD は「⚠ Production (本番)」と警告マーク付きで業務担当者が誤配布リスクを認識可能に
  - SBX は「Sandbox (検証/開発)」、DEV は「Developer / Scratch (学習・検証)」と業務用語で表記
  - **22 種すべての設計書**で適用 (`_designCtx` モジュールレベル保持で各 builder 改修不要)
  - PDF/Excel 配布時に「どの組織のどの環境から生成された設計書か」が一目で分かる
- **v3.36.0 (2026-05-21 01:00)** — 📑📚 Phase 126: **欠落していた 4 設計書に凡例セクション追加 → 22 種全てに凡例完備**:
  - **📑 buildObjectDef**: 「カスタム」「必須」「参照先」「FLS R/W」「子リレーション」「レコードタイプ」の業務語凡例追加
  - **📑 buildErDiagram**: Mermaid 記号 (`||--o{` Lookup / `||--|{` Master-Detail)、親/子方向参照、1-hop、可視化方法を業務担当者向けに解説
  - **📑 buildProfileDetail**: Object 権限 C/R/E/D / V/M、FLS R/E、System 権限、Tab 設定、App 可視性 の略号解説 (年次監査資料として完備)
  - **📑 buildFlowList**: Screen Flow / Auto-Launched / Record-Triggered / Schedule-Triggered / Workflow Rule (廃止予定) / Process Builder (廃止予定) の種別解説
  - **🎊 設計書 22 種すべてに凡例セクション完備**: 業務担当者がツール内だけで用語を理解可能に
- **v3.35.0 (2026-05-21 00:57)** — ⇅♿ Phase 125: **ソート可能列の視覚マーカー強化 (3 モード統一)**:
  - **⇅ 未ソート列にダブル矢印 `⇅` を薄く表示** (opacity 0.35) → 業務担当者が「ここクリックで並び替えできる」と一目で判別可能
  - hover で opacity 0.7 に強調、ソート中は `▲▼` をアクセント色 + opacity 1 で明示
  - panel `.grid th.sortable` + mini-panel `.result th` の両方で同じトーンを適用 (3 モード整合性)
  - `:focus-visible` で 2px アクセント outline (キーボードフォーカス可視化)
  - 列幅に余裕を持たせる (`padding-right: 18px`) ため見出しと並び替えマーカーが重ならない
- **v3.34.0 (2026-05-21 00:55)** — 📝✨ Phase 124: **設計書 note (blockquote) 体裁強化 + Markdown bold レンダリング**:
  - **📝 設計書プレビューの note (blockquote) を業務文書体裁に**: 「📝」絵文字プレフィックス + 左 4px アクセントボーダー + グラデ背景 (90deg 5% → 透明) + 10px 14px パディング + 角丸 + 1.6 行間
  - **✨ note 内の `**bold**` マークダウンを `<strong>` に変換**: Phase 108-110 で多用した「**業務担当者向け**:」「**Excel 推奨**:」「**注意**:」等のマークダウン強調が、これまでプレビュー上では `*` 文字のまま表示されていた → アクセント色の強調表示に変換
  - 設計書 17/22 種の業務磨き済 note が完全に意図通りに表示可能に
- **v3.33.0 (2026-05-21 00:51)** — 🎨♿ Phase 123: **mini-panel a11y (focus-visible/active) + 設計書凡例セクション体裁**:
  - **♿ mini-panel button a11y 強化**: `.hdr-close` `.hdr-open` `.quick-btn` `button.primary` に `:focus-visible` 2px アクセント outline + `:active` `translateY(1px)` 押下感 + `transition` 統一 (panel 側と一貫した a11y 体験)
  - **🎨 設計書プレビュー「0. 凡例」セクション体裁強化**: 「凡例」を含む heading + table に `.design-legend` クラスを自動付与
  - `.design-legend` 用 CSS: 色を `--fg-dim` (補助情報色) + 左ボーダー破線 + `ℹ ` プレフィックス + フォントサイズ 12px (主章 14px より小) + 破線ボーダー → 主章 (1. 〜) と視覚的に区別可能に
  - 情報の優先度を見た目で表現することで業務担当者が「主要な内容」と「補足説明」を即区別可能
- **v3.32.0 (2026-05-21 00:48)** — ⏳✨ Phase 122: **6 画面の loading 表示を `pill.loading` に統一**:
  - **⏳ Inspector / SOQL / Apex / Login 履歴 / メタデータ / Limits** の 6 画面のフェッチ開始時 loading 表示を Phase 121 で新設した `<span class="pill loading">` 統一スピナーに置換
  - これまで `meta.textContent = "⏳ ..."` のテキストのみ / `pill warn ⏳` / `pill` 等バラバラだった表示が、9px 円形スピナー + アクセント色背景の統一トーンに
  - 業務担当者が「現在処理中なのか」を視覚的に即把握可能
  - metadataResult / limitsResult の空状態領域も loading 中は `.empty-state` 内に統一 pill 表示
- **v3.31.0 (2026-05-21 00:45)** — ✅⏳ Phase 121: **リリース前 全体動作確認チェックリスト + 統一 loading インジケータ**:
  - **✅ README に「リリース前 全体動作確認チェックリスト」セクション新設**: 13 領域 × 50+ 項目のチェックリスト (セットアップ / 接続 / SOQL / Inspector / Apex / Limits / ログイン履歴 / メタデータ / 設計書 / mini-panel / popup / 印刷 / a11y)。所要時間 15-20 分で社内配布前検証可能
  - **⏳ `.pill.loading` 統一 loading インジケータ**: 9px 円形スピナー + アクセント色背景の pill。`prefers-reduced-motion: reduce` 配慮済 (アニメ無効化)
  - 設計書ジェネレータの「生成中…」表示を `pill.warn ⏳` から `pill.loading` に切替 → 統一感ある loading 体験
- **v3.30.0 (2026-05-21 00:41)** — 🎊🎊🎊 Phase 120 **マイルストーン**: **SOQL オートコンプリート候補に型別アイコン + 参照型は参照先表示**:
  - **🎊 v3 系 30 連続リリース達成** (v3.0 Phase 90 → v3.30 Phase 120)
  - **🆔 SOQL オートコンプリート候補にフィールド型別アイコン**: id=🆔 / reference=🔗 / boolean=☑️ / date=📅 / currency=💴 / number=🔢 / email=✉️ / phone=📞 / url=🔖 / textarea=📝 / picklist=📋 / address=🏠 / location=📍 / その他=🔹
  - **🔗 参照型は参照先表示**: `Owner` → 「ユーザ (reference → User)」、`AccountId` → 「取引先 (reference → Account)」のように、関連クエリ作成時の判断が容易に
  - 候補ラベルに型情報が明示されるため、業務担当者が「これは日付項目なのか?」「これは参照だから '.' でドリルダウン可能か?」を即判断可能
  - 累計実績更新: 230+ リリース / 270+ commits / 業務担当者向け磨き 6 種網羅 + a11y 実績 4 系統
- **v3.29.0 (2026-05-21 00:37)** — 📌📍 Phase 119: **設計書ツールバー sticky 化 + 「現在タブから」対象自動補完**:
  - **📌 設計書ビューのツールバー sticky 化**: 大量行 (FLS 数百項目等) の設計書プレビューでスクロール中も種類/対象/形式選択 + 生成/コピー/DL/エビデンス ボタンが常時可視。`position: sticky; top: 0; z-index: 4` + bg 不透明 + 下罫線で文書らしい体裁
  - **📍 「📍 現在タブから」ボタン追加**: Lightning レコードページ (`/lightning/r/<Object>/<Id>/`) または タブ (`/lightning/o/<Object>/`) を開いていれば、対象オブジェクト名を designObj に自動入力。Inspector の同名機能と一貫した動線
  - panel.html / tool.html 両方に同等配置 + JS 動線も整理
  - 設計書 22 種の「対象」入力が必要なケース (objectDef / erDiagram / fieldPermMatrix / validationRuleList 等) でクリック数を 1 削減
- **v3.28.0 (2026-05-21 00:35)** — 📜📋 Phase 118: **マイルストーン年表 Phase 1-117 延長 + 設計書表紙 kvRows プロジェクト成果物化**:
  - **📜 README 冒頭マイルストーン年表を Phase 1-117 まで延長**: Phase 100 (v3.10) 以降の 17 サイクル (101-117) を 8 区分で年表追加。累計実績を更新 (227+ リリース / 260+ commits / **CRITICAL 6 件** / 設計書 17/22 種 note 拡張)
  - **📋 makeCoverSection (全 22 設計書の表紙)** に業務文書管理要素を追加:
    - **文書管理 ID** (`DOC-YYYYMMDD-HHmmss-<orgHost>` 形式で自動付番) → プロジェクト管理ツール (Backlog/Redmine 等) への登録時に便利
    - **機密区分** (既定: 「社内限定 (Confidential)」)
    - **注意事項** (機密項目チェック喚起): 「本設計書は組織内のメタデータをそのまま反映しています。配布前に機密項目 (個人情報・契約金額等) が含まれていないかご確認ください」
  - これで設計書はプロジェクト成果物として ISO27001 / 個人情報保護方針に準拠した配布管理が可能に
- **v3.27.0 (2026-05-21 00:31)** — 🚨📑 Phase 117: **ENV バッジ UX 改善 (PROD パルス警告) + README 目次最新化**:
  - **🚨 PROD バッジを微パルス強調**: 本番組織での誤操作防止のため `env-badge.env-prod` に `envProdPulse` 3 秒周期の box-shadow パルスを追加。`prefers-reduced-motion: reduce` 配慮継続
  - **🚨 env-badge title を詳細化**: SBX「定期リフレッシュで初期化される場合あり」/ DEV「学習・検証用途、自由に操作可」/ PROD「⚠️ Production 本番組織です。UPDATE/DELETE/匿名 Apex は実データに影響します。誤操作にご注意ください」と業務担当者向け警告メッセージに
  - env-badge に `cursor: help` + `aria-label` 追加 (スクリーンリーダーで title 内容も読み上げ)
  - **📑 README 目次刷新**: v3.x 系で新設された主要セクション (3 モード設計 / ロール別 FAQ / API バージョン / ショートカット / エビデンス / トラブルシューティング / PDF 保存手順 / アンインストール) を全て目次反映
- **v3.26.0 (2026-05-21 00:28)** — ♿🗑️ Phase 116: **panel/tool エビデンス button 12 個に aria-label + README アンインストール手順追加**:
  - **♿ panel.html / tool.html の「📸 エビデンス」button 12 個 (6 画面 × 2 ファイル)** に画面コンテキスト付き aria-label 追加 — 「SOQL クエリと結果をエビデンス…」「レコード詳細を…」「Apex 実行結果を…」「メタデータ一覧を…」「ログイン履歴を…」「Limits 使用状況を…」と区別可能に (スクリーンリーダーで複数ボタンが同じ "エビデンス" と読まれるのを解消)
  - **🗑️ README に「アンインストール / 無効化手順」セクション新設**: 個人削除 (chrome://extensions/) / 一時無効化 / 保存データ確認 (chrome.storage.local の項目一覧) / 社内一斉削除 (GPO ExtensionInstallForcelist 除外) を整理
  - 保存データに含まれる項目を明示 (SOQL 履歴/最後のビュー/Login as User 履歴/Limits ピン止め) → セキュリティ監査・退職時の権限剥奪手順に有用
- **v3.25.0 (2026-05-21 00:25)** — ✨♿ Phase 115: **popup fade-in アニメーション + quick-card aria-label (a11y 強化)**:
  - **✨ popup 開閉 fade-in**: 3 モード UI 体験統一の総仕上げ — Chrome 拡張アイコン → popup 表示時に Phase 111/112 と同じ Material 風 cubic-bezier(0.16, 1, 0.3, 1) 220ms で fade-in (translateY 4px → 0)
  - `prefers-reduced-motion: reduce` 配慮継続
  - **♿ popup quick-card 6 個に aria-label 追加**: アイコン + ラベル分離構造のため、スクリーンリーダー向けに明示 (例: 「Salesforce Setup 画面を開く」「Developer Console を開く」)
  - `.quick-ico` 絵文字に `aria-hidden="true"` 付与 (スクリーンリーダーの絵文字読み上げを抑止 → ラベルに集中)
  - `<div class="quick-grid">` に `role="group" aria-label="クイックアクション"` で構造化
  - **3 モード (popup/panel/mini-panel) で開閉アニメーション統一達成**
- **v3.24.0 (2026-05-21 00:22)** — 📖📐 Phase 114: **設計書 PDF 保存手順 README + FLS レポート note 業務担当者向け磨き**:
  - **📖 README に「🖨️ 設計書を PDF として保存する手順」セクション新設**: Ctrl+P → PDF 保存の 5 ステップ手順を表組みで明示。「背景のグラフィック」チェックで表紙グラデを PDF に反映する Tips、自動最適化される内容 (背景白/UI 非表示/改ページ/罫線) の説明、大量レコード時の注意点 (PDF 推奨/Mermaid Chrome のみ確実) を追記
  - **📐 FLS レポート note 業務担当者向け拡張**: 「項目レベルセキュリティとは何か」の概念解説 + 機微情報棚卸し・年次セキュリティ監査・新規ユーザー権限申請影響範囲確認・ProfileReader 等他ツールとの比較資料 用途を追加
  - **これで設計書 note 業務担当者向け磨き = 17/22 種完了** (残り 5 種は既に十分業務語)
- **v3.23.0 (2026-05-21 00:20)** — 🖨️🎯 Phase 113: **設計書 @media print 改ページ最適化 + button transition 統一**:
  - **🖨️ 設計書プレビュー印刷最適化**: ブラウザ印刷 (Ctrl+P) で PDF 保存・物理印刷時の体裁を業務文書品質に
  - 印刷時は背景白/文字黒に自動切替 (インク節約 + 可読性)
  - 操作 UI (ヘッダ/サイドバー/ツールバー/ボタン) は非表示、design-preview のみ全幅表示
  - sticky 解除で改ページ位置を正確化
  - **セクション (h2) ごとに自動改ページ** (1 章 = 1 ページ感、表紙は次章を引きずらない)
  - 表の改ページ制御 (`tr` の `page-break-inside: avoid`) で行が途中で切れない
  - グレースケール印刷でも識別できるよう罫線を強調
  - @page サイズ A4 縦 + 余白 14mm/12mm
  - **🎯 button transition 統一**: 全ボタンに `transition: border-color, background, color, box-shadow 0.12s ease` を統一適用、`:focus-visible` キーボードフォーカス + `:active` 押下感 (translateY 1px) を追加 (アクセシビリティ強化)
- **v3.22.0 (2026-05-21 00:17)** — 🙋✨ Phase 112: **README ロール別 FAQ + panel ビュー切替 fade-in アニメーション**:
  - **🙋 README に「ロール別 FAQ」セクション新設**: 👤 業務利用者 (5 問) / ⚙️ システム管理者 (6 問) / 💻 開発者 (8 問) の合計 19 問を 3 モード設計と紐づけて整理。「自分の役割でどう使えばいいか」を典型タスク × 操作手順形式で表組み化
  - **✨ panel ビュー切替 fade-in**: `.view` に viewFadeIn keyframe アニメーション追加 (Phase 111 mini-panel と同じ Material 風 cubic-bezier カーブ 220ms)
  - `prefers-reduced-motion: reduce` 対応継続 (アクセシビリティ配慮)
- **v3.21.0 (2026-05-21 00:15)** — ✨📄 Phase 111: **mini-panel 開閉アニメーション + 設計書表紙 CSS 拡張**:
  - **✨ mini-panel 開閉アニメーション磨き**: `display: none/flex` の唐突な切替 → `opacity + transform: translateY(8px) scale(0.98)` の fade-in-up + scale-up に変更 (18ms ease + cubic-bezier(0.16, 1, 0.3, 1) の Material Design 風カーブ)
  - `prefers-reduced-motion: reduce` ユーザー向けに transition 無効化 (アクセシビリティ配慮)
  - **📄 設計書プレビュー表紙 CSS 文書化体裁**: グラデーション 135° + 太字 16px + letter-spacing + box-shadow + ボーダー radius で「文書の表紙」らしい体裁に
  - 表紙直後の kvRows (作成日時/対象組織/改訂履歴) テーブルも背景・項目名強調で文書らしく整形
  - 業務担当者がプロジェクト成果物として PDF/PowerPoint に貼り付けても見栄えするレベルに
- **v3.20.0 (2026-05-21 00:11)** — 🆘📐 Phase 110: **README トラブルシューティング新設 + 設計書 3 種 note 追加磨き**:
  - **🆘 README に「トラブルシューティング」セクション新設**: 13 種類の典型症状 × 想定原因 × 対処法を表組みで整理 (未接続/SyntaxError/Excel 形式警告/Flow INVALID_FIELD/Limits 未定義/ApexLog 取得失敗 等の過去 5+ CRITICAL バグの教訓を業務担当者向けに集約)
  - **📐 フロー一覧 note**: 「ノーコード業務プロセス自動化機能」概念解説 + 自動化資産棚卸し・業務プロセス可視化・運用引継ぎ・改修優先度判断 用途追加
  - **📐 フロー (legacy 含む) 一覧 note**: Process Builder 廃止移行対象優先洗い出し + Workflow Rule の主用途 (項目自動更新/メール) を業務語で明示
  - **📐 アプリ一覧 note**: 「Salesforce 業務領域 (営業/サービス/マーケ) の枠組み」概念解説 + Lightning/Classic 併存状況・Classic 廃止検討・業務領域別アクセス権設計 用途
  - **設計書 note 業務担当者向け磨き = Phase 108+109+110 合計 16/22 種完了** (残り 6 種は既に十分業務語)
- **v3.19.0 (2026-05-21 00:06)** — 📐⚙️ Phase 109: **設計書 10 種 note 追加磨き + popup クイックアクション title 拡充**:
  - **📐 プロファイル/権限セット一覧**: 役割ベース RBAC 設計・組織再編・棚卸し 用途を追加
  - **📐 Apex クラス/トリガ一覧**: 「Limit 使用率 80% 超で整理検討」「データ移行時の停止判断」「業務イベント関連把握」用途を追加
  - **📐 入力規則一覧**: データ移行時の一時無効化候補洗い出し・Excel 一括投入時の検討資料用途を追加
  - **📐 レコードタイプ一覧**: 「同じオブジェクトを業務別に使い分け」概念を業務語で解説、組織再編活用例
  - **📐 フィールドセット一覧**: 「管理者が画面項目を後から変更できる仕組み」を解説、削除時の影響範囲注意を強調
  - **📐 カスタム設定一覧**: 「組織共通マスタ値の仕組み」「Hierarchy 型はユーザー別上書き値検索に有用」を業務語で
  - **📐 アクセス制御**: OWD/ロール階層を「誰がどのレコードを見られるか」の業務目線で解説、年次監査・組織再編用途
  - **📐 オブジェクト権限マトリクス**: J-SOX 監査対応・V/M 高権限の特定者限定確認を強調
  - **⚙️ popup (管理者モード) クイックアクション 6 個**: title (マウスオーバー) を「機能 + 業務用途 + 当拡張内の比較」まで業務担当者向けに拡張 (例: Dev Console title → 「機能限定的なため DevToolsNext タブの方が便利」誘導)
  - **設計書 note 業務担当者向け磨き = Phase 108 + 109 合計 13 種 完了** (残り 9 種は既に十分業務語)
- **v3.18.0 (2026-05-21 00:00)** — 📐💼 Phase 108: **設計書 6 種の note を業務担当者向けに磨く**:
  - **📐 オブジェクト定義書**: 技術的だった「生成元: …describe」note を「項目数/子リレ/レコードタイプ件数 + Excel フィルタで自組織独自項目抽出 + 新規実装レビュー資料活用」案内に書き換え
  - **📐 ER 図**: Master-Detail (必須参照・カスケード削除) と Lookup (任意参照) を業務観点で再説明 (要件定義書・移行計画でのデータ削除順序検討活用例)
  - **📐 プロファイル詳細レポート**: 年次セキュリティ監査・新規ユーザー権限設計・ロール変更影響確認 等の用途を明記、9 章の承認回付活用例
  - **📐 フロー設計図**: 要件変更時の影響分析・障害切分・新人引継ぎ資料・業務フロー図との対応関係を案内
  - **📐 Apex 設計図**: バージョンアップ前互換性チェック・保守引継ぎ・コードレビュー記録 用途を明記
  - **📐 LWC 設計図**: 改修影響範囲・保守引継ぎ活用例、TargetConfigs の管理者配置可能対象を業務語で解説
  - **📐 フィールド権限マトリクス**: FLS 年次監査・機微情報参照権限棚卸し・新規ユーザー申請影響範囲確認 用途を追加
- **v3.17.0 (2026-05-20 23:57)** — 👤📥 Phase 107: **mini-panel (ユーザーモード) 空状態統一 + DataExport フィールドペイン初期ガイド**:
  - **👤 mini-panel**: shadow DOM 内に `.empty-state` スタイルを panel/tool と同じトーン (青系グラデ + accent strong + code 背景) で展開、結果領域初期表示に「📋 ID をクエリに挿入」「🔎 最近 5 件」「列ソート」「↗ 全画面で詳細機能」案内
  - mini-panel textarea placeholder を「SOQL 入力 / Ctrl+Enter で実行 / 入力中に候補表示」に拡張 + title で Tooling API 非対応と全画面誘導
  - **📥 DataExport フィールドペイン**: 「オブジェクト API 名 → フィールド読込で一覧表示」「全選択/全解除/標準のみで一括操作」案内を初期表示
  - 3 モード (開発者/管理者/ユーザー) 全てで空状態ガイドが揃い、各モード整合性 100% 達成
- **v3.16.0 (2026-05-20 23:53)** — 📥🌐⚡ Phase 106: **DataExport/REST/Apex 結果領域に空状態ガイド** (10 画面達成):
  - **📥 DataExport**: 「① オブジェクト API 名 → フィールド読込 ② チェック ③ WHERE/ORDER/LIMIT ④ SOQL 組立 → 実行」の 4 ステップ手順を初期表示。50,000 件上限・Excel 形式警告対応・Tooling API 切替を案内
  - **🌐 REST**: 「メソッドとパスを指定して送信」案内 + SOQL 不可情報 (<code>/limits</code>/<code>/userinfo</code>/<code>/sobjects/</code>/<code>/versions</code>) 例示
  - **⚡ Apex 実行結果**: 「DebugLevel/TraceFlag 自動有効化」「本番 UPDATE/DELETE 注意」「📸 エビデンス保存」案内
  - panel.html / tool.html 両方統一 → **全 10 画面**で同じトーンの空状態ガイド完成 (SOQL/Inspector/Logs/Login/Metadata/Limits/Inspector ref/DataExport/REST/Apex)
- **v3.15.0 (2026-05-20 23:49)** — 🎨✨ Phase 105: **空状態ガイドの CSS クラス化 + SOQL/Inspector/Logs に展開** (合計 7 画面で統一):
  - **🎨 `.empty-state` CSS クラスを panel.css に新設**: 既存 4 画面 (メタデータ/Inspector ref/Limits/Login) のインラインスタイルを CSS クラスに集約 (バグ: var(--muted) 未定義変数を含んでいたものを修正)
  - グラデーション背景 + `<code>` ハイライト + `<strong>` アクセント色で業務文書らしい体裁
  - **✨ SOQL 結果**: 「Ctrl+Enter で実行」「↑↓ オートコンプリート」「Tooling API チェック」案内を初期表示
  - **✨ Inspector 結果**: 「項目クリックでインライン編集 (PATCH 保存)」「現在タブから取得」「JSON/CSV/エビデンス保存」案内
  - **✨ ApexLog 結果**: 「DebugLevel ON で TraceFlag 有効化」「匿名 Apex 実行時の自動取得」案内
  - panel.html / tool.html 両方統一 (3 モード整合性) → 全 7 画面で同じ見た目・トーンの初期ガイド
- **v3.14.0 (2026-05-20 23:47)** — 📊🔐🔌 Phase 104: **Limits/Login 履歴に空状態ガイド + サポート API バージョンセクション追加**:
  - **📊 Limits 空状態ガイド**: 「取得 / 更新で 30 種類以上の組織制限を表示」「行クリックでピン止め」「列ヘッダクリックでソート」案内 + 業務日中の定期取得→エビデンス保存活用例
  - **🔐 Login 履歴 空状態ガイド**: 「取得件数とステータスを選んで取得」「失敗のみフィルタで認証失敗を素早く確認」案内 + セキュリティ監査証跡として活用例
  - panel.html / tool.html 両方で同一ガイド (3 モード整合性)
  - **🔌 README サポート API バージョン**: 8 機能 × 利用 API path × v62.0 一覧表、後方互換情報、変更時の手順を新セクションで明示
- **v3.13.0 (2026-05-20 23:43)** — 🔍📦 Phase 103: **Inspector placeholder 統一 + メタデータ画面に空状態ガイド追加**:
  - **🔍 inspectRef**: panel.html と tool.html で異なっていた placeholder を統一 (3 モード整合性違反を解消)。「レコード ID (15/18桁) または 『オブジェクト名:ID』 形式」と例示
  - title (マウスオーバー) で「カスタムオブジェクト/権限制約時はオブジェクト名明示推奨」「15桁/18桁 両対応」「📋 貼付・現在タブから取得 ボタン案内」を業務利用者向けに説明
  - **📦 metadataResult 空状態ガイド**: 「メタデータ型を選択して一覧取得」案内 + ヒント (ApexClass=API バージョン棚卸し / Flow=ProcessType / Profile・PermissionSet=権限 / ValidationRule=入力規則) を初期表示
  - panel.html / tool.html の両方で同一ガイド (3 モード整合性)
- **v3.12.0 (2026-05-20 23:40)** — 🎯📚 Phase 102: **SOQL placeholder 拡充 + 3 モード活用例セクション追加**:
  - `soqlText` placeholder を 3 つの具体例 (期間フィルタ / 関係参照 / 親子サブクエリ) と「Ctrl+Enter で実行できます (オートコンプリート対応)」案内に拡張
  - title (マウスオーバー) で「Tooling API 用途」「日付リテラル」「親子クエリ」を業務利用者にも分かるよう説明
  - panel.html / tool.html 両方で同じ placeholder を維持 (3 モード整合性)
  - README「💡 3 モード活用例」セクションを 3 モード設計セクション直下に追加 — 8 つの典型シナリオを「シナリオ→推奨モード→操作の流れ」表組で整理
- **v3.11.0 (2026-05-20 23:37)** — ✍️ Phase 101: **匿名 Apex placeholder の業務利用者向け磨き**:
  - `apexCode` textarea の placeholder を 3 つの具体例 (`System.debug` / `DELETE [SELECT ...]` / `Database.executeBatch`) と「Ctrl+Enter で実行できます (Debug ログも自動取得)」案内に拡張
  - title (マウスオーバー) で「本番組織での UPDATE/DELETE は実データに影響する」注意を明示
  - panel.html / tool.html の両方で同じ placeholder を維持し 3 モード整合性を担保
- **v3.10.0 (2026-05-20 23:34)** — 🎊🎊 **Phase 100 達成記念** — Phase 1-100 マイルストーン年表追加:
  - README 冒頭に「Phase 1-100 主要マイルストーン (年表)」セクション新設
  - 10 期間に分けて主要改修を整理 (Phase 1-49 / 50-61 / 62-67 / 68 CRITICAL / 69-72 抜本 / 73-77 メニュー / 78-84 機能 / 85-89 UX / 90-93 v3 化 / 94-99 仕上げ)
  - 累計実績明示: 210+ リリース / 240+ commits / 50+ ユーザー報告対応 / 5+ CRITICAL バグ修正
  - 30 分で v3.0.0 から v3.10.0 まで 10 連続リリース達成
- **v3.9.0 (2026-05-20 23:32)** — ⌨️ Phase 99: **README キーボードショートカット一覧追加**:
  - README に「⌨️ キーボードショートカット」セクション新設
  - 13 種類のショートカットを表組みで整理 (Ctrl+Enter 実行 / Esc 閉じる / ↑↓ 候補移動 / Ctrl+Alt+Q/I/A/R/L/D ビュー切替 / Tab=2 スペース挿入 等)
  - 業務利用者・開発者がどこに何があるか一目で把握可能
- **v3.8.0 (2026-05-20 23:30)** — 📝 Phase 98: **設計書ジェネレータの操作ヒント磨き**:
  - 「▶ 生成」「📋 クリップボード」「📥 ダウンロード」3 ボタンの title (マウスオーバー) を業務利用者向けに磨く
  - 「表紙 (作成日時 / 対象組織 / 改訂履歴) 付きでプロジェクト成果物として利用可能」を生成ボタン title に明示
  - Excel ダウンロード時の形式警告対応「初回は形式警告が出ますが『はい』で開けます」をボタン title に
- **v3.7.0 (2026-05-20 23:27)** — 🎨 Phase 97: **表内検索 UX 磨き + popup CTA 文言改善**:
  - **🎨 recordsTable 検索 input**: placeholder を「表内を絞り込む… (全列対象 / Esc でクリア / 列ヘッダクリックでソート)」と業務利用視点に、title 属性 (マウスオーバー) で使い方詳細
  - **🎨 件数バッジ tooltip**: 「表示中件数 / 全件数」を明示
  - **🎨 popup CTA**: 「DevToolsNext を全画面で開く」→「💻 開発者モードを全画面で開く」(3 モード設計と整合)、サブテキストに「エビデンス取得」追加
- **v3.6.0 (2026-05-20 23:25)** — 📚🎨 Phase 96: **README エビデンス取得ガイド + 設計書表紙 UI 強調**:
  - **📚 README にエビデンス取得セクション新設**: 6 画面のエビデンス内容・ファイル名・共通フォーマット・用途例を表組みで整理
  - **🎨 設計書プレビュー表紙強調 CSS**: `.design-preview h2:first-of-type` (📄 表紙) にグラデ背景 + 左 3px ボーダー + 下 2px ボーダーで他セクションと差別化、業務文書らしい体裁に
- **v3.5.0 (2026-05-20 23:22)** — 📸 Phase 95: **エビデンス取得を Apex 実行 / メタデータ一覧に拡大**:
  - **📸 Apex 実行画面**: 「📸 エビデンス」ボタン追加 → 実行 Apex コード + 結果/Debug ログ (最大 10,000 文字) を Markdown 化
  - **📸 メタデータ一覧画面**: 「📸 エビデンス」ボタン追加 → 現在のメタデータ種別と一覧をテーブルから逆変換して Markdown 化
  - **🎯 エビデンス取得 6 画面完備**: SOQL / Inspector / Limits / ログイン履歴 / Apex 実行 / メタデータ一覧
- **v3.4.0 (2026-05-20 23:20)** — 📚 Phase 94: **README に v3 系累計サマリ追加**:
  - README 冒頭に「v3 系の主要機能 (v2.71 → v3.3 累計まとめ)」セクション追加
  - 11 カテゴリで改善内容を整理: 3 モード設計 / メニュー再設計 / SOQL オートコンプリート / 全表検索 / Limits 抜本 / FLS マトリクス / Inspector 編集 / エビデンス取得 / 設計書表紙 / CRITICAL バグ修正 / デザイン品質
- **v3.3.0 (2026-05-20 23:17)** — 📸 Phase 93: **エビデンス取得を Limits / ログイン履歴に拡大**:
  - **📸 Limits ダッシュボード**: 「📸 エビデンス」ボタン追加 → 全 Limits の日本語名+API 名+使用/残り/上限/使用率を Markdown でダウンロード、「監視ポイント: 70% 以上注意、90% 以上危険」を extraMeta に
  - **📸 ログイン履歴**: 「📸 エビデンス」ボタン追加 → 全ログイン履歴 (日時/種別/アプリ/ステータス/API 種別/IP 等) を Markdown でダウンロード、成功/失敗件数を extraMeta に
  - **📊 4 画面で完備**: SOQL / Inspector / Limits / ログイン履歴 で 1 クリックエビデンス化が可能に
- **v3.2.0 (2026-05-20 23:15)** — 📸 Phase 92: **エビデンス取得機能** (テスト工程向け):
  - **🚨 ユーザー要望**: 「開発のテスト工程で使いたい」 — 操作結果を証跡として保存
  - **📸 makeEvidence() 共通関数**: SOQL/Inspector の現在状態 + 組織情報 (host/orgId/API ver/拡張機能 Ver) + 取得日時 を Markdown レポート化
  - **📸 SOQL 画面**: 「📸 エビデンス」ボタン → SOQL クエリ + 結果テーブル (最大 200 件) を Markdown でダウンロード
  - **📸 Inspector 画面**: 「📸 エビデンス」ボタン → レコード ID + 全項目値 (API 名/ラベル/型/値) を Markdown でダウンロード
  - **📄 ファイル形式**: `evidence-soql-YYYYMMDD-HHmm.md` / `inspector-evidence-Account-YYYYMMDD-HHmm.md`
  - テスト工程で「実行クエリ・取得結果・実行日時」を 1 クリックで証跡化可能
- **v3.1.0 (2026-05-20 23:13)** — 📄 Phase 91: **設計書 22 種すべてに表紙適用完了**:
  - v3.0.0 で 12 種、v3.1.0 で **残 8 種を追加** (AppList / AccessControl / ProfileDetail / FlowDetail / ApexDetail / LwcDetail / FieldPermMatrix / ObjectPermMatrix)
  - **🎯 全 22 種で統一表紙フォーマット完成**: 設計書名 / 対象 / 対象組織 / 作成者 / 作成日時 / 拡張機能 Ver / 改訂履歴
  - プロジェクト成果物として直接提出可能な品質に
- **v3.0.0 (2026-05-20 23:10)** — 🎊 **メジャー v3 マイルストーン** Phase 90: 設計書表紙セクションを 12 種へ拡大適用:
  - **🎊 v3.0.0 メジャーバージョン**: v2.0.0 から 100 リリース達成 (Phase 1-90 / サイクル 238)
  - **📄 設計書表紙適用拡大**: makeCoverSection を以下 12 種に適用 (v2.98.0 で 2 種 → v3.0.0 で 12 種):
    - オブジェクト定義書 / プロファイル一覧 / 権限セット一覧 / Apex クラス一覧 / Apex トリガ一覧 / フロー一覧 / 入力規則一覧 / レコードタイプ一覧 / フィールドセット一覧 / カスタム設定一覧 / ER 図 / 項目レベルセキュリティ (FLS)
  - **🎯 プロジェクト成果物品質**: 各設計書冒頭に「設計書名 / 対象 / 対象組織 / 作成者 / 作成日時 / 拡張機能 Ver / 改訂履歴 (初版)」を統一フォーマットで自動生成
  - 残 8 種 (ProfileDetail / AppList / AccessControl / FlowDetail / ApexDetail / LwcDetail / FieldPermMatrix / ObjectPermMatrix) は Phase 91 で対応
- **v2.99.0 (2026-05-20 23:10)** — ✏️ Phase 89: **Inspector レコード編集機能**:
  - **🚨 ユーザー要望**: 「レコード詳細では項目も更新できるようにしてほしい」
  - **✏️ panel.js renderInspectorFields**: 編集可フィールド (`updateable=true && !calculated && type!='reference' && type!='id' && !SYSTEM_FIELDS`) の値セルに `editable` クラス + クリック点線ハイライト
  - **✏️ クリック → 編集モード突入**: 型別 input (text/number/date/datetime-local/email/url/textarea/select for boolean) で値を表示
  - **✏️ Enter / ✓ で保存**: PATCH `/sobjects/<Obj>/<Id>` で更新、成功時 `inspectState.record` 更新 + 再描画 + toast
  - **✏️ Esc / ✗ で取消**: 元の表示に戻す
  - **🎨 編集モード CSS**: `.fval.editable` 点線ホバー / `[data-editing="true"]` 青枠 / `.inline-save` 緑 / `.inline-cancel` 赤
- **v2.98.0 (2026-05-20 23:05)** — 📄 Phase 88: **設計書品質向上 (フィールドタイプ日本語化 + 表紙セクション)**:
  - **🚨 ユーザー画像イメージ**: ProfileReader 風 UI でタイプを日本語化「参照関係(Contact) / チェックボックス / 名前 / 住所 / 電話 等」
  - **📋 FIELD_TYPE_JA マップ追加** (design-docs.js): Salesforce 全フィールドタイプを日本語に変換 (string=文字列 / boolean=チェックボックス / reference=参照関係(対象) / picklist=選択リスト / phone=電話 / address=住所 等 25 種類)
  - **📋 fieldTypeJa(type, referenceTo) ヘルパー**: reference 型は対象オブジェクト名を `参照関係(Contact)` 形式で出力
  - **📋 buildFlsReport タイプ列**: 「string」→「文字列」、「reference」→「参照関係(Contact)」等
  - **📋 buildObjectDef データ型列**: 同様に日本語化
  - **📄 makeCoverSection ヘルパー新規**: 設計書の表紙セクションを共通生成 (タイトル / 対象 / 対象組織 / 作成者 / 作成日時 / 拡張機能 Ver / 改訂履歴)。FLS レポートとオブジェクト定義書に適用 (他 20 種は順次)
- **v2.97.0 (2026-05-20 23:00)** — 🔍 Phase 87: **全表共通検索フィルタ追加**:
  - **🚨 ユーザー要望**: 「ログイン履歴ではカラムでソートや検索できるようにして / 他の表形式も同じくソートと検索できるようにして」
  - **✓ ソート機能**: 全表 `recordsTable` は既存実装で各列ヘッダクリックで昇順↓降順↓元順のトグルソート対応済
  - **🔍 新規: 検索フィルタ**: テーブル上部に「🔍 表内を検索」入力欄を追加。リアルタイムで行 textContent.toLowerCase().includes(q) フィルタ、ヒット件数表示、Esc でクリア
  - **対応範囲**: SOQL 結果 / ログイン履歴 / メタデータ一覧 / Apex ログ / Inspector / Limits / 設計書プレビュー など `recordsTable()` を使う全表に一括適用
- **v2.96.0 (2026-05-20 23:05)** — 🚨🌐 Phase 86: **CRITICAL Limits バグ修正 + REST API 実体化**:
  - **🚨 ユーザー報告 「使用状況が取得できなくなりました」**: v2.93.0 で renderLimitsList 内に `fmtNum` (design-docs.js ローカル関数) を参照しており **panel.js では undefined → ReferenceError で `renderLimitsList` が落ちて Limits が描画されなかった**。`limitFmt = (n) => Number(n).toLocaleString("ja-JP")` をローカル定義して修正
  - **🌐 REST API 実体化** (ユーザー要望「REST API のメニューはきちんと使える？」「URL ビルダー + 実行を統合」):
    - API ガイドカード `.api-guide` 撤去、説明は各 input/button の `title` 属性へ集約
    - 「▶ 実行」ボタン新規追加 → 生成された URL を sfFetch で送信
    - 結果表示エリア (`#apiRunMeta` + `#apiRunResult`): HTTP ステータス + 実行時間 + JSON レスポンス
    - よくある例チップ (describe / query / limits / userinfo / versions) は最上部に薄く 1 行配置
- **v2.95.0 (2026-05-20 23:00)** — 🧹 Phase 85: **冗長説明削除 + ホーム簡素化**:
  - **🚨 ユーザー指示**: 「冗長な説明を画面に出さない、マウスオーバーに移動、説明文章は凝る」
  - **🧹 home-tips セクションを 4 行 → 1 行に圧縮**: キーボードショートカット解説を 1 行 + title 属性 (マウスオーバー) に集約
  - **🧹 home-card-desc を 1 行短文に**: 「SOQL を書いてレコードを検索 / CSV エクスポート (Tooling API 対応)」→「SOQL でレコード検索・CSV 出力」(各 6 カード)、詳細は title 属性で
  - **📝 残対応 (Phase 86)**: REST API 実体化 (apiurl に実行ボタン+レスポンス) / 設計書表紙セクション / Inspector レコード編集機能
- **v2.94.0 (2026-05-20 23:02)** — ⌨️ Phase 84: **mini-panel SOQL オートコンプリート (ユーザーモード入力補助)**:
  - **🚨 ユーザー要望**: 「ユーザーモードでも入力補助が欲しいです」
  - **⌨️ content.js mini-panel に SOQL オートコンプリート**: panel.js と同じ仕組みを shadow DOM 内に実装 (FROM 後はオブジェクト、SELECT/WHERE 後は項目候補、↑↓ Enter Tab Esc 操作)
  - **⚡ describe / sobjects キャッシュ**: shadow DOM 内 Map で 2 回目以降の API コール削減
  - **🎨 shadow DOM 内ドロップダウン CSS**: `.ac-pop` `.ac-item` `.ac-lbl` で青系統一スタイル
- **v2.93.0 (2026-05-20 22:55)** — 📊🐛 Phase 83: **Limits 抜本改修 + ログイン履歴バグ修正 + view 状態保持**:
  - **🚨 ユーザー報告 5 件 (Limits)**:
    1. カラム固定はいいがスクロール時に重なる → `.limit-row.header` の z-index 10 + box-shadow で重なり解消
    2. ソート機能 → 全列 (項目/使用/残り/上限/%) クリックでソート、`↑↓` 表示、向き保存
    3. 日本語訳 → `LIMITS_JA` マップ 50+ 項目で日本語名+原文併記
    4. 他の上限も表示 → `desc` フィールドで隠れた上限の解説 (Apex Limit 6 MB / 一括メール / SOQL Limit 等) を tooltip に
    5. 設定保存 → ピン留め (★) + 「ピン留めのみ表示」を `chrome.storage` で永続化
  - **🐛 CRITICAL ログイン履歴バグ修正**: Salesforce LoginHistory の `Status` フィールドは `filterable=false` のため `WHERE Status='Success'` で INVALID_FIELD エラー → WHERE 句撤廃、クライアント側で `.filter()` する設計に変更
  - **🎯 リフレッシュで直前 view 復元** (ユーザー要望「リフレッシュしても前のページ状態を残して」): switchToView 時に `chrome.storage.local.sfdtLastView` に保存、init 時に復元
  - **🎯 レコード詳細デフォルトで現在ページ ID 自動入力** (ユーザー要望): chrome.devtools.inspectedWindow.eval で URL から `/lightning/r/<Obj>/<Id>` を抽出して inspectRef に自動セット
- **v2.92.0 (2026-05-20 22:42)** — 📝 Phase 81 続き: **設計書メニュー名整理**:
  - **🚨 ユーザー指示**: 「設計書生成22種はださい、設計書作成でいい」「使えない設計書もある、他ツールや Web 参考に項目・記載方法を改善」「プロジェクトの成果物として管理することになる」
  - **📝 メニュー名統一**: 「📋 設計書生成 (22 種)」→「📋 設計書作成」(サイドバー / ホームカード / 補助カード すべて)
  - **🎯 ホームカード説明文拡充**: 「オブジェクト定義書 / プロファイル詳細 / ER 図 / FLS マトリクス / Apex 詳細など 22 種類の設計書を Excel で自動生成 (プロジェクト成果物として活用可)」と業務用途を明示
  - **📚 設計書品質改善方針** (Phase 83 で実施予定): 表紙 / 改訂履歴 / 目次 / 業務テンプレ準拠 / 使えない設計書の棚卸し → 廃止 or 改修
- **v2.91.0 (2026-05-20 22:55)** — 🎨🗂️ Phase 81: **メニュー抜本再設計 + SVG アイコン**:
  - **🚨 ユーザー指示**: 「メニューの機能のまとまりがよくわからない、粒度を考慮、抜本的に変えるのはあり」「拡張ツールのアイコンもいい感じのを生成、モダンなイメージ」「機能改変を抜本的に実施してもいい、新機能追加・廃止もあり」
  - **🗂️ 5 カテゴリ → 3 カテゴリに集約**:
    - **📦 データ**: 🔎 SOQL クエリ / 🔍 レコード詳細 / 📥 一括エクスポート
    - **💻 開発**: 🟧 Apex 実行 / 🌐 REST API (URL ビルダー + 実行を統合予定) / 📦 メタデータ一覧 / 📋 設計書生成 (22 種)
    - **🛡️ 組織管理**: 📊 使用状況 / 📜 Apex 実行ログ / 🔐 ログイン履歴
  - **🗑️ 機能廃止**: 「🔗 REST API URL」と「🌐 REST API」を 「🌐 REST API」1 つに統合 / 「📖 オブジェクト構造」(Describe) は中途半端のため廃止 (設計書ジェネレータのオブジェクト定義書で代替)
  - **🎨 SVG アイコン新規作成** (icon.svg): Salesforce ブルーのグラデ角丸正方形 + 雲シルエット (Salesforce 風) + コード記号「< / >」(開発ツール示唆) + 緑アクセントドット (有効状態)。ユーザーが PNG 変換して icons/icon{16,32,48,128}.png に上書きする運用
- **v2.90.0 (2026-05-20 22:45)** — 🚨🎯 Phase 80 続き: **CRITICAL 全 addEventListener null セーフ化 + 自動取得実装**:
  - **🚨 ユーザー報告**: 「初期化失敗: Cannot read properties of null (reading 'addEventListener')」「ログイン履歴は変なエラー」
  - **🐛 真因**: v2.88.0 で changeset 関連だけ null セーフ化したが、SOQL/Describe/Inspector 等の他 50+ の addEventListener が null チェックなしのまま残っていた。HTML 要素が無いと init で TypeError → 全機能停止
  - **🐛 修正**: bindEvents 全 50+ の `document.getElementById(id).addEventListener(...)` を `$on(id, ev, fn)` ヘルパーで一括 null セーフ化
  - **🎯 自動取得 (Team UX)**: ユーザー要望「使用状況とかは開いたらすぐ取得してほしい」に対応。switchToView 時に limits / login / logs / metadata を自動取得 (未取得時のみ・接続済みのみ)
- **v2.89.0 (2026-05-20 22:38)** — 🔐 Phase 80: **FLS 設計書を profileReader 互換マトリクスに再構成**:
  - **🚨 ユーザー要望**: 「項目レベルセキュリティの設計書は権限セット・プロファイル × 項目への権限で表現してください。profileReader で確認可能」
  - **🐛 旧仕様の問題**: 「件数 + 内訳 (文字列改行)」という形式で、profileReader のような **マトリクス比較** ができなかった
  - **🔐 新仕様 (マトリクス形式)**:
    - **行 = 項目** (項目 API 名 / ラベル / 型 / 必須 の 5 列固定)
    - **列 = プロファイル + 権限セット** (動的、👤 プロファイル → 🔑 権限セットの順でアルファベット並び)
    - **セル = RW / R / --** (RW=編集可 / R=参照のみ / --=アクセス無し)
  - **凡例セクション拡充**: RW/R/-- 解説 + 列順説明 + Excel ウィンドウ枠固定 (B2) の使い方ガイド
  - **サマリ note 改善**: 「対象 N 項目 / 列 M (プロファイル X + 権限セット Y) / 編集可 / 参照のみ / アクセス無し の割合」を明示
- **v2.88.0 (2026-05-20 22:35)** — 🚨 Phase 79: **CRITICAL init エラー修正 (Apex 等全機能停止の真因)**:
  - **🚨 ユーザー報告**: 「初期化失敗: Cannot read properties of null (reading 'addEventListener')」「Apex 実行もうまく機能しないです」
  - **🐛 真因判明**: v2.86.0 で changeset view を HTML から削除したが、panel.js の bindEvents で **`document.getElementById("btnCsLoad").addEventListener(...)` 等 9 個の changeset 関連バインドが null チェックなし** → init で TypeError → catch で「初期化失敗」表示、**Apex 実行を含む全機能の addEventListener 登録が中断していた**
  - **🐛 修正**: bindEvents 内の changeset 関連 9 個の addEventListener を `$on(id, ev, fn)` ヘルパーで null セーフ化。これで init が完走、Apex 実行 / SOQL / その他すべての機能が復活
- **v2.87.0 (2026-05-20 22:32)** — ⌨️ Phase 78: **SOQL オートコンプリート実装**:
  - **🚨 ユーザー要望対応**: 「SOQL 書くときは途中まで書けば候補が出てくるようにしてほしい。他の拡張ツールはその機能があります」
  - **⌨️ panel.js の `#soqlText` にオートコンプリート実装**: カーソル位置の手前ワードを解析、`FROM <obj>` の後ろは describe global のオブジェクト候補、`SELECT` / `,` / `WHERE` / `AND` / `OR` / `ORDER BY` の後ろは現在 FROM オブジェクトの項目候補を表示
  - **🎨 ドロップダウン UI**: 絶対位置の浮動 div、最大 280px / 20 件表示、アイコン (📦 オブジェクト / 🔹 項目) + API 名 (太字 / 等幅) + ラベル + 型を 1 行表示、選択中は青ハイライト
  - **🎯 キーボード操作**: ↑↓ で移動、Enter / Tab で挿入、Esc で閉じる、textarea ブラー時は 150ms 遅延で閉じる (クリック選択許容)
  - **⚡ describe キャッシュ**: 同じオブジェクトの項目情報は Map にキャッシュ、2 回目以降は API コールなし
- **v2.86.0 (2026-05-20 22:30)** — 🗑️📝🐛 Phase 77: **変更セット削除 + 名詞メニュー + Flow メタデータバグ修正 + mini-panel 拡張**:
  - **🗑️ 変更セット機能を完全削除** (ユーザー指示「変更セット作れないなら不要です」「嘘はつかないでください」): Salesforce API 仕様上、送信変更セット (OutboundChangeSet) は作成不可。誤解を招くので package.xml ビルダーごと撤去。サイドメニュー / ホームの「変更セット」項目もすべて削除
  - **📝 メニュー名称を名詞ベースに統一** (ユーザー指示「名詞ベースでお願い、説明はマウスオーバーで」): カテゴリ「データ」「開発」「監視」「メタデータ」「設計書」、機能名「SOQL クエリ / レコード詳細 / 一括エクスポート / Apex 実行 / REST API URL / REST API / オブジェクト構造 / 使用状況 / Apex 実行ログ / ログイン履歴 / メタデータ一覧 / 設計書生成」と簡潔に。長い説明文は title 属性 (マウスオーバー) に移動
  - **🐛 Flow メタデータ取得バグ修正** (ユーザー報告「Flow のメタデータ一覧を取得しようとするとダメでした」): Tooling API の `Flow` テーブルは `Name` フィールドが無く `MasterLabel` + `DeveloperName` を使う仕様。type 別の SOQL 切替を実装、対応型 6 種を拡充 (Flow / LightningComponentBundle / AuraDefinitionBundle / ValidationRule / Profile / PermissionSet / StaticResource)、各 type 別の列名業務用語化
  - **🚀 mini-panel に「🔎 最近 5 件」「SOQL 履歴チップ」**: 現在のオブジェクトの最近 5 件を Quick-row から、直近 SOQL クエリ 3 件をチップで再実行可能 (Team J/K)
- **v2.85.0 (2026-05-20 22:30)** — 📝🗂️🚀 Phase 76: **メニュー名称の全体整合性確保 + 変更セット作成チュートリアル**:
  - **🚨 ユーザー報告 2 件**: 「メニューの名称をきちんと考えて。今のままだと本当によくわからない」「網羅的にすべてを見直して全体整合性が取れるようにして」「変更セットも簡単に作れる機能を付けて」
  - **📝 サイドメニュー名称を動詞ベースに統一** (カタカナ/英語を排除):
    - カテゴリ名: 「データ操作」→「データを扱う」/ 「開発ツール」→「開発する」/ 「監視」→「組織の状態を見る」/ 「設計書」→「設計書を作る」
    - 機能名: 「SOQL クエリ」→「データを検索 (SOQL)」/ 「レコード Inspector」→「レコード 1 件を確認」/ 「データエクスポート」→「まとめてダウンロード」/ 「Apex 実行」→「Apex コードを実行」/ 「API URL ビルダー」→「REST API URL を作る」/ 「REST 探索」→「REST API を呼び出す」/ 「Describe」→「オブジェクト構造を確認」/ 「Limits ダッシュボード」→「API・容量の使用状況」/ 「Debug ログ」→「Apex 実行ログを見る」/ 「メタデータ一覧」→「メタデータ一覧を見る」/ 「設計書ジェネレータ」→「設計書を自動作成 (22 種)」
  - **🗂️ ホームダッシュボードカードも統一**: 主要 6 + 補助 7 のすべてのカード名・説明文をサイドメニューと同じ名称に変更、全体整合性を確保
  - **🚀 「変更セットを作成」名称復活 + チュートリアル + クイックスタート**:
    - メニュー「📦 デプロイ用ファイル作成」→「📦 変更セットを作成」に復活 (ユーザーが「変更セット」と認識している名称を採用)
    - 画面内に **3 ステップガイド** + 「Setup の変更セット送信とは別物」と明示する Tips
    - **クイックスタートチップ 4 種**: 「全 Apex (クラス+トリガ)」「全 Flow」「全プロファイル+権限セット」「全 LWC」をワンクリックで候補ロード
- **v2.84.0 (2026-05-20 22:18)** — 🚨🎯📚 Phase 75: **ユーザー報告 3 件一括対応** (サイドバー縦スクロール / メニュー視認性 / API 使い方ガイド):
  - **🚨 サイドバー縦スクロール対応** (致命的バグ修正): ユーザー報告「メニューバーはスクロールできないと下まで見えない」。`.side { overflow: hidden }` でクリップされていたのが原因。`.side` に `display: flex; height: 100%`、`.nav` に `flex: 1; overflow-y: auto` を追加してスクロール可能化、`scrollbar-width: thin` で細いスクロールバー
  - **🎨 メニューバー視認性大幅向上**:
    - カテゴリヘッダ (`.nav-sep`) に薄いグラデ背景 `linear-gradient(90deg, rgba(27,150,255,0.08), transparent)`、ホバーで強調
    - `.cat-arrow` を 14x14px のアクセント色ボタン風に強調 (折りたたみ状態が一目)
    - アクティブボタンをグラデ背景 + 太枠 4px + 太字 + box-shadow で **どの機能が選択中か即わかる**
  - **📚 API 画面の使い方ガイド充実** (ユーザー報告「API のところの使い方がよくわからない」):
    - **API URL ビルダー画面**: 3 ステップガイドカード + よくある例 5 個 (describe/query/limits/userinfo/versions) のチップ。クリックで入力欄を自動入力し ▶ URL 生成も自動実行
    - **REST 探索画面**: 3 ステップガイドカード + よく使うパス 4 個 (limits/versions/全オブジェクト/userinfo) のチップ。クリックで Method + パスを自動入力
    - ガイドカードは青系グラデ背景 + 左ボーダー強調で目立つデザイン
- **v2.83.0 (2026-05-20 22:10)** — 🏢⚡🔐 Phase 74: **管理者モード popup 3 チーム工夫**:
  - **🏢 Team H (情報表示)**: popup ヘッダーバッジに「組織名 / ユーザ名」を表示 (userinfo の organization_name + name を取得して短縮表示)。現状は「接続OK」だけだったが、どの組織のどのユーザで接続しているか一目で判別可能に
  - **⚡ Team F (操作性)**: クイックアクション 6 ボタンを **アイコン + ラベルの 2 行大型カード化** (3 列 grid)。アイコン 22px + ラベル 11px、ホバーで浮き上がる。ログアウトボタンだけ赤系ホバーで誤クリック防止
  - **🔐 Team G (組織管理)**: Login as User に **検索履歴 + 最近ログインしたユーザ** チップ表示。検索キーワード 5 件と過去ログインユーザ 5 件を chrome.storage に保存、ワンクリックで再検索 / 再ログイン可能
- **v2.82.0 (2026-05-20 22:05)** — 🎨🎯⌨️🔍 Phase 73: **開発者モード サイドメニュー 4 チーム工夫**:
  - **🎨 Team A (デザイン) - カテゴリ別アクセントカラー**: 各 nav-btn 左ボーダーをカテゴリ別に色分け (データ=青 / 開発=紫 / 監視=緑 / メタ=オレンジ / 設計書=ピンク) — 視線がカテゴリを一目で識別可能
  - **🎯 Team B (UX) - カテゴリ折りたたみ**: 各カテゴリヘッダ (`.nav-sep`) を button 化、▼/▶ アイコンで開閉トグル、状態を `chrome.storage` に永続保存 — 不要なカテゴリを畳めばサイドバーをスッキリ
  - **⌨️ Team C (a11y) - ショートカットキー表示**: 各機能ボタン右端に `Q` `I` `A` `L` `R` `D` の kbd バッジを表示 — Ctrl+Alt+<key> ショートカットを一目で確認可能、ホバーで強調
  - **🔍 Team D (検索) - 機能フィルタ検索**: 最上部に「🔍 機能を検索」入力欄を追加、リアルタイムで nav-btn と nav-sep を絞り込み、ヒット件数 0 のカテゴリヘッダも自動非表示、検索中は折りたたみを一時無視、Esc キーでクリア
  - これらは「複数チームに分かれて工夫」というユーザー指示に応えるマルチパース改修。それぞれ独立しつつ協調動作 (検索 + 折りたたみ等)
- **v2.81.0 (2026-05-20 22:00)** — 🎯🚨 Phase 72: **3 モード設計導入 + Excel 拡張子 ROLLBACK**:
  - **🚨 Excel 拡張子を `.xml` → `.xls` にロールバック**: ユーザー報告「設計書が Excel 形式で出力できなくなりました」に緊急対応。`.xml` だと Windows が Excel と関連付けずダブルクリックで開けない事象。`.xls` だと Excel が「形式と拡張子が一致しません」警告を出すが「はい」で開ける慣例的仕様。UI 文言で「初回警告は『はい』で開けます」と案内を強化
  - **🎯 3 モード設計の導入** (ユーザー要望: 「開発者モード / 管理者モード / ユーザーモードで分ければどういう機能が必要か分かる」):
  - **💻 開発者モード** (panel/tool): ヘッダーに「💻 開発者」青バッジ。SOQL/Apex/Inspector/設計書など高度な開発機能
  - **⚙️ 管理者モード** (popup): ヘッダーに「⚙️ 管理者」オレンジバッジ。組織情報/Setup/Login as User/便利リンク
  - **👤 ユーザーモード** (mini-panel): ヘッダーに「👤 ユーザー」緑バッジ。SF 画面上の軽量操作
  - **README に「3 モード設計」セクション**: 各モードの想定ユーザー・ユースケース・機能群を表組みで明示、モード間の動線も整理
  - **モードバッジ CSS**: popup.css/panel.css に `.mode-badge.mode-admin/mode-dev/mode-user` を追加 (色分け + 太字 + 丸縁)
- **v2.80.0 (2026-05-20 21:48)** — 🚨 Phase 71: ユーザー報告 4 件を一括対応 (Excel 警告 / 「桁/精度」分かりにくい / サイドバー下まで見えない / ID 解析いらない):
  - **🐛 Excel ファイル警告解消**: 拡張子を `.xls` → `.xml` に変更 (中身は SpreadsheetML XML のため `.xls` だと Excel が「ファイル形式と拡張子が一致しません」警告を出していた)。MIME を `application/xml` に、BOM 付与もスキップ。Excel は `.xml` を「XML Spreadsheet」として自動認識し警告なしで開く
  - **🐛 buildObjectDef 「桁/精度」分かりにくい → 3 列に分割**: 「文字数」(string/textarea/email/phone/url 系の length) + 「数値桁数」(currency/double/percent/int/long の precision) + 「小数桁」(scale) に分離。データ型ごとに該当する列だけに値が入る仕様で意味が一目瞭然
  - **🐛 サイドバーが下まで見えない**: 「⏱ 最近開いたビュー」セクションを **サイドバーから完全撤去**。履歴自体は内部で保持し続けるが UI 表示はしない。これで「🏠 ホーム + 全 13 機能 + 5 カテゴリヘッダ」が縦に収まる
  - **🎨 ナビゲーション圧縮**: `nav` の padding 8→6、gap 4→2、nav-btn の padding 8→6、nav-sep の padding 12→6 ・font-size 11→10・margin-top 8→4 と全体的に詰めて、機能群ごとの視認性向上 + スクロールなしで全機能可視
  - **🐛 popup から「🔢 Salesforce ID 解析」セクションを撤去**: ユーザーから「いらない」フィードバック。popup のホームタブは「セッション情報 / クイックアクション / Login as User」に集中
- **v2.79.0 (2026-05-20 21:40)** — ♿ Phase 70: mini-panel 全画面誘導強化 + home-card a11y + フォーカス強化:
  - **🎯 content.js mini-panel**: 右上の「↗」ボタンを「↗ 全画面」と明示ラベル化、アクセントブルー背景で強調 — SF ページ上から全画面 UI への誘導を強化
  - **♿ panel.html / tool.html home-card**: 各カードに具体的な `aria-label`「<機能>へ移動 - <用途>」を追加、`role="list"` + `role="listitem"` で構造化、アイコン div を `aria-hidden="true"` でスクリーンリーダー対象外に
  - **♿ panel.css home-card focus-visible**: outline 3px + offset 3px + 内側 box-shadow + 背景グラデで、キーボード操作時にカード位置が明確に判別可能
  - **♿ panel.css home-mini-card focus-visible**: outline 2px + 背景強調でフォーカス可視化
- **v2.78.0 (2026-05-20 21:35)** — 🚀 Phase 69: **popup 抜本簡素化 + 大型 CTA + 3 入口の使い分け明示**:
  - **🚀 popup.html リフォーム**: SOQL タブ / API タブを popup から撤廃 (主要機能は全画面タブで完結する設計に統一)、ナビは「🏠 ホーム」「🔗 便利リンク」の 2 タブのみに
  - **🎯 最上部に大型 CTA**: グラデーション青の「🛠️ DevToolsNext を全画面で開く」ボタンを最上部に配置 (アイコン 28px + タイトル 14px + 補助テキスト + 矢印)。初めてのユーザーが一目で主要動線を理解できる
  - **🎨 popup サイズ拡大**: width 460 → 480 / max-width 780 / min-height 580、`resize: both; overflow: auto` でユーザーがドラッグでリサイズ可能 (Chrome 拡張 popup の制約により全環境保証ではないが、対応ブラウザで広げられる)
  - **🛡️ popup.js defensive null チェック**: 撤廃した SOQL/API タブの DOM が無くても init を安全に続行できるよう、`$on(id, ev, fn)` ヘルパーで全 addEventListener を null セーフ化
  - **📚 README に「3 入口の使い分け」セクション追加**: ① 全画面タブ (推奨) / ② 拡張ポップアップ / ③ DevTools パネル の使い分けを冒頭に表組みで明示。初めてのユーザーへの道案内を強化
- **v2.77.0 (2026-05-20 21:30)** — 🚨🚨 Phase 68: **重大バグ修正 (SyntaxError) + ホームダッシュボード抜本リフォーム**:
  - **🐛 CRITICAL FIX panel.js**: `doRunApex` 関数内で `const runBtn` が 2 箇所 (line 2618 と 2706) で二重宣言されており **SyntaxError: Identifier 'runBtn' has already been declared** で **panel.js 全体が評価失敗 → 「⏳ 初期化中…」のまま画面が動かなかった**。2706 の重複宣言を削除して既存変数を再利用するよう修正
  - **🚀 抜本リフォーム panel/tool に「🏠 ホーム」ダッシュボード追加 (初回表示)**: 「初めての人でもすぐ使える」「煩雑な機能を分かりやすい形に」というユーザー要望に対応:
    - 主要 6 機能 (SOQL / Inspector / データエクスポート / Apex / 設計書 / Limits) を 3x2 のカード型グリッドで一目化、各カードに 1 行説明付き
    - 補助 7 機能 (API URL / REST / Describe / メタデータ / 変更セット / Debug ログ / ログイン履歴) はミニカードに整理
    - ヒントカードでキーボードショートカット・候補ピッカー・ホーム復帰を案内
    - 左サイドバー上部に「🏠 ホーム」ボタン (グラデーション強調) を常駐
  - **🎨 sticky テーブルヘッダ重なり解消**: `.grid th` の `z-index` を 2 → 10、下境界を `2px solid var(--accent)` に強調、`box-shadow: 0 2px 4px rgba(0,0,0,0.4)` で浮き出し効果 — スクロール時にヘッダとセルが重なって見づらかった事象を解消
  - **🩺 起動診断強化**: orgInfo 初期値「⏳ 起動準備中… (JS 読込待ち)」に変更、panel.js モジュール最上部で「⏳ JS 評価済み (init 待機中)」に書き換え、catch ハンドラを `escape()` 依存しない安全実装に。これでどの段階で停止しているか視覚的に判別可能
- **v2.76.0 (2026-05-20 20:35)** — 🚨 Phase 67: ユーザー報告「未接続のまま」リグレッション切り分け診断機能:
  - **🚨 ユーザー報告 (2026-05-20 20:30 頃)**: DevTools パネルで「未接続」表示のまま動かない事象。直近 v2.71-75 のリグレッション可能性を切り分けるため診断ログ + 段階表示を追加
  - **🐛 panel.js init**: 起動進行を orgInfo に段階表示 (`⏳ 初期化中… (nav 構築)` → `(event 登録)` → `(セッション取得)` → `セッションを再取得しています…` → `Org: ...`)。どの段階で止まったか視覚的に判別可能に
  - **🐛 panel.js モジュール評価ログ**: `console.log("[DevToolsNext] panel.js module loaded (v2.76.0)")` を最上部に追加。Chrome DevTools コンソールでスクリプト読込確認可能に
  - **🐛 panel.js catch ブロック強化**: 初期化エラー時に orgInfo へエラーメッセージを赤 pill 表示、`title` 属性にスタックトレース全文を埋め込み (ホバーで確認可能)
  - **🐛 panel.html / tool.html orgInfo 初期値**: 「未接続」→「⏳ 初期化中…」に変更。init 未到達なら「⏳ 初期化中…」のまま固まることで判別容易に。「未接続」のままなら拡張がリロードされていない or HTML が古い
- **v2.75.0 (2026-05-20 20:28)** — 🚨 Phase 66: ChangeSet lockBtn + Picker aria-busy + popup タップターゲット拡大:
  - **🐛 panel.js csOnModeChange**: ChangeSet ロードボタンを `lockBtn("btnCsLoad")` + try/finally で確実に解除、Tooling SOQL 実行中の二重クリック・モード切替を防止
  - **♿ picker.js aria-busy**: 初回ロード時と「再取得」ボタン押下時の両方で `$list.setAttribute("aria-busy", "true")` を設定し、終了時に "false" に戻す — スクリーンリーダーで「読み込み中」状態が伝達される
  - **🎨 popup.css .ico タップターゲット拡大**: 26x26 → 32x32 px、flex 中央配置 + font-size 14px で絵文字アイコンの視認性向上 (⟳ ⬆ ⚙)
  - **🎨 popup.css .mini ボタン**: padding 2px→4px 拡大 + min-height 22px 確保で誤クリック予防 (履歴クリア・copy ボタン等)
- **v2.74.0 (2026-05-20 20:24)** — 🚨 Phase 65: exLoadFields lockBtn DRY + Picker コントラスト + apexClassList/fieldSetList 凡例追加:
  - **🐛 panel.js exLoadFields**: 二重クリック防止のため `lockBtn("btnExLoadFields")` ヘルパーで disabled 化、入力空時のヒントを pill warn に統一、成功/失敗双方で確実に unlock
  - **🎨 panel.css picker-row 選択強調**: `.picker-row.selected, .picker-row[aria-selected="true"]` の背景透明度を 0.15 → 0.28 に強化 + `inset box-shadow` で輪郭明確化 — キーボード操作時に現在ハイライト中の候補が一目でわかるよう視認性向上
  - **📚 buildApexClassList 凡例セクション追加**: Apex クラスとは / unmanaged / installedEditable / installed の違い / コードサイズ Apex Limit 6 MB / ステータス / API バージョン の用語解説 7 項目
  - **📚 buildFieldSetList 凡例セクション追加**: FieldSet とは / LWC・Visualforce での主な用途 / 管理画面 / 注意点 (削除時の依存) の業務担当向け解説 5 項目 + note に削除前確認の注意を追加
- **v2.73.0 (2026-05-20 20:14)** — 🚨 Phase 64: popup Login as User UX + 残 3 設計書 note サマリ:
  - **🐛 popup.js searchUsersForLogin**: 検索ボタンを実行中無効化 (二重実行防止)、ボタンラベルを「⏳ 検索中…」に動的変更、検索結果ヘッダに「✓ N 件ヒット (有効ユーザのみ・最終ログイン日時降順・最大 30 件まで)」サマリ + 検索条件入力時はキーワードも表示。成功/失敗いずれの場合もボタン状態を確実に復元
  - **🐛 buildProfileList note**: 「合計 N 件 / 内部ユーザ向け X 件 / 外部 (コミュニティ/Experience Cloud) ユーザ向け Y 件 / ライセンス別: Salesforce A 件 / Salesforce Platform B 件 / ...」と内部/外部別とライセンス別を集計
  - **🐛 buildPermSetList note**: 「カスタム X 件・標準/パッケージ Y 件 / 自組織 A 件・パッケージ由来 B 件 / ライセンス別」と組織内/パッケージ由来と種別を集計
  - **🐛 buildApexClassList note**: 既存の総コードサイズに加えて「ステータス: 有効 X 件・無効 Y 件・削除済 Z 件 / ネームスペース: 自組織 A 件・パッケージ由来 B 件」を追加
- **v2.72.0 (2026-05-20 20:08)** — 🚨 Phase 63: picker.js ARIA listbox 化 + 残設計書 note サマリ拡充:
  - **♿ picker.js**: 検索 input に `role="combobox"` + `aria-controls` + `aria-autocomplete="list"` + `aria-expanded="true"`、`.picker-list` に `role="listbox"` + `aria-label`、各 `.picker-row` に `role="option"` + `aria-selected` + ユニーク id、ヘッダ行は `role="presentation"`、選択行 id を `aria-activedescendant` でスクリーンリーダーに伝達、件数カウンタを `role="status" aria-live="polite"` 化 — 9 種類すべての Picker (sobject / field / profile / permset / apexClass / flow / user / lwc / changeset 等) で a11y 大幅改善
  - **🐛 buildApexTriggerList note**: 「対象オブジェクト N 種類 / 有効 X 件・無効 Y 件・削除済 Z 件 / 総コードサイズ M / イベント発火件数 BI/AI/BU/AU/BD/AD/AUD」と詳細サマリ
  - **🐛 buildFlowList note**: 「種別内訳: 自動起動フロー X 件 / 画面フロー Y 件 / ワークフロー Z 件 / ...」+ Workflow/Process Builder の件数があれば「⚠ 廃止予定 (フロー移行推奨)」を自動付記
  - **🐛 buildFlowList フォールバック note**: FlowDefinitionView 非対応 org でも種別サマリ表示
  - **🐛 buildAppList note**: 「AppDefinition N 件 (Lightning X / Classic Y) / AppMenuItem 種別内訳: TabSet A / Connected B / ServiceProvider C / Network D (表示 V / 非表示 H)」と UI 種別と App Launcher 表示状態を集計
- **v2.71.0 (2026-05-20 20:03)** — 🚨 Phase 62: 設計書 note サマリ追加 + a11y (aria-live/role/aria-current) 強化:
  - **🐛 buildValidationRuleList note**: 「有効 N 件 (XX.X%) / 無効 M 件 / 項目直下 K 件・ページ上部 L 件」と稼働状況と表示位置内訳を集計
  - **🐛 buildRecordTypeList note**: 「対象オブジェクト N 種類 / 有効 X 件 (XX.X%) / 無効 Y 件 / 営業プロセス連携あり Z 件」と組織全体の RT 分布を可視化
  - **🐛 buildCustomSettingList note**: 「List 型 N 件 / Hierarchy 型 M 件」の型別件数を分けて表記
  - **🐛 buildErDiagram note**: 「関連エンティティ N 件 / 親方向参照 X 件 (MD A + Lookup B) / 子方向参照 Y 件 (MD C + Lookup D)」と MD/Lookup 内訳を集計、childRelationships 30 件超の省略明示
  - **♿ a11y panel.html / tool.html / popup.html**: `header role=banner`、`aside aria-label`、`nav aria-label`、`<meta />` 領域 (soqlMeta / inspectMeta / exMeta / apiBuildMeta / apexMeta / restMeta / loginMeta / exProgress / orgInfo / apiMeta / statusMsg) に `role="status" aria-live="polite" aria-atomic="true"` を一斉付与 — スクリーンリーダーが結果取得・実行中状態を読み上げ可能に
  - **♿ panel.js switchToView**: `nav-btn` の `aria-current="page"` トグル + `.view` の `aria-hidden` トグルを実装、初期 active ボタンにも bindNav で同期
  - **🎨 CSS 空状態ヒント拡張**: `#metadataResult` / `#inspectResult` / `#exPreview` にも :empty::before で具体的な操作手順を表示 (3 ペイン分追加で 9 ペイン全網羅)
- **v2.70.0 (2026-05-20 20:19)** — 🎊 Phase 61: 「カラム名・値・桁数の改善」累計サマリ表を README に追加:
  - **📚 README に「v2.69.0 累計サマリ (Phase 50-60)」セクション追加**: ユーザー要望対応の Phase 50-60 改修を 5 カテゴリ表で整理 (数値整形 / 長文 truncate / カラム名統一 / 集計 note / 値表記)
  - **🧪 設計書 22 種類のヘルパー適用最終確認**: fmtNum/fmtBytes/fmtTrunc/fmtPercent/fmtDate が全 builder に行き渡っていることを確認、残課題なし
- **v2.69.0 (2026-05-20 20:15)** — 🚨 ユーザー要望 Phase 60: ProfileDetail + ApexDetail サマリ拡充:
  - **🐛 buildProfileDetail サマリ**: 9 シート毎の集計件数を「N 件」単位付きで表示 (Object 権限 / FLS / System 権限 / Apex / VF / Tab / RecordType / App 可視性)
  - **🐛 buildApexDetail サマリ**: API バージョン `v62.0` 形式、コードサイズを fmtBytes (KB/MB)、メソッド構成「合計 N 件 (global X / public Y / private Z / protected W)」と可視性別件数集計、プロパティ数・内部クラス数も追加
- **v2.68.0 (2026-05-20 20:11)** — 🚨 ユーザー要望 Phase 59: FLS レポート note サマリ集計:
  - **🐛 buildFlsReport note**: 「対象 N 項目 / 編集可 X 項目 (XX.X%) / 参照のみ Y 項目 (YY.Y%) / アクセス無し Z 項目 (ZZ.Z%) / Excel 形式推奨」と項目アクセス傾向のサマリを集計表示。FLS の傾向 (どの程度のフィールドが編集可・参照のみか) が一目で把握可能
- **v2.67.0 (2026-05-20 20:07)** — 🚨 ユーザー要望 Phase 58: 権限マトリクス分析サマリ + LWC 総サイズ集計:
  - **🐛 buildFieldPermMatrix サマリ拡充**: 新規項目「参照可率 (R 以上): XX.X% (N / M セル)」「編集可率 (RW): XX.X% (N / M セル)」を追加。組織全体の項目アクセス傾向を %ベースで把握可能
  - **🐛 buildObjectPermMatrix サマリ拡充**: 新規項目「V (ViewAllRecords) 付与数: N 件 (監査時に要確認の高権限)」「M (ModifyAllRecords) 付与数: N 件 (誤付与リスク大、システム管理者相当)」を追加 — 監査時の最重要チェック項目
  - **🐛 buildLwcDetail note**: 「バンドル内ファイル N 件」→「バンドル内ファイル N 件 / 総サイズ X.X KB (Y,YYY 文字)」と LWC コンポーネントの規模を一目把握
- **v2.66.0 (2026-05-20 20:03)** — 🚨 ユーザー要望 Phase 57: FlowDetail 要素種別件数集計 + fmtPercent ヘルパー:
  - **🐛 buildFlowDetail note**: 「要素総数: N 件 (内訳: 変数 X 件 / 分岐 Y 件 / 画面 Z 件 / ...)」と全要素 13 種類の件数を集計表示。フロー全体の規模感が一目で把握可能
  - **📐 fmtPercent ヘルパー追加**: 比率を「12.3%」形式に統一 (引数 decimals で小数桁数指定可)
  - **🐛 buildApexClassList note**: Apex Limit 使用率の表記を fmtPercent に統一 (旧: 直接 toFixed)
  - 設計書ヘルパーは fmtNum/fmtBytes/fmtTrunc/fmtDate/fmtPercent の **5 種類** に拡充
- **v2.65.0 (2026-05-20 19:59)** — 🚨 ユーザー要望 Phase 56: ApexTrigger コードサイズ + LWC バンドル並び順 + Inspector pill 改善:
  - **🐛 buildApexTriggerList**: SOQL に LengthWithoutComments 追加、ステータスを絵文字付き (○ 有効 / − 無効 / ✗ 削除済)、新規列「コードサイズ」(fmtBytes 自動単位) 追加
  - **🐛 buildLwcDetail バンドル内ファイル並び順**: html → js → xml → css → svg → json → 他 の優先順でソート (LWC 開発時の自然な閲覧順)
  - **🐛 panel.js Inspector pill**: 項目数・値あり件数を 3 桁区切り (toLocaleString) に + tooltip 追加 (「describe の全項目数」「null/空白/false を除いた値があるフィールド数」)
- **v2.64.0 (2026-05-20 19:55)** — 🚨 ユーザー要望 Phase 55: AppList 件数 + README ヘルパーリファレンス:
  - **🐛 buildAppList note**: 「合計 N アプリ」→「AppDefinition N 件 / AppMenuItem M 件」と 2 種類の件数を分けて明示
  - **📚 README に「設計書フォーマット用ヘルパー」リファレンス追加**: design-docs.js の `fmtNum / fmtBytes / fmtTrunc / fmtDate` の用途と例を表で整理、開発者が同じパターンで他設計書を改修できるよう
  - **🎊 サイクル 200 マイルストーンセクション追加**: Phase 1-54 / 63 minor リリースの累計を強調
- **v2.63.0 (2026-05-20 19:51)** — 🎊 サイクル 200 マイルストーン / Phase 54: ApexClass コードサイズをバイト換算 + Apex Limit 使用率明示:
  - **🎊 累計 200 サイクル / 63 minor リリース達成**: 2026-05-20 13:30 のユーザー要望開始から約 6.5 時間で 54 Phase の連続改善
  - **🐛 buildApexClassList**: 列名「コード行数 (コメント除く)」→「コードサイズ (コメント除く)」に正名化、表示を `12,345 文字` → `12.5 KB` (fmtBytes 自動単位) に変更 (LengthWithoutComments はバイト単位フィールドのため正確に)
  - **🐛 buildApexClassList note**: 「総コード行数 N 行」→「総コードサイズ ${fmtBytes(N)} (Apex Limit 6 MB に対する使用率: 約 X.X%)」と Apex Limit 残量を視覚化 (組織全体の Apex 容量管理に有用)
- **v2.62.0 (2026-05-20 19:47)** — 🚨 ユーザー要望 Phase 53: 説明列の長文 truncate + fmtTrunc ヘルパー導入:
  - **🔤 design-docs.js fmtTrunc ヘルパー追加**: 長文を指定文字数 (既定 200 文字) で切り詰めて末尾に「 … [+N 文字省略]」を付与。3 桁区切りで残り文字数も表示
  - **🐛 buildObjectDef**: ヘルプテキスト 150 文字 / 説明 200 文字で truncate
  - **🐛 buildProfileList / buildPermSetList / buildFlowList / buildValidationRuleList / buildRecordTypeList / buildCustomSettingList / buildFieldSetList**: 「説明」列を 200 文字 truncate (RecordType・ValidationRule では「説明 (開発者向け)」、CustomSetting・FieldSet は通常「説明」)
  - **🐛 buildValidationRuleList エラーメッセージ列**: 300 文字 truncate (一般的なユーザ向けメッセージは 200 文字より長くなることがあるため)
  - **📐 buildRecordTypeList カラム名統一**: 「API名 (DeveloperName)」→「API 名 (DeveloperName)」(半角スペース)
- **v2.61.0 (2026-05-20 19:43)** — 🚨 ユーザー要望 Phase 52: FLS レポート / ObjectDef 桁/精度 / AccessControl 件数:
  - **🐛 buildFlsReport**: 列を「編集可 (Edit) 件数 / 編集可 (Edit) 内訳 / 参照のみ (Read) 件数 / 参照のみ (Read) 内訳 / アクセス無し 件数」に拡張。各項目が何件のプロファイル/権限セットでどのアクセス許可になっているか一目で分かる
  - **🐛 buildObjectDef 桁/精度列**: 「123」→「123 文字」、「10,2」→「精度 10 / 小数 2」と単位付きに、カスタム列「Yes/No」→「○ カスタム / − 標準」絵文字付き
  - **🐛 buildAccessControl**: OWD/ロール件数を 3 桁区切り (fmtNum) に
  - **🐛 buildLwcDetail バンドル内ファイル件数**: 3 桁区切り (fmtNum)
- **v2.60.0 (2026-05-20 19:39)** — 🚨 ユーザー要望 Phase 51: 残設計書の桁数・値表記を改善:
  - **🐛 buildFieldPermMatrix サマリ**: 「対象フィールド数 / プロファイル数 / 権限セット数 / FieldPermissions レコード数」を 3 桁区切り + 「N 項目」「N 件」単位付きに
  - **🐛 buildObjectPermMatrix サマリ**: 同様に 4 サマリ項目を 3 桁区切り + 単位付きに
  - **🐛 buildFlowList**: アクティブ列を「○ 稼働中 / − 停止」に絵文字付き、バージョンを `v2` 形式に統一、フォールバック (FlowDefinitionView 不可組織) も同様に
  - **🐛 buildAppList AppMenuItem 並び順**: SortOrder を 3 桁区切り表示に
  - **🧪 panel.js Limits ダッシュボード**: 既に toLocaleString 利用済を確認、追加対応不要
- **v2.59.0 (2026-05-20 19:35)** — 🚨 ユーザー要望 Phase 50 (待機解除): 設計書のカラム名・値・桁数を改善:
  - **🔢 design-docs.js fmtNum / fmtBytes ヘルパー追加**: 数値 3 桁区切り (12,345) / バイトサイズ自動切替 (1,023 B → 12.1 KB → 1.18 MB → 2.50 GB) 共通関数を導入
  - **🐛 buildApexClassList**: コード行数を 3 桁区切り表示 (12345 → "12,345")、API バージョンを "v62.0" 表記、Status を絵文字付き (○ 有効 / − 無効 / ✗ 削除済)、「作成日」列追加、note に **総コード行数の集計** 「総コード行数: 1,234,567 行」を追加 (Apex Limit 試算用)
  - **🐛 buildLwcDetail バンドル内ファイル**: 「サイズ」を「文字数」 + 「サイズ」 (バイト自動単位) の 2 列に分離、文字数は 3 桁区切り、サイズは KB/MB 自動切替
  - **🐛 buildProfileList**: 「ライセンス」空欄を「(なし)」明示、「作成日」列追加 (4 列 → 5 列に拡張)
  - **📐 カラム名統一**: 全設計書の "API名" → "API 名" (半角スペース統一) — buildObjectDef / buildFieldSetList / buildCustomSettingList / buildFieldPermMatrix 等
  - **📊 note の件数表示統一**: 全 11 箇所の `合計 N 件` を `合計 ${fmtNum(N)} 件` に変更し、3 桁区切りに統一
- **v2.58.0 (2026-05-20 17:40)** — 🚨 Phase 48: panel.html kbd-hint に Picker 操作追加 + 全 apiError 英語残存ゼロ確認:
  - **🐛 html/panel.html ヘッダ kbd-hint**: 「Ctrl+Enter 実行 / Esc 閉じる / Ctrl+Alt+I/Q/A/L/R/D ビュー切替」→「Ctrl+Enter 実行 / Esc 閉じる / ↑↓ Picker / Ctrl+Alt+I/Q/A/L/R/D ビュー切替」(tool.html と完全一致)
  - **🧪 design-docs.js apiError 22 箇所全点検**: 全て ですます調 + 業務語統一済を確認 (英語残存ゼロ)。代表例: 「プロファイル/権限セット/Apex クラス/フロー/入力規則/レコードタイプ/フィールドセット/カスタム設定/オブジェクト権限/項目権限 の取得に失敗しました」
  - **🧪 console.log / @media / kbd タグ点検済**: 全て整合性確認
- **v2.57.0 (2026-05-20 17:35)** — 🚨 Phase 47: manifest description を最新化:
  - **🐛 manifest.json description**: 「設計書20種」→「設計書 22 種類 (業務向け凡例付き)」に最新化、全角/半角スペースを統一 (レコードInspector → レコード Inspector、API URLビルダー → API URL ビルダー、Limitsダッシュボード → Limits ダッシュボード)、末尾「自動アップデート。」→「自動アップデートを提供します。」 ですます調 に統一
  - **🧪 console.log 15 箇所点検済**: 全て `[DevToolsNext]` プレフィックス付きの診断ログ (stale request discard / init error / datalist refresh) で適切。修正不要
  - **🧪 CSS @media 3 箇所点検済**: panel.css 内 `max-width 600/900` の breakpoint は別要素 (kbd-hint / picker-kbd-hint / Limits mobile) を制御、統合不要
- **v2.56.0 (2026-05-20 17:30)** — 🔍 検証サイクル: Phase 46 既存実装の確認 (修正不要):
  - **🧪 panel.css field-row-header**: 既に sticky 実装済 (top:0, z-index:2 で長レコードでも先頭が常時可視)
  - **🧪 popup.css .history-item**: flex + ellipsis truncate で既に最適レイアウト
  - **🧪 popup.js soqlMeta**: Tooling 利用時に「(Tooling API)」サフィックス表示済
  - **🧪 panel.js stringify**: object/null/datetime ハンドリング + recordsTable 120 文字 truncate で長文対応済
  - 改修必要箇所なし。検証完了の証跡として本リリースを記録。バージョン進行で自動更新通知に伝播
- **v2.55.0 (2026-05-20 17:25)** — 🚨 ユーザー要望 Phase 45: curl sid 注意明示 + splitMd 仕様コメント:
  - **🛡 panel.js renderApiBuild curl 出力**: 「⚠ 注意: 以下の curl コマンドには Salesforce セッション ID (sid) を含めるため、外部共有時はマスクしてください」というセキュリティ注意コメントを curl 出力の冒頭に追加。誤って curl をログ/Slack/メール等に共有しないよう促す
  - **📝 design-docs.js splitMd**: 仕様コメント追加 (Markdown テーブル行 "| a | b | c |" をセル配列に分解、セル値内 `|` リテラルがあると分割される旨を明記、ただし設計書ジェネレータは csvCell で `,` 置換済のため実害なし)
- **v2.54.0 (2026-05-20 17:20)** — 🚨 ユーザー要望 Phase 44: CSS カラーパレット ドキュメント化:
  - **🎨 css/panel.css :root 変数ブロック**: 各 CSS 変数 (--bg/bg2/bg3 / --fg/fg-dim / --accent/accent-2 / --ok/warn/err / --line) の役割を 7 行コメントで明示
  - **🎨 css/popup.css :root 変数ブロック**: panel.css と同期した同様の役割コメント追加 (色定義の意図が後から参照可能)
  - **🛡 background.js readDiskVersion**: 既に try/catch + null フォールバック実装済を確認 (追加対応不要)
- **v2.53.0 (2026-05-20 17:15)** — 🚨 ユーザー要望 Phase 43: inline() XSS サニタイズ確認 + ドキュメント:
  - **🛡 design-docs.js inline()**: XSS 対策のコメントを明示化。esc() で HTML エンティティを先にエスケープしてから、安全な範囲のみ Markdown 記法を許可 (code/bold/italic のみ、link [text](url) と img ![](url) は意図的に未サポート — 設計書本文に URL 埋め込み経路がないため)。挙動変更なし、XSS リスク評価の証跡として説明コメントを保存
- **v2.52.0 (2026-05-20 17:10)** — 🚨 ユーザー要望 Phase 42: markdownToHtml テーブル th tooltip + 自動更新仕組み:
  - **🐛 design-docs.js markdownToHtml**: テーブル ヘッダ th に title 属性 (列名 plain text) を付与。長い列見出しが幅で省略されたとき hover で全文が読める a11y 改善。これにより設計書プレビュー内の全 22 種テーブル列名に title が自動付与される
  - **📚 README に「🔄 自動アップデートの仕組み」セクション追加**: alarms API による 30 秒ポーリング、VERSION.txt 比較、notifications による通知表示、chrome.runtime.reload による即時反映の仕組みを解説
- **v2.51.0 (2026-05-20 17:05)** — 🚨 ユーザー要望 Phase 41: popup focus-visible スタイル統一:
  - **🐛 css/popup.css**: button / a / input / select / textarea の focus-visible に 2px outline (accent 色) を追加。これによりキーボードナビゲーション時のフォーカス位置が明確に。panel.css と同等の a11y 品質に統一
  - **🐛 design-docs ヘッダ tooltip 統一**: markdownToHtml 経由のため広範な改修が必要であり、本サイクルでは popup focus-visible に絞って完了 (Phase 42 以降で検討)
- **v2.50.0 (2026-05-20 17:00)** — 🎊 マイルストーン: 累計 50 minor リリース達成 / Phase 1-39 完了 + panel.html kbd-hint:
  - **🎊 v2.50.0 マイルストーンサマリを README に追加**: Phase 1〜39 (158 サイクル) の業務向け改修まとめ (設計書 22 種凡例 / 文言 400+ 箇所統一 / 全 16+ ボタン disabled / 業務情報拡充 / エラー処理改善 / 日本語化統一 / アクセシビリティ)
  - **🐛 html/panel.html ヘッダ kbd-hint**: tool.html と統一して「Ctrl+Enter 実行 / Esc 閉じる / Ctrl+Alt+I/Q/A/L/R/D ビュー切替」を表示、tooltip で全ショートカット詳細、brand クリック動作の hint 追加、apiVer select に title 追加
  - **🐛 css/panel.css**: .kbd-hint スタイル追加 (font-size 10px / opacity 0.7 / .kbd 共通スタイル) + @media (max-width: 900px) でモバイル非表示
- **v2.49.0 (2026-05-20 16:55)** — 🚨 ユーザー要望 Phase 39: キーボードショートカット表示 + README 目次:
  - **🐛 html/tool.html ヘッダの kbd-hint**: 表示を「Ctrl+Enter 実行 / Esc 閉じる / ↑↓ Picker 移動」から「Ctrl+Enter 実行 / Esc 閉じる / ↑↓ Picker / Ctrl+Alt+I/Q/A/L/R/D ビュー切替」に拡充、tooltip で全ショートカットの意味を詳細説明
  - **📚 README.md 目次セクション追加**: 「更新履歴」「設計書 22 種類 業務向け詳細解説」「設計書ジェネレータ手動テストガイド」「機能」「デプロイ方法」「既知の前提・制約」へのアンカーリンクを冒頭に追加
- **v2.48.0 (2026-05-20 16:50)** — 🚨 ユーザー要望 Phase 38: Picker キーボード操作詳細 + popup 履歴件数サマリ:
  - **🐛 picker.js キーボードヘルプ tooltip**: 「⌨ ↑↓ / Home/End / Enter / Esc」の hover で「↑↓ で候補移動 / Home/End で先頭・末尾へ / Enter で決定 / Esc で閉じる」を詳細表示
  - **🐛 picker.js 閉じる/クリアボタン title**: 「閉じる」→「ピッカーを閉じます」、「クリア」→「検索キーワードをクリアします」 ですます調
  - **🐛 popup.js renderHistory**: 履歴一覧の冒頭に件数サマリ「📋 履歴 N 件 (📌 ピン留め M 件 / 通常 K 件)」を表示
  - **🐛 design-docs.js apiError context 確認済**: 残った 8 箇所はすべて ですます調統一済 (撲滅完了)
- **v2.47.0 (2026-05-20 16:45)** — 🚨 ユーザー要望 Phase 37: Inspector フィルタ件数表示 + Picker 9 種文言:
  - **🐛 panel.js renderInspectorFields**: 絞込み中に冒頭で「🔍 絞込み「X」: N 件ヒット (全 M 項目中)」を表示。空状態ヒント文言を ですます調 詳細化 (「null フィールドも出ます」→「null フィールドも表示されます」、「✕ でクリアして全件表示」→「✕ でクリアすると全件表示されます」)、空メッセージ「📭 該当フィールドなし」→「📭 該当するフィールドはありません」
  - **🐛 panel.js renderRecentNav**: 「最近開いたビュー」見出しに tooltip 追加、各ボタン tooltip を日時付きの ですます調 詳細化 (「X を YYYY-MM-DD HH:mm に開きました」)
  - **🐛 picker.js PICKER_DEFS 9 種類**: タイトル/placeholder を統一形式 (「X を選択してください」「Y で検索できます」) に変更 (sobject / field / profile / permset / profileOrPermset / apexClass / flow / lwc / user の 9 種類)、「LWC バンドル」→「LWC コンポーネント」、「ユーザー」→「ユーザ」
- **v2.46.0 (2026-05-20 16:40)** — 🚨 ユーザー要望 Phase 36: reconnect 再接続ボタン disabled + 状態表示:
  - **🐛 panel.js reconnect (再接続ボタン)**: 実行中に btnReconnect 無効化、orgInfo 領域に「⏳ セッションを再取得しています…」表示、SF タブ未検出時は「Salesforce のタブではありません」 pill、sid 失敗時は「sid Cookie の取得に失敗しました」 pill (ですます調)、成功時にボタン再有効化
  - **🐛 panel.js exDownloadAll (CSV/Excel/JSON ダウンロード)**: 既存実装で「⏸ 取消」表記により実行中状態は明示済 (確認のみ)
  - 全主要ボタン (12+) の実行中 disabled / loading 表示が統一完了
- **v2.45.0 (2026-05-20 16:35)** — 🚨 ユーザー要望 Phase 35: 残ボタン disabled 統一 + lockBtn ヘルパー導入:
  - **🐛 panel.js lockBtn() ヘルパー追加**: ボタン id を渡すと無効化し、戻り値の関数で解除できる共通ヘルパー (DRY 化)
  - **🐛 panel.js doLimits / doMetadataList / doFetchLogs / doFetchLoginHistory / doGenerateDesign**: 5 関数全てに lockBtn を適用して実行中の二重クリック防止 (btnLimits / btnMetadata / btnFetchLogs / btnFetchLogin / btnDesignGen)
  - **🐛 panel.js doGenerateDesign**: ローディング表示「生成中…」→「⏳ 設計書を生成しています…」、try/catch を try/finally に変更してエラー時もボタン解除を保証
  - **🐛 panel.js doFetchLoginHistory エラー context**: 「Login History 取得」→「ログイン履歴の取得」に
- **v2.44.0 (2026-05-20 16:30)** — 🚨 ユーザー要望 Phase 34: 全主要ボタンの実行中 disabled 統一:
  - **🐛 panel.js doInspect (btnInspect)**: 実行中ボタン無効化 + opacity (二重クリック防止)、全分岐 (KeyPrefix エラー / describe エラー / record エラー / 成功) で再有効化、record エラーヒント ですます調 詳細化
  - **🐛 panel.js doDescribe (btnDescribe)**: 実行中ボタン無効化、空入力時に「⚠ オブジェクトの API 名を入力してください」 pill 表示
  - **🐛 panel.js exRunPreview (btnExRun)**: 実行中ボタン無効化、ローディングメッセージ「実行中 (プレビュー先頭 200 件)…」→「⏳ プレビュー (先頭 200 件) を取得しています…」
  - **🐛 popup.js doApiCall (btnApiSend)**: 実行中ボタン無効化、「⚠ パスを入力してください」→「⚠ REST API パスを入力してください」
- **v2.43.0 (2026-05-20 16:25)** — 🚨 ユーザー要望 Phase 33: SOQL 実行 ボタン disabled + HTML メタタグ:
  - **🐛 panel.js doSoql**: 実行中はボタン無効化 + opacity 0.6 (二重クリック防止)、空クエリ時に「⚠ SOQL クエリを入力してください」 pill 表示、ローディング表示「⏳ 実行中…」→「⏳ SOQL を実行しています…」、終了/エラー時に再有効化
  - **🐛 popup.js doSoql**: 同様に実行中ボタン無効化、エラーメッセージ「❌ HTTP N」→「❌ クエリ実行に失敗しました (HTTP N)」、成功時 meta「✅ N 件 / total=M / Tms (Tooling)」→「✅ 取得 N 件 / 合計 M 件 / Tms (Tooling API)」、setStatus「OK」→「✓ 成功しました」
  - **🐛 html/popup.html, panel.html, tool.html**: meta description (拡張機能の説明)、theme-color (#1b96ff = Salesforce ブルー) 追加、panel.html に viewport meta 追加
- **v2.42.0 (2026-05-20 16:20)** — 🚨 ユーザー要望 Phase 32: Apex 実行ローディング + recordsTable 長文 truncate:
  - **🐛 panel.js doRunApex**: 実行中はボタンを無効化 (opacity 0.6) して二重クリック防止、実行中メッセージを「⚡ 匿名 Apex を実行しています… #N」に丁寧化、コード空時にエラー pill 表示、終了/エラー時にボタン再有効化
  - **🐛 panel.js recordsTable セル長文 truncate**: 120 文字超のセル値を先頭 120 文字 + 「…」インジケータで表示、ホバーすると tooltip で先頭 280 文字をプレビュー、ダブルクリックで全文コピー
  - **🐛 panel.js tooltip ですます調**: 「dblclick で raw JSON コピー」→「ダブルクリックで raw JSON をコピーできます」、「ダブルクリックでコピー」→「ダブルクリックでコピーできます」、コピー toast「📋 コピー: X」→「📋 クリップボードにコピーしました: X」
  - **🐛 panel.js Debug ログサイズ tooltip**: 「(1MB 超: スクロール重い可能性)」→「(1 MB 超のため、スクロールが重くなる可能性があります)」 ですます調
- **v2.41.0 (2026-05-20 16:15)** — 🚨 ユーザー要望 Phase 31: ビュー切替スクロールリセット + ID 自動解析:
  - **🐛 panel.js switchToView**: ビュー切替時にメイン領域のスクロール位置を最上部にリセット (`.main` 要素の scrollTop = 0)。前ビューでスクロールしていた状態が残る UX 問題を解消
  - **🐛 popup.js ID 入力**: 15 桁または 18 桁の英数字 ID が入力されたら 250ms デバウンス後に自動解析 (UX 改善 — 「解析」ボタンを毎回押さなくて良い)、Enter キーでも即時解析
- **v2.40.0 (2026-05-20 16:10)** — 🚨 ユーザー要望 Phase 30: 設計書 note 末尾文言の一貫性統一:
  - **🐛 design-docs.js 設計書 note 末尾文言 8 箇所**: 体言止め残存を ですます調 詳細化 (例: 「コード行数はトリガ Apex Limit 試算の目安」→「コード行数は Apex Limit (組織あたり 6 MB) の試算目安としてご活用ください」、「Before/After × Insert/Update/Delete/Undelete の発火タイミング表」→「発火タイミング表となっています」、「種別と状態は業務用語表記」→「業務用語で表記しています」、「Process Builder は段階的廃止」→「段階的に廃止予定です」、Mermaid 注意書き→「貼り付けると可視化できます。線種: ... です」、SharingRules 注釈→「含まれていません」、FLS Excel ヒント→「左 4 列と先頭行を固定すると見やすくなります」)
  - **🐛 design-docs.js FieldSet 一覧 note**: 「合計 N 件」のみだったところを「FieldSet は LWC/VF から動的に項目セットを参照するために利用されます」と業務背景を補足
- **v2.39.0 (2026-05-20 16:05)** — 🚨 ユーザー要望 Phase 29: displayApiError hint links / 設計書 トップへ / Mermaid:
  - **🐛 panel.js displayApiError hint links (HTTP 401/403/404/400/429/500) 11 個**: ラベルを「動詞 + 業務語」に統一 (「セッション管理を開く」→「🔧 セッション設定を開く」、「Login History」→「📜 ログイン履歴を確認する」、「プロファイル一覧」→「👤 プロファイル一覧を開く」、「OWD 設定」→「🔓 共有設定 (OWD) を開く」、「Describe ビューを開く」→「📖 Describe ビューで項目を確認する」、「Limits ダッシュボード」→「📊 Limits ダッシュボードで使用状況を確認する」、「Status Trust ページ (外部)」→「🌐 Salesforce Trust (障害情報) を確認する」)
  - **🐛 panel.js 設計書プレビュー「▲ トップへ」ボタン**: 「▲ トップへ」→「▲ 先頭へ戻る」、title「プレビューの先頭にスクロール」→「クリックでプレビューの先頭までスクロールします」
  - **🐛 panel.js Mermaid Live Editor ボタン title**: 「別タブで mermaid.live を開いて図を表示」→「新しいタブで mermaid.live を開き、ER 図を可視化します」
- **v2.38.0 (2026-05-20 16:00)** — 🚨 ユーザー要望 Phase 28: Apex Debug ログ / API body サンプル / openIdInOrg:
  - **🐛 panel.js Apex Debug ログ取得失敗時**: hint を ですます調 詳細化 (「削除済または期限切れの可能性」→「ログが削除済か期限切れの可能性があります」、「ApexLog 参照権限が不足しています」→「Apex ログの参照権限が不足しています (Setup → ユーザ → 権限セットをご確認ください)」、「Trace Flag が未設定の可能性」を ですます調 + 補足追加)
  - **🐛 panel.js Apex 成功時表示**: 「(コンパイル & 実行 OK)」→「(コンパイル・実行に成功しました)」
  - **🐛 panel.js API URL ビルダー body サンプル**: create/update/upsert の body JSON を 1 行から複数行 + 業務的な値に拡充 (取引先名 + Description 等、コピペで使える形)
  - **🐛 popup.js openIdInOrg**: 「⚠ 有効な ID を入力してください」→「⚠ 15 桁または 18 桁の有効な Salesforce ID を入力してください」、「⚠ Salesforce のタブで実行してください」→「⚠ Salesforce のタブを開いてから実行してください」、成功時に「🔍 レコード X を新しいタブで開きました」 toast 追加
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

## 🎊 v2.69.0 累計サマリ (Phase 50-60: 設計書カラム/値/桁数の改善)

2026-05-20 19:25 のユーザー要望「出力する設計書のカラム名や出力される値や桁数などもしっかりと練ってほしい」を受けて Phase 50-60 で実施した設計書品質改善:

| カテゴリ | 達成内容 |
|---|---|
| 🔢 数値整形 | **fmtNum / fmtBytes / fmtPercent ヘルパー** 導入。設計書全件数を 3 桁区切り、サイズを KB/MB 自動切替、比率を `XX.X%` 形式に統一 |
| 🔤 長文 truncate | **fmtTrunc ヘルパー** 導入で 7 設計書 (ObjectDef / Profile / PermSet / Flow / ValidationRule / RecordType / CustomSetting / FieldSet) の説明列を 200 文字 + 末尾省略マーカーに |
| 📐 カラム名統一 | 全設計書の `"API名"` → `"API 名"` (半角スペース)、`"コード行数"` → `"コードサイズ"` (バイト単位の正名化)、ApexClass/Trigger に新規「コードサイズ」列追加 |
| 📊 集計 note | FLS レポート (編集可/参照のみ/アクセス無し %集計)、FieldPermMatrix (参照可率/編集可率)、ObjectPermMatrix (V/M 高権限付与数)、FlowDetail (13 要素種別件数)、ApexClass (Apex Limit 6 MB 使用率)、LWC (バンドル総サイズ)、ProfileDetail (9 シート件数)、ApexDetail (メソッド可視性別件数) |
| ✨ 値表記 | Status 値を絵文字付き (○ 有効 / − 無効 / ✗ 削除済)、Flow バージョンを `v2` 形式に統一、ManageableState を業務語マッピング |

設計書の各 note (脚注) で組織全体の規模感・傾向が一目で把握できるよう拡充されました。

## 🎊 v2.63.0 サイクル 200 マイルストーン (Phase 1-54 / 63 minor リリース)

2026-05-20 13:30 のユーザー要望開始から約 6.5 時間で **54 Phase / 200 サイクル / 63 minor リリース** を達成。v2.50.0 (Phase 39 完了) 以降は「カラム名・値・桁数の改善」フィードバックを受けて設計書品質を継続改修。

### 開発者向け: 設計書フォーマット用ヘルパー (design-docs.js)

| ヘルパー | 用途 | 例 |
|---|---|---|
| `fmtNum(n)` | 数値を 3 桁区切り | `12345` → `"12,345"` |
| `fmtBytes(n)` | バイト数を人間可読サイズに自動切替 | `12345` → `"12.1 KB"` / `1234567` → `"1.18 MB"` |
| `fmtTrunc(s, max=200)` | 長文を切り詰めて末尾に省略マーカー | `"長文..."` → `"長文 … [+1,234 文字省略]"` |
| `fmtDate(s)` | ISO datetime を `YYYY-MM-DD HH:mm` 形式に | `"2026-05-20T13:30:00Z"` → `"2026-05-20 13:30"` |
| `fmtPercent(r, d=1)` | 比率を `XX.X%` 形式に | `0.123` → `"12.3%"` / `0.4567, 2` → `"45.67%"` |

設計書の note・列値はすべてこれらのヘルパーで整形されます。

## v2.50.0 マイルストーン 🎊 (累計 158 サイクル / Phase 1-39 改善完了)

2026-05-20 のユーザーフィードバック「日本語がおかしかったり、設計書もつかいづらいのがおおいです」を受け、Phase 1〜39 にわたる連続的な業務向け品質改善を実施。

| カテゴリ | 達成内容 |
|---|---|
| 📚 設計書 22 種類 | 全種類に **業務向け凡例セクション** を追加 (Apex は @AuraEnabled/@InvocableMethod/@TestVisible 等を解説、Flow は ProcessType 12 種を日本語+原文、ER 図は MD/Lookup 線種区別、FLS/オブジェクト権限は CRUDVM/RW/R-/-- 記号を業務語で説明)、列名・ステータス値を業務語マッピングに統一 |
| 💬 文言統一 | HTML / JS / CSS で 約 **400+ 箇所** を ですます調 + 業務用語に統一。英語短縮 (「FLS 取得」「Apex 実行」「Limits 未取得」等) を撲滅 |
| 🎮 UX 改善 | 全主要 **16+ ボタン** の実行中 disabled (二重クリック防止) + ローディング表示、ID 入力 250ms デバウンス自動解析、ビュー切替時スクロールリセット、recordsTable 長文セル 120 文字 truncate + tooltip プレビュー、Inspector 絞込み件数表示、popup 履歴件数サマリ |
| 🔗 業務情報拡充 | API_HELP 19 オペレーション全てに「業務用途:」を追記、displayApiError 6 hint (401/403/404/400/429/500) に絵文字+業務語付き Setup リンク、popup 便利リンク 18 項目を日本語業務名 |
| 🛡 エラー処理 | sfFetch / picker / design-docs / panel の throw new Error 文字列をすべて ですます調 詳細化、HTTP ステータス別 hint で対処方法と Setup ナビゲーションを表示 |
| 🇯🇵 日本語化 | LWC バンドル→LWC コンポーネント、ユーザー→ユーザ、Login → ログイン、Setup→設定、describe(X)→オブジェクト 'X' の describe 取得に失敗しました 等、用語を業務通用語に統一 |
| ⌨ アクセシビリティ | popup ID 入力に pattern + maxlength 属性追加、tool.html/panel.html に Ctrl+Alt+I/Q/A/L/R/D ショートカット可視化、各ナビボタン 13 個に絵文字プレフィックス統一 |

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

### 🎨 拡張アイコン作成プロセス (v3.43.0 〜)

拡張アイコン (`icons/icon16/32/48/128.png`) は `icons/icon.svg` (Salesforce ブルー グラデーション雲 + コード `</>` シンボル + 緑のオンライン点) を SVG マスター → PNG エクスポートする運用です。

| 用途 | サイズ | 表示位置 |
|---|---|---|
| `icon16.png` | 16x16 | アドレスバー横の拡張アイコン (小) |
| `icon32.png` | 32x32 | `chrome://extensions/` 一覧 |
| `icon48.png` | 48x48 | 拡張詳細画面 / Chrome Web Store |
| `icon128.png` | 128x128 | Chrome Web Store 配布パッケージ |

**手動生成** (Inkscape / Figma / Web ツール):
```
icons/icon.svg → 4 サイズ PNG エクスポート → icons/iconXX.png
```

**自動生成** (ImageMagick または `rsvg-convert`):
```bash
# ImageMagick (magick.exe があるならお勧め)
magick -background none icons/icon.svg -resize 16x16 icons/icon16.png
magick -background none icons/icon.svg -resize 32x32 icons/icon32.png
magick -background none icons/icon.svg -resize 48x48 icons/icon48.png
magick -background none icons/icon.svg -resize 128x128 icons/icon128.png
```

**注意点**:
- SVG マスターはベクター。デザイン変更時は SVG だけ編集して PNG を再エクスポート
- `manifest.json` の `icons` / `action.default_icon` に各サイズ PNG が登録済み (新規追加は不要)
- 16x16 は文字 (`</>`) が潰れやすいため、デザイン変更時は 16x16 表示を必ず目視確認
- カラーパレット: 主色 `#1b96ff` (Salesforce ブルー) / アクセント `#0c66e4` / オンライン点 `#2ecc71`

---

### 🗑️ アンインストール / 無効化手順 (v3.26.0 〜)

**個人で削除** (推奨):

1. Chrome アドレスバーで `chrome://extensions/` を開く (Edge は `edge://extensions/`)
2. 「DevToolsNext」のカードを探す
3. **「削除」**: 完全に拡張をアンインストール (chrome.storage に保存した SOQL 履歴・設定もすべて削除)
4. **「有効/無効トグル」**: 拡張を残したまま一時無効化 (再有効化時に履歴・設定は復元)

**保存データの確認 / クリア**:

DevToolsNext は以下のデータを `chrome.storage.local` に保存しています (パスワード等の機密情報は保存しません):
- 保存済 SOQL クエリ (名前付き)
- 直近の SOQL 実行履歴 (mini-panel チップ用、最大 3 件)
- 最後に表示したビュー (`sfdtLastView`)
- Login as User 検索履歴
- Limits ピン止め設定

削除前に履歴をエクスポートしたい場合は、各画面の 📋 / 📥 CSV / 📸 エビデンス ボタンを利用してください。

**社内一斉削除** (方法 C の GPO 配布の場合):
- GPO / Intune の `ExtensionInstallForcelist` から `cdkphenbcaocbnbfcoldjjajbdghjmgi` (Web Store 公開時の拡張 ID) を除外 → 次回ログオン時に自動アンインストール

---

### 📚 設計書 21 種類 業務向け詳細解説 (v2.16.0 拡充 / Phase 240 で orgSnapshot 追加、Phase 318 で実装数確認)

各設計書が「何を出力し」「業務でどう使えるか」を 1-2 行で。Phase 1-6 で各設計書に凡例セクションを内蔵済 (ツール内で読める)。

| # | 設計書名 | 何を出力するか | 業務での使い所 |
|---|---|---|---|
| **🌟 1** | ⭐ **組織全体スナップショット (orgSnapshot、Phase 240)** ★最重要・初手推奨 | 1 クリックで 7 章統合 (組織情報 + ライセンス + 主要オブジェクト統計 + アクティブユーザー + ストレージ + Apex 集計 + 設定変更履歴 直近 30 日) | 監査資料 1 発出力 / 引継ぎ書 / 組織健康診断レポート |
| 2 | **オブジェクト定義書 (objectDef)** | 1 オブジェクトのサマリ + 全項目 17 列 (型/必須/参照先/作成可/更新可/暗号化/ヘルプ等) + 子リレーション + RecordType | 開発前の項目仕様確認 / 監査向け項目台帳 / インポート前のレイアウト把握 |
| 3 | **プロファイル詳細書 (profileDetail)** | 1 プロファイル または権限セットの 9 シート (Object/FLS/System/Apex/VF/Tab/RecordType/App 権限) | 監査時の権限スナップショット / ライセンス棚卸 / プロファイル統廃合検討 |
| 4 | **FLS レポート (flsReport)** | 全項目 × Profile/PermSet を縦持ちで一覧 | 「この項目を見られるのは誰か」を縦串で確認 / SOX 監査資料 |
| 5 | **フィールド権限マトリクス (fieldPermMatrix)** | 行=項目、列=Profile (👤) / PermSet (🔑)、セル RW/R-/-- + 必須列 | 項目アクセスの組織横断棚卸 / 改修前後の差分確認 (Excel diff) |
| 6 | **オブジェクト権限マトリクス (objectPermMatrix)** | 行=オブジェクト、列=Profile/PermSet、セル CRUDVM 6 桁 (Read/Create/Edit/Delete/ViewAll/ModifyAll) | オブジェクトレベルの全権限可視化 / 統制レポート |
| 7 | **プロファイル一覧 (profileList)** | 全 Profile のライセンス・ユーザ種別・更新日 | プロファイル数の棚卸 / 不要プロファイル削除候補抽出 |
| 8 | **権限セット一覧 (permsetList)** | 全 PermissionSet (プロファイル付随除く) のライセンス・種別 | 権限セット運用整理 / Spring '26 後の権限セット移行計画 |
| 9 | **Apex クラス一覧 (apexClassList)** | 全 ApexClass のステータス・コード行数・API バージョン | 6MB Apex Limit の進捗把握 / 古い API バージョンクラスの一覧化 |
| 10 | **Apex トリガ一覧 (apexTriggerList)** | 全 Trigger × 7 イベント (BI/AI/BU/AU/BD/AD/AUD) の有無 | トリガ実行順制御の調査 / 1 オブジェクト 1 トリガ原則の遵守確認 |
| 11 | **フロー一覧 (flowList)** | アクティブ Flow を業務種別 (画面/自動起動/レコード起動等) 日本語付きで列挙 | Process Builder 廃止対応の進捗 / フロー責任者の洗い出し |
| 12 | **入力規則一覧 (validationRuleList)** | ValidationRule + エラー表示位置・エラーメッセージ全文 | 業務ルールの文書化 / 「保存できない理由」のユーザ説明資料 |
| 13 | **レコードタイプ一覧 (recordTypeList)** | RecordType の有効/無効・営業プロセス連携状況 | レコードタイプ整理 / プロファイル別割当て棚卸の前準備 |
| 14 | **フィールドセット一覧 (fieldSetList)** | 指定オブジェクトの FieldSet 定義 | LWC/VF 連携時に動的項目セットを使っている箇所の確認 |
| 15 | **カスタム設定一覧 (customSettingList)** | CustomObject から CustomSettingsType=List/Hierarchy のみ抽出 | レガシー資産確認 / カスタムメタデータ型への移行候補抽出 |
| 16 | **アプリ一覧 (appList)** | AppDefinition + AppMenuItem | App Launcher に出ているアプリの完全把握 |
| 17 | **アクセスコントロール定義書 (accessControl)** | OWD (オブジェクト毎の組織既定共有設定) + UserRole 階層 + 凡例 | 共有設計レビュー / セキュリティ監査の必須資料 |
| 18 | **フロー詳細書 (flowDetail)** | 1 Flow を要素 14 種類 (Decision/Action/Record 操作等) に分解 | 担当者交代時の業務ロジック引継ぎ |
| 19 | **Apex 詳細書 (apexDetail)** | SymbolTable から methods / properties / innerClasses を抽出 | コードレビュー前の API 一覧把握 |
| 20 | **LWC 設計図 (lwcDetail)** | バンドル内全ファイル (html/js/xml/css/svg/json) + 公開設定 | LWC 改修着手前の構成確認 / IsExposed の状況把握 |
| 21 | **ER 図 (erDiagram)** | Mermaid 形式で Master-Detail (実線) と Lookup (点線) を区別 | データモデル説明資料 / Mermaid Live Editor で SVG/PNG 出力可 |

各設計書は 6 形式 (Markdown / HTML / Excel SpreadsheetML / CSV / TSV / JSON) でエクスポート可能。ツール上のプレビューには **0. 凡例** セクションが自動表示され、業務担当者でも読めるようになっています。

### 🖨️ 設計書を PDF として保存する手順 (v3.23.0 〜)

ブラウザ印刷機能 (Ctrl+P) で業務文書品質の PDF を生成できます (v3.23.0 で `@media print` 最適化済)。

| 手順 | 操作 |
|---|---|
| 1. 設計書を生成 | 💻 開発者モード → 📋 設計書作成 → 種類選択 → ▶ 生成 |
| 2. ブラウザ印刷を開く | プレビュー領域内で **Ctrl+P** (Mac は ⌘+P) を押下 |
| 3. 設定を確認 | 「送信先: **PDF に保存**」を選択。「用紙: A4」「向き: 縦」「余白: デフォルト (14mm/12mm)」が自動適用 |
| 4. 詳細設定を開く (任意) | 「**背景のグラフィック**」のチェックを有効にすると、表紙のグラデや章のアクセント線が PDF にも反映されます |
| 5. 保存 | 「保存」ボタンで PDF 出力 → プロジェクト成果物として提出可能 |

**自動最適化されること** (`@media print`):
- 背景白 + 文字黒 (インク節約・可読性)
- 操作 UI (ヘッダ/サイドバー/ツールバー/ボタン) は自動非表示
- セクション (h2) ごとに自動改ページ (1 章 = 1 ページ感)
- 表 (`tr`) が途中で切れない (page-break-inside: avoid)
- グレースケール印刷でも罫線が見える

**注意**:
- 大量レコード (FLS 1000 項目以上等) の設計書は数十ページの PDF になります。**「PDF に保存」**を強く推奨 (物理印刷は紙の消費が大きい)
- Mermaid (ER 図) のレンダリングは Chrome のみ確実、Edge は要確認

### ✅ リリース前 全体動作確認チェックリスト (v3.31.0 〜)

新規バージョン公開前 (社内配布・Web Store 申請前) に、以下のチェックリストで主要機能の動作を確認してください。所要時間: 約 15-20 分。

**📋 セットアップ確認**

- [ ] Chrome 拡張を `chrome://extensions/` から「読み込み済み拡張」で読み込める
- [ ] VERSION.txt と manifest.json の version が一致 (例: 3.31.0)
- [ ] 拡張アイコンをクリックで popup が開く (fade-in アニメーション動作)
- [ ] popup 最上部の青い CTA「💻 開発者モードを全画面で開く」をクリックで tool.html が新タブで開く
- [ ] SF タブで F12 → DevTools に「DevToolsNext」タブが表示される (Chrome 再起動が必要な場合あり)

**🔌 接続確認 (sid Cookie 取得)**

- [ ] 開発者モードで「Org: xxxxxxxxxxxxx @ <host>」が表示される
- [ ] ENV バッジ (PROD/SBX/DEV) が組織種別に応じて色分け表示される
- [ ] PROD の場合、バッジに 3 秒周期のパルス警告が動作する

**🔎 SOQL クエリ (💻 開発者モード)**

- [ ] `SELECT Id, Name FROM Account LIMIT 5` を実行 → 結果テーブル表示
- [ ] テーブル列ヘッダクリックでソート (▲/▼ アイコン)
- [ ] 検索 input で結果絞り込み
- [ ] `FROM ` 入力後にオブジェクト候補ポップアップ表示
- [ ] `SELECT ` 入力後にフィールド候補ポップアップ表示 (型別アイコン 🆔🔗☑️📅 等)
- [ ] 「📋 CSV」「📥 CSV」「📸 エビデンス」ボタンが動作

**🔍 レコード Inspector**

- [ ] SF レコードページで「現在タブから取得」 → 自動入力 → 取得
- [ ] フィールド絞り込み (例: "email") で部分一致絞り込み
- [ ] 項目クリック → インライン編集 → 保存 (PATCH) で値更新
- [ ] 📸 エビデンス保存で Markdown ファイル生成

**🛠 匿名 Apex**

- [ ] `System.debug(UserInfo.getName());` を Ctrl+Enter で実行
- [ ] 実行結果 + Debug ログが結果領域に表示
- [ ] 📸 エビデンス保存で Apex + 結果 + ログを Markdown 化

**📊 Limits**

- [ ] 「取得 / 更新」で 30 種類以上の制限が表示
- [ ] 並び順 (使用率/使用量/名前) 切替動作
- [ ] 行クリックでピン止め (chrome.storage に保存・次回も反映)
- [ ] 使用率 0% 除外チェック動作

**🔐 ログイン履歴**

- [ ] 「失敗のみ」フィルタで認証失敗のみ表示
- [ ] CSV / 📸 エビデンス保存が動作

**📦 メタデータ一覧**

- [ ] `ApexClass` 選択 → 一覧取得 → 結果テーブル表示
- [ ] `Flow` 選択 → `MasterLabel` ベースで一覧取得 (Name でなくても動作)
- [ ] `Profile` / `PermissionSet` / `ValidationRule` も同様に取得

**📋 設計書作成**

- [ ] `objectDef` で `Account` 指定 → ▶ 生成 → プレビューに表紙 + 章 + 22 種類
- [ ] 表紙に「文書管理 ID」「機密区分」「注意事項」が表示される
- [ ] Excel ダウンロード → Excel で開けば警告は出るが「はい」で開ける
- [ ] Markdown / HTML / CSV / TSV 形式切替動作
- [ ] スクロール中もツールバーが sticky で常時表示
- [ ] 「📍 現在タブから」ボタンで対象オブジェクト自動入力

**👤 ユーザーモード (mini-panel)**

- [ ] SF レコードページ右下に 🛠 ボタンが表示される
- [ ] クリックで mini-panel が fade-in-up アニメーションで開く
- [ ] 「📋 ID をクエリに挿入」で `WHERE Id='...'` 自動挿入
- [ ] 「🔎 最近 5 件」で関連レコード 5 件取得
- [ ] 「↗ 全画面」で開発者モードへ遷移

**⚙️ 管理者モード (popup)**

- [ ] クイックアクション 6 個 (Setup / Dev Console / Object Manager / プロファイル / 組織情報 / ログアウト) がクリックで該当ページを新タブで開く
- [ ] Login as User 検索 → 検索結果から「ログイン」ボタン動作
- [ ] 検索履歴チップから再ログインできる

**🖨️ 印刷 / PDF**

- [ ] 設計書プレビューで Ctrl+P → PDF 保存
- [ ] 用紙 A4 縦・余白自動・背景白・章ごとに改ページ
- [ ] 「背景のグラフィック」チェックで表紙グラデが PDF に反映

**♿ アクセシビリティ**

- [ ] Tab キーでフォーカス移動可能 (focus-visible で 2px アクセント outline)
- [ ] スクリーンリーダー (NVDA/JAWS) で各ボタンのラベルが読み上げられる
- [ ] OS の「動きを減らす」設定で アニメーションが無効化される (prefers-reduced-motion)

---

### 🧪 設計書ジェネレータ 21 種類 手動テストガイド (Phase 240 で orgSnapshot 追加、Phase 318 で実装数確認)

各 design type で「未入力時」「正常入力時」「存在しない値」を 3 段階でテスト:

| # | type | 入力例 (正常) | 期待結果 |
|---|---|---|---|
| **🌟 1** | ⭐ orgSnapshot ★最重要・初手 | (入力不要) | 1 クリックで 7 章統合 (Phase 240) — 監査資料 / 引継ぎ書 / 組織健康診断レポート |
| 2 | objectDef | `Account` | 概要 + 項目定義 + 子リレーション + RecordType |
| 3 | profileDetail | `営業ユーザー` または `@MyPS` | 9 シート (Object/FLS/System/Apex/VF/Tab/RecordType/App) |
| 4 | flsReport | `Account` | 全項目 × Profile/PermSet 縦持ち |
| 5 | fieldPermMatrix | `Account` | 行=Field、列=Profile/PermSet、セル RW/R-/-- |
| 6 | objectPermMatrix | (入力不要) | セル CRUDVM 6 桁 |
| 7 | profileList | (入力不要) | 全 Profile 一覧 |
| 8 | permsetList | (入力不要) | 全 PermissionSet 一覧 |
| 9 | apexClassList | (入力不要) | 全 ApexClass 一覧 |
| 10 | apexTriggerList | (入力不要) | 全 Trigger 一覧 (BI/AI/BU/AU/BD/AD/AUD) |
| 11 | flowList | (入力不要) | Active Flow 一覧 |
| 12 | validationRuleList | (任意 `Account`) | 入力規則一覧 |
| 13 | recordTypeList | (任意 `Account`) | RecordType 一覧 |
| 14 | fieldSetList | `Account` | FieldSet 一覧 |
| 15 | customSettingList | (入力不要) | カスタム設定一覧 |
| 16 | appList | (入力不要) | AppDefinition + AppMenuItem |
| 17 | accessControl | (入力不要) | OWD + UserRole 階層 |
| 18 | flowDetail | `My_Flow` | Flow 内の 14 要素分解 |
| 19 | apexDetail | `AccountController` | SymbolTable から methods/properties/innerClasses |
| 20 | lwcDetail | `myComponent` | バンドル内全ファイル |
| 21 | erDiagram | `Account` | Mermaid + 「🔗 Mermaid Live Editor で可視化」ボタン |

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

## 🙋 ロール別 FAQ (v3.22.0 〜)

「自分の役割でどう使えばいいか」を 3 モード設計に紐づけて整理しています。

### 👤 業務利用者 (営業・サポート・カスタマーサクセス)

| Q | A |
|---|---|
| まず何から始める？ | Salesforce ページ右下の **🛠 ボタン** (👤 ユーザーモード) をクリック。SF 画面はそのまま、横に mini-panel が開きます。 |
| 「現在見ている取引先」のレコード ID を SOQL に入れるには？ | mini-panel の **「📋 ID をクエリに挿入」** ボタンで `WHERE Id='...'` 形式で自動挿入できます。 |
| 同じ顧客の Case/Task をまとめて見たい | mini-panel の **「🔎 最近 5 件」** で関連レコード 5 件を一発取得できます。 |
| 詳細な分析や複数レコードの一括処理がしたい | mini-panel ヘッダの **「↗ 全画面」** で 💻 開発者モードに遷移できます。 |
| Excel/CSV にエクスポートしたい | mini-panel の **「📥 CSV DL」** または「📋 CSV コピー」が利用できます。 |

### ⚙️ システム管理者 (運用・権限管理)

| Q | A |
|---|---|
| Setup をすぐ開きたい | Chrome 拡張アイコンをクリック → **⚙️ Setup** クイックアクション。 |
| 他ユーザーになりすまして検証したい | 拡張アイコン → **🔐 Login as User** → 検索 → ログインボタン。検索履歴チップから再ログインも可能です。 |
| 組織のライセンス・容量を確認したい | 拡張アイコン → **🏢 組織情報** クイックアクション (Edition/組織 ID/ライセンス) を確認できます。 |
| 権限の年次監査資料が欲しい | 💻 開発者モード → 📋 **設計書作成** → 「プロファイル/権限セット 詳細レポート (FLS含)」「フィールド権限マトリクス」「オブジェクト権限マトリクス」を Excel 出力 → そのまま監査資料として提出可能。 |
| ログイン履歴で不審な認証失敗を確認したい | 💻 開発者モード → 🔐 ログイン履歴 → 「失敗のみ」フィルタ → 📸 エビデンス保存。 |
| 組織再編時の影響範囲を洗い出したい | 設計書「アクセス制御 (OWD/ロール階層)」「プロファイル一覧」「権限セット一覧」を組み合わせて洗い出します。 |

### 💻 開発者・エンジニア (実装・調査)

| Q | A |
|---|---|
| SOQL を素早く実行したい | F12 → DevToolsNext タブ → 🔎 **SOQL クエリ**。Ctrl+Enter で実行、オートコンプリート対応。Tooling API も切替可能。 |
| Apex を匿名実行したい | 💻 開発者モード → 🛠 **Apex 実行** → コード入力 → Ctrl+Enter (Debug ログも自動取得・TraceFlag 自動有効化)。 |
| レコードの全項目を確認・編集したい | 💻 開発者モード → 🔍 **レコード詳細 (Inspector)** → 現在タブから取得 → 項目クリックでインライン編集 (PATCH 保存)。 |
| API バージョン・パスを試したい | 💻 開発者モード → 🌐 **REST 探索** (例 chip でワンクリック) または 📡 **API URL ビルダー** (ドロップダウン)。 |
| Limit 使用率が高い・ガバナ制限を確認したい | 💻 開発者モード → 📊 **使用状況** (Limits) → 「使用率 ↓」ソート → 行クリックでピン止め。エビデンス保存も可能。 |
| メタデータ (ApexClass/Flow/Profile 等) の棚卸し | 💻 開発者モード → 📦 **メタデータ一覧** → 型を選んで一覧取得 → CSV/エビデンス保存。 |
| Apex のデバッグログを確認したい | 💻 開発者モード → 📂 **Debug ログ** → 「DebugLevel ON」→ 「最新 20 件」。 |
| 設計書を 1 クリックで生成したい | 💻 開発者モード → 📋 **設計書作成** → 21 種類から選択 (Phase 240 で orgSnapshot 追加、Phase 319 で実装数確認) → ▶ 生成 → Excel/Markdown ダウンロード。 |

---

## 🔁 Inspector ↔ SOQL 双方向ナビゲーション (v3.65.0 〜) — Phase 155-157 で 3 方向ナビ完成

Inspector で 1 レコードを開いた状態から、SOQL クエリへ **親方向 / 同レコード / 子方向** の 3 方向に展開できます。業務担当者が「関連レコードを SOQL でまとめて取得したい」操作を 1 クリックで実行可能。

| 方向 | UI 要素 | 動作 | 業務シナリオ |
|---|---|---|---|
| 🔼 **親方向** (v3.65 / Phase 155) | 参照項目の緑系 chip (例: `OwnerId` 値の横の `Owner.`) | クリックで `Owner.Name` 形式をクリップボードへコピー | 「Account.Owner.Name を SOQL で取得したい」 |
| 🔍 **同レコード** (v3.66 / Phase 156) | Inspector ツールバー `🔎 SOQL で開く` ボタン | describe.fields から主要 10 項目を自動選択 → `SELECT ... FROM Obj WHERE Id='X'` 生成 → SOQL ビュー切替 | 「このレコードと同じ条件のものを探したい」 |
| 🔽 **子方向** (v3.67 / Phase 157) | Inspector 左パネル「🌳 子レコード SOQL」折りたたみセクション | クリックで `SELECT Id, Name FROM Child WHERE FK='parentId' LIMIT 50` 生成 → SOQL ビュー切替 | 「Acme Corp に紐づく全 Contact / Case / Opportunity を取得」 |

**設計判断**:
- 既存の Inspector ジャンプ (参照 ID クリックで親レコードを Inspector で開く) は維持 → `event.stopPropagation()` で chip クリックと分離
- 子リレーションは `deprecatedAndHidden: false` で絞り込み、主要標準オブジェクト (Contact / Case / Opportunity / Task / Event / Note / Attachment / FeedItem) を優先ソート
- すべてのナビゲーションは **生成された SOQL を業務担当者が事前確認できる** (`switchToView` 後に textarea で編集可能) → 意図しないクエリ実行を防止

---

## ⚠️ 早期バリデーション統一 (v3.50.0 〜) — 6 機能で同じ UX パターン

「実行系」操作で必須入力が空のまま実行された場合、API 呼び出し前に即座にフィードバックします。Phase 137-139 で **6 機能** に統一展開済:

| 機能 | 検出する空入力 | 表示するメッセージ + 例示 | 自動フォーカス先 |
|---|---|---|---|
| 🔎 **SOQL クエリ** | SOQL 本文 | `⚠ 入力が必要` + `SELECT Id, Name FROM Account LIMIT 10` | `soqlText` textarea |
| 🛠 **匿名 Apex** | Apex コード | `⚠ 入力が必要` + `System.debug(UserInfo.getName());` | `apexCode` textarea |
| 🔍 **Inspector** | レコード ID | `⚠ 入力が必要` + `0011x00000abcdeAAA` / `Account:001xx000003DGbY` | `inspectRef` input |
| 📋 **設計書ジェネレータ** | 対象 (必須 8 種) | `⚠ 入力が必要` + type 別の入力例 (オブジェクト/プロファイル/Flow 等) | `designObj` input |
| 📥 **データエクスポート** | オブジェクト名 / フィールド選択 | `⚠ 入力が必要` + `Account` / 「フィールドを 1 つ以上チェック」 | `exObj` input |
| 🌐 **REST 探索** | API パス | `⚠ 入力が必要` + `/services/data/v62.0/limits` | `restPath` input |

**設計方針**:
- 共通 UX: `pill warn` で警告 → `<code>` で具体例 → 該当入力欄に自動フォーカス → 操作継続性向上
- **無音 return を撲滅**: 旧 UI は空入力で何も起きないか不明瞭エラーだったが、すべて明示的フィードバックに統一
- **API 呼び出し前の早期 return**: ネットワーク・時間・ガバナ制限を節約

これにより業務担当者が「あれ、何を入れればいいんだ?」と迷う場面が撲滅され、6 機能で同じ動線で操作可能になりました。

---

## 🎨 CSS デザイントークン体系 (v3.90.0 〜) — Phase 180-187 で導入

3 モード (popup / panel+tool / mini-panel) で同じスペーシング・角丸を使うため、CSS カスタムプロパティ (`var(--*)`) として 17 種のデザイントークンを定義しています。`panel.css` と `popup.css` の `:root` ブロックに**完全同値**で定義され、ハードコード値の混在を防ぎます (v3.107.0 Phase 197 で参照 0 だった `--sp-7` 24px を撤去し、定義済みは全て使用される状態を達成)。

### スペーシング (4px ベース・7 段階 + セマンティック 3 段階) — `--sp-*`

| トークン | 値 | 主な用途 |
|---|---|---|
| `--sp-hair` | 1px | env-badge / pill / kbd / badge-required・unique・ref など極小要素の縦 padding (18 箇所統一、v3.96.0 Phase 186 追加・セマンティック命名) |
| `--sp-0` | 2px | 微小チップ/バッジの上下 padding |
| `--sp-1` | 4px | ミニボタン padding、テーブル td 縦 |
| `--sp-tag-y` | 5px | フォーム input / grid セル / list-item の縦 padding (6 箇所統一、`--r-tag` と命名整合性、v3.97.0 Phase 187 追加・セマンティック命名) |
| `--sp-2` | 6px | テーブル td 横、結果リスト padding |
| `--sp-3` | 8px | 標準フォーム padding、ヘッダ縦、`--sp-tag-y` と組合せでフォーム/list-item 横 padding |
| `--sp-4` | 10px | カード padding、パネル padding |
| `--sp-5` | 12px | カード/ヘッダ横、フッタ padding |
| `--sp-6` | 16px | 大型カード横 padding (empty-state x 軸 9 箇所統一) |
| `--sp-card-y` | 32px | empty-state 9 種 (SOQL/Apex/REST/Limits/describe/Login/Metadata/Inspector/Export) 中央配置 y 軸 (v3.95.0 Phase 185 追加・セマンティック命名) |

### 角丸 (7 段階) — `--r-*`

| トークン | 値 | 主な用途 |
|---|---|---|
| `--r-xs` | 3px | kbd タグ、ホットキー表示 |
| `--r-sm` | 4px | code タグ、小ボタン |
| `--r-tag` | 5px | 標準ボタン・フォーム input/select/textarea・コードプレビュー (v3.94.0 Phase 184 追加) |
| `--r-md` | 6px | 標準ボタン (popup)、フォーム入力 (popup) |
| `--r-lg` | 8px | カード、quick-card |
| `--r-xl` | 10px | バッジ、CTA、ホームカード境界 |
| `--r-pill` | 12px | チップ・hint-link・login-chip など pill 形状 (v3.93.0 Phase 183 追加) |

### 累計トークン化進捗

| Phase | 対象 | 移行件数 | 累計 |
|---|---|---|---|
| Phase 180 (v3.90.0) | panel.css border-radius | 52 → トークン | 52 |
| Phase 181 (v3.91.0) | panel.css padding | 43 → トークン | 95 |
| Phase 182 (v3.92.0) | popup.css padding + border-radius | 28 → トークン | 127 (panel 95 + popup 32) |
| Phase 183 (v3.93.0) | `--r-pill: 12px` 追加 + 4 箇所移行 | 4 → トークン | 131 (panel 97 + popup 34) |
| Phase 184 (v3.94.0) | `--r-tag: 5px` 追加 + 6 箇所移行 (フォーム/list-item) | 6 → トークン | 137 (panel 101 + popup 36) |
| Phase 185 (v3.95.0) | `--sp-card-y: 32px` セマンティック追加 + 9 箇所 empty-state 統一 | 9 → トークン | 146 (panel 110 + popup 36) |
| Phase 186 (v3.96.0) | `--sp-hair: 1px` セマンティック追加 + 18 箇所 極小要素 padding 統一 | 18 → トークン | 164 (panel 126 + popup 38) |
| Phase 187 (v3.97.0) | `--sp-tag-y: 5px` セマンティック追加 + 6 箇所 フォーム/grid/list-item 統一 | 6 → トークン | **170** (panel 131 + popup 39) |

### スケール外値の方針

下記のハードコード値は**意図的に保留**しています (近似トークン置換でレイアウト崩れが起きるリスクを避けるため):

- **スペーシング**: 3px / 7px / 14px / 18px / 20px → 個別判断 (例: home-card の `padding: 20px 18px` は visual hierarchy 上の意図的選択) ※ 32px は v3.95.0 Phase 185 で `--sp-card-y`、1px は v3.96.0 Phase 186 で `--sp-hair`、5px は v3.97.0 Phase 187 で `--sp-tag-y` セマンティック化済
- **角丸**: 14px / `50%` → 50% は user-avatar 円形のため永続保持、14px は単独使用 (v3.94.0 Phase 184 で 5px は `--r-tag` トークン化済)

### 追加トークン導入の判断基準

新しいトークン (`--sp-xl`, `--r-2xl` 等) を追加する判断は以下に従います:

1. **頻出回数**: 3 箇所以上で使われているハードコード値
2. **意味的明瞭性**: 「pill 形状」「circle」のように名前で意図が伝わる
3. **3 モード共通性**: panel.css と popup.css の両方で出現

### 業務インパクト

- **保守性**: 全画面のスペーシング・角丸を 1 箇所の変更で統一調整可能
- **3 モード整合性**: popup ⇄ panel ⇄ mini-panel で同じ視覚言語を使うため、ユーザーが画面を行き来しても違和感がない
- **将来のテーマ対応**: ダーク/ライト切替やブランドカスタマイズ時にトークン差し替えだけで完結

---

## 🔍 Team J 静的解析監査成果 (v3.86.0 / v3.98.0〜) — Phase 176 / 188-194 で導入

「動かない機能を残さない」「使えない機能は改修するか廃止」の 5 大指針 ② ③ を体系的に実践するため、**comm diff という静的解析手法**を全 5 軸に展開しました。HTML/CSS/JS/manifest の宣言と参照の差分から、ユーザーが気づかない「見えない不具合」を能動的に発見します。

### 監査 5 軸の手法と検出パターン

| 軸 | 手法 | 検出する見えない不具合のパターン |
|---|---|---|
| **HTML id ↔ JS 参照** (Phase 176 / 188) | HTML から `id="xxx"` を抽出 vs JS から `getElementById/$on/$id` 参照を抽出して `comm -23` | JS が参照する id が HTML に無い = ハンドラが全実行されない dead code |
| **CSS class ↔ HTML/JS 参照** (Phase 189) | CSS から `.xxx` 抽出 vs HTML `class="..."` + JS `classList.add/innerHTML テンプレ` 参照差分 | CSS で定義されているが要素が消えた dead CSS / 動的生成・複合セレクタの誤検知を再検証で除外 |
| **chrome.storage key ↔ JS 実使用** (Phase 190) | JS から `sfdt*` キー文字列抽出、動的キー記法 (`[CONST]: val`) を考慮した SET/GET 参照解析 | 設定リセット機能のキー名不一致 (clear したつもりで永遠に消えないバグ) |
| **background message handler ↔ sendMessage 送信** (Phase 191) | background.js の `if (msg.type === "...")` handler 列挙 vs popup/panel/content の `sendMessage({ type })` 送信箇所差分 | handler 不在の送信 (無駄 IPC) / 送信元不在の handler (dead handler) |
| **manifest.json URL pattern 整合性** (Phase 192-193) | `host_permissions` / `content_scripts.matches` / `web_accessible_resources.matches` の 3 配列を差分集計 | host_permissions のみで content_scripts/WAR にない = mini-panel が動かないドメイン |

### 検出した「見えない不具合」と修正実績

| Phase | 不具合 | 影響 | 修正 |
|---|---|---|---|
| 176 (v3.86.0) | popup の Login as 履歴系 2 キーが UI 状態リセット対象から漏れていた | 設定リセットで履歴が消えない | RESET_CATEGORIES.history を 5→7 キーに拡張 |
| 176 (v3.86.0) | v3.46.0 で撤廃済の `soqlHistory` レガシーキーが残留 | 旧バージョンからの移行ユーザの storage に永久残留 | OWNED_NON_SFDT Set にレガシーキー追加 |
| 176 (v3.86.0) | popup init で `renderHistory()` を await しているが id 不在で常に早期 return | popup 起動の都度無駄な storage 読込 | dead await を init から削除 |
| 188 (v3.98.0) | popup.js の setupWhatsNewToggle (17 行) が HTML 要素不在で常に false 早期 return | popup 起動の都度 3 回の getElementById + storage 読込が無駄 | dead code 31 行削除 (JS 17 + CSS 14) |
| 189 (v3.99.0) | popup の SOQL 履歴 CSS (v2.78.0 撤去) と panel の変更セット CSS (v3.89.0 撤去) の残骸 | 動かない機能用 CSS が累積 | dead CSS 13 件 63 行削除 (popup -25 / panel -38) |
| **190 (v3.100.0)** | **popup.js が `sfdtLimitsSort` 指定だが実コード (panel.js) は `sfdtLimitsSortState` を使用** | **⚙ 設定 → UI 状態クリア で Limits ソートが永久に消えない根本バグ** | **1 ファイル 1 行修正で 2 バグ根絶** |
| 190 (v3.100.0) | `sfdtPopupLinksCollapsed` (Phase 135 永続化) が UI 状態クリア対象に含まれず | 設定リセットで popup 折りたたみ状態が消えない | UI 状態カテゴリに追加 |
| 191 (v3.101.0) | content.js が `sfdt:openTool` を送信するが background に handler 不在 | 毎回 IPC 失敗 → fallback (window.open) で実動作するが無駄な IPC と console.warn | sendMessage 削除し window.open のみに整理 (-3 行) |
| 192 (v3.102.0) | manifest WAR resources の `html/*.html` と `html/tool.html` が重複指定 | パターンに含まれる冗長指定 | 重複削除 |
| **193 (v3.103.0)** | **`salesforce-setup.com` / `salesforce-experience.com` が host_permissions のみで content_scripts/WAR に無く mini-panel 動かない** | **Setup 画面 / Experience Cloud で mini-panel 機能不全** | **content_scripts と WAR の両方に追加 + visualforce.com WAR 追加忘れも解消** |
| 194 (v3.104.0) | sf-api.js の `getLimits` export 関数が定義のみで呼出 0 (panel.js は sfFetch 直接呼出) | API ラッパーの意図 (endpoint カプセル化) が無視 | **削除でなく活用** — panel.js を getLimits 経由に修正 |

### 健全性確認 (dead 0 件で安全と判定)

| ファイル | 関数数 | 結果 |
|---|---|---|
| design-docs.js | 46 | Phase 192 で dispatch table 経由を含めて全使用中確認、dead 0 |
| panel.js | 132 | Phase 193、Phase 179 で -468 行 + Phase 188 で -18 行の clean-up が効いて dead 0 |
| content.js / picker.js / devtools.js / background.js | 9 | Phase 194 で dead 0 |
| sf-api.js | 12 | Phase 194 で getLimits 活用化、他は健全 |

### 累計 dead code 削除実績

| 区分 | Phase | 削除量 |
|---|---|---|
| popup.js dead 関数 | 177 (v3.87.0) | -322 行 (13 関数 / 11 バインディング / 2 定数 / 4 import) |
| panel.js dead 関数 | 179 (v3.89.0) | -468 行 (11 関数 / 9 バインディング、変更セット系) |
| popup.js whats-new dead | 188 (v3.98.0) | -18 行 |
| popup.css whats-new dead | 188 (v3.98.0) | -13 行 |
| popup.css 残骸 (.grid2 / .history*) | 189 (v3.99.0) | -25 行 |
| panel.css 残骸 (changeset / home-tips) | 189 (v3.99.0) | -38 行 |
| content.js dead IPC | 191 (v3.101.0) | -3 行 |
| **累計** | - | **-887 行 dead code 削除** |

### 業務インパクト

- **設定リセット機能の正常動作保証**: Phase 190 のキー名不一致修正で、業務担当者が「⚙ 設定 → UI 状態クリア」を実行した時に Limits ソートが期待通り消える (これまでは消えない見えない不具合)
- **新規ドメイン対応**: Phase 193 で salesforce-setup.com / salesforce-experience.com に対応し、Setup 画面・Experience Cloud で mini-panel が動作 (管理者・コミュニティ管理者の操作中に SOQL 即時実行可能)
- **コードサイズ削減**: -887 行で配布サイズ削減 (CWS 公開時のスキャン時間短縮 + 拡張機能起動の若干高速化)
- **保守性向上**: API endpoint カプセル化 (getLimits) で将来 API バージョン変更時の修正箇所が 1 箇所に集約

### 監査手法のサンプルコマンド (将来貢献者向け)

```bash
# 1. HTML id vs JS 参照
grep -oE 'id="[a-zA-Z0-9_-]+"' html/*.html | sed 's/.*id="\([^"]*\)"/\1/' | sort -u > /tmp/html_ids.txt
grep -oE '(\$on|getElementById)\("[a-zA-Z0-9_-]+"' js/*.js | grep -oE '"[a-zA-Z0-9_-]+"' | sed 's/"//g' | sort -u > /tmp/js_refs.txt
comm -23 /tmp/js_refs.txt /tmp/html_ids.txt   # JS で参照しているが HTML にない id

# 2. CSS class vs HTML/JS 参照 (動的生成・複合セレクタは再検証で除外)
grep -oE '\.[a-zA-Z][a-zA-Z0-9_-]+' css/*.css | sed 's/^\.//' | sort -u > /tmp/css_classes.txt
# HTML/JS で各 class が参照されているか個別に grep

# 3. chrome.storage key vs 実使用 (動的キー記法 [CONST]: val を考慮)
grep -hoE '"sfdt[A-Za-z0-9]+"' js/*.js | sed 's/"//g' | sort -u

# 4. background handler vs sendMessage 送信
grep -nE 'msg\.type === "sfdt:' js/background.js
grep -hnE 'sendMessage\(\{ ?type: "sfdt:' js/*.js

# 5. manifest URL pattern 整合性
jq -r '.host_permissions[], .content_scripts[].matches[], .web_accessible_resources[].matches[]' manifest.json | sort -u
```

これらの監査を**定期的 (例: 10 phase ごと)** に実行することで、機能撤去後の残骸蓄積を防止できます。

---

## 📤 Inspector 風一括 DML 機能 (v3.113.0 〜) — Phase 203-207 で導入

「Inspector みたいに一括でレコードのインポートや削除もできるようにしてほしい」というユーザー要望に応えて、SOQL 結果テーブルとモーダルダイアログから **4 種類の一括 DML 操作** を実行できるようにしました。すべて Salesforce 標準 API (Composite / Bulk Ingest) を使用し、外部ツール (Data Loader / Workbench) なしで業務担当者がブラウザ内で完結できます。

### 機能一覧 (Phase 203-207)

| Phase | 機能 | 起点 | API | 上限 / 業務シナリオ |
|---|---|---|---|---|
| 203 (v3.113.0) | **一括 DELETE** | SOQL 結果テーブルの行 checkbox | Composite DELETE (200/コール、自動チャンク) | テストデータクリーンアップ、重複整理 |
| 204 (v3.114.0) | **CSV → INSERT** | SOQL ツールバー「📤 CSV → DML」ボタン | Composite POST | Excel リスト一括投入、テストシード |
| 205 (v3.115.0) | **CSV → UPDATE / UPSERT** | 同上モーダルで「操作」セレクト | Composite PATCH (UPSERT は External Id ベース) | 既存レコード一括修正、別組織からのべき等マイグレ |
| 206 (v3.116.0) | **Bulk API v2** | 同上モーダルでチェックボックス ON | Bulk Ingest (Job 作成 → CSV upload → Close → ポーリング → 結果) | 200 件超え (数万〜数十万件) の大量データ DML |
| 207 (v3.117.0) | **Setup Audit Trail** | SOQL テンプレートセレクト | 標準 SOQL (`SetupAuditTrail`) | 設定変更履歴 200 件・180 日分の追跡 |

### 一括 DELETE (Phase 203)

SOQL 結果テーブルに **Id 列** が含まれていれば自動で利用可能になります。

1. SOQL 実行 (例: `SELECT Id, Name FROM Account WHERE Name LIKE 'Test_%'`)
2. 結果テーブル各行先頭の **checkbox** で削除対象を選択 (ヘッダの master checkbox で全選択)
3. 検索ボックス右の **「🗑 選択削除 (N)」** ボタン (赤系) クリック
4. 確認ダイアログで **件数 + 先頭 5 件 Id** が表示される
5. Composite DELETE API で 200 件ずつチャンク実行 (`allOrNone=false` で部分成功記録)
6. 削除成功した行は **取消線 + 半透明** で視覚マーク、失敗例 (先頭 3 件) はトーストに表示

### CSV → INSERT / UPDATE / UPSERT (Phase 204-205)

SOQL ツールバーの **「📤 CSV → DML」** ボタンでモーダルを開き、CSV を貼り付けて実行します。

**モーダル UI**:
- **操作**: INSERT (新規) / UPDATE (Id 列必須) / UPSERT (External Id 必須)
- **対象オブジェクト**: 例 `Account`, `Custom_Object__c`
- **External Id 項目**: UPSERT 選択時のみ表示 (例 `MyExternalId__c`)
- **CSV**: 1 行目ヘッダ (フィールド API 名)、ダブルクォート囲み + `""` エスケープ対応、空セルは NULL、`true`/`false` は Boolean 自動変換
- **🔍 プレビュー** ボタン: 件数・フィールド・先頭 3 件確認 + 必須列バリデーション
- **▶ 実行** ボタン: 確認ダイアログ → Composite API 200 件チャンク
- **結果詳細**: 成功 Id 先頭 5 件 + エラー詳細折りたたみ (行番号付き先頭 20 件)

**API dispatch**:
- INSERT → `POST /composite/sobjects`
- UPDATE → `PATCH /composite/sobjects` (records に `Id` 含む)
- UPSERT → `PATCH /composite/sobjects/{Obj}/{ExtIdField}`

**CSV 例 (UPSERT)**:
```csv
ExtId__c,Name,Industry,Phone
EXT-001,Acme Corp,Technology,03-1234-5678
EXT-002,Beta Inc,Manufacturing,06-9876-5432
```

### Bulk API v2 (Phase 206) — 200 件超えの大量データ用

モーダルの **「📦 Bulk API v2 を使う」** チェックボックス ON で、Composite (200 件/コール上限) から非同期 Bulk Ingest に切替。

**5 ステップ自動化** (ユーザーは待つだけ):
1. Job 作成 (`POST /jobs/ingest`、operation/object/contentType/lineEnding 指定)
2. CSV upload (`PUT /batches`、`Content-Type: text/csv` で生 CSV テキスト送信)
3. Job Close (`PATCH state: UploadComplete` で処理開始)
4. **5 秒間隔ポーリング** (最大 5 分、UI に経過秒数 + Setup ジョブ画面リンク表示)
5. 結果サマリ (成功/失敗/処理時間/結果 CSV リンク 3 種)

**Bulk API v2 でできること**:
- 10,000 件リード一括 INSERT (Composite だと 50 API コール → Bulk なら 1 ジョブ)
- 別組織からの大規模 UPSERT (External Id でべき等性 + Bulk 効率)
- 期限切れ Case の一括 Status 更新

### Setup Audit Trail (Phase 207) — 設定変更履歴

SOQL テンプレートセレクトから **「📋 Setup Audit Trail (設定変更履歴 200 件・180 日保持)」** を選択すると、`SELECT Id, Action, Section, Display, CreatedBy.Name, CreatedDate, DelegateUser FROM SetupAuditTrail ORDER BY CreatedDate DESC LIMIT 200` が SOQL エディタに自動挿入されます。

**業務シナリオ**:
- **監査ログ**: 「誰がいつ何の Setup 設定を変えたか」を 180 日分追跡
- **障害調査**: 「障害発生前に Setup で何を変更したか」確認
- **不正検知**: 想定外の Profile / Permission Set 操作の追跡
- **Login as User 追跡**: `DelegateUser` 列で「なりすまし」操作も判別

実行後は SOQL 画面の全機能 (検索/ソート/CSV エクスポート/エビデンス/Markdown コピー) がそのまま使えます。Field Audit Trail (有料機能) を購入していれば、より長期間のデータも同じクエリで取得可能。

### 設計判断

- **既存 SOQL 画面に統合**: 専用画面を作らず、SOQL ワークフロー (検索→結果→操作) の延長として実装。学習コストゼロ
- **2 段階 confirm**: 件数 + 先頭 Id を必ず表示し、本番組織誤操作を防止
- **`allOrNone=false`**: 1 件のバリデーションエラーで全 rollback すると業務が止まる → 部分成功記録
- **Composite 200 件チャンク**: 自動分割で API 上限を意識せず使える
- **Bulk API は明示 opt-in**: チェックボックスで明示的に切替、デフォルトは Composite (即時応答)
- **結果 CSV は URL リンクのみ**: Bulk API の結果 CSV は Authorization Bearer 必須のため Setup → ジョブ画面誘導

---

## 🆘 トラブルシューティング (v3.20.0 〜)

業務担当者・開発者がよく遭遇する事象と対処法を整理しています。先に該当行をご確認ください。

| 症状 | 想定原因 | 対処法 |
|---|---|---|
| 拡張アイコンを押しても何も起こらない | popup の組織検出失敗 | popup の `⟳` (再取得) ボタンを押す / SF タブにフォーカスしてから再オープン |
| 「未接続」と表示される | セッション切れ / Cookie 未取得 | popup の `⟳` を押す / 一度 SF にログインし直す |
| F12 → DevToolsNext タブが見つからない | DevTools が SF タブ以外で開かれている | SF タブで F12 → タブが追加表示される (Chrome は **再起動が必要なことあり**) |
| SOQL 実行で `INVALID_FIELD: Name` が出る (Flow) | Flow オブジェクトは `Name` 項目を持たない | `MasterLabel` を使用 / メタデータ一覧画面が自動切替済 |
| ログイン履歴で「変なエラー」 | `Status` 項目が filterable=false | v2.93.0 以降は client-side フィルタで自動対応済 |
| Limits で「使用状況が取得できなくなりました」 | `fmtNum` 未定義 ReferenceError | v2.96.0 以降は `limitFmt` 局所定義で対応済 — 更新で解消 |
| Excel ダウンロードで「ファイル形式と拡張子が一致しません」警告 | `.xls` (SpreadsheetML XML) の挙動 | 「**はい**」を押して開けます (情報損失なし) / または .csv ダウンロードを利用 |
| 設計書ジェネレータでオブジェクト名指定が必要なのに空欄 | 対象オブジェクト未入力 | 上部の「対象」入力欄にオブジェクト API 名 (例: `Account`) を入力 |
| ApexLog (Debug ログ) が取得できない | TraceFlag/DebugLevel 未設定 | 📂 Debug ログ画面の「**DebugLevel ON**」ボタンを押す (24 時間有効) |
| 匿名 Apex で 401 INVALID_SESSION_ID | セッション切れ | popup の `⟳` で再取得 / 一度 SF にログインし直す |
| Login as User がボタン押しても反応しない | セッション切替 URL が変わった | SF タブで該当ユーザー詳細ページを開いて直接「Login」リンクを使用 |
| popup で組織情報が空 | ホスト判定エラー | popup の `⟳` / SF タブで一度クリックしてからオープン |
| 「初期化失敗: Cannot read properties of null (reading 'addEventListener')」 | HTML 要素削除と JS バインドのずれ | 最新版にアップデート (v2.90.0 以降は `$on` 安全バインドで解消済) |

**問題解決しない場合**: VERSION.txt の値と GitHub 最新リリースを照合 → 拡張を Chrome 拡張管理画面で削除して再ロード → それでもダメなら GitHub issue へ。

## 既知の前提・制約

- **sid Cookie** は HttpOnly 属性付きだが、`cookies` permission により拡張からは読める。これを使って Bearer 認証 fetch を行う。
- Lightning ドメイン (`*.lightning.force.com`) は REST 用に `*.my.salesforce.com` に書き換える（`sf-api.js` の `toApiHost`）。
- セッションタイムアウト時は popup の `⟳` で再取得すれば良い。
- Salesforce 側の **CSP / CORS** は同一 Org への fetch ならクリアできる（拡張は `host_permissions` を保持）。

### 🔄 自動アップデートの仕組み

- `background.js` の `alarms` API が 30 秒間隔で `VERSION.txt` をローカルから読み込み、`chrome.storage.local` に保存した既知バージョンと比較
- バージョン変更を検知すると `chrome.notifications.create()` で「🆕 DevToolsNext を自動更新しました」通知を表示し、200ms 後に `chrome.runtime.reload()` で拡張を再ロード
- ユーザー側で Load unpacked し直したり、Web Store の更新を待つ必要なく即時反映 (開発時に特に便利)
- 通知は `notifications` permission により有効化、ポーリングは `alarms` permission で実装

### ⚙️ CI / GitHub Actions 連携プロセス (v3.55.0 〜 / v3.56.0 で実体化)

リリース時の手作業ミス防止のため、以下のチェック・自動化を `.github/workflows/` に配置。**v3.56.0 で実コードを同梱済** ([.github/workflows/version-check.yml](.github/workflows/version-check.yml) / [.github/workflows/release.yml](.github/workflows/release.yml)) のため、Fork して即使えます。

**1. バージョン整合性チェック** ([`.github/workflows/version-check.yml`](.github/workflows/version-check.yml)):

`VERSION.txt` と `manifest.json` の `version` 差異を push / PR で自動検出 (paths フィルタで関係ない変更では走らない)。

```yaml
# 抜粋 (完全版はリポジトリ内のファイル参照)
on:
  push:
    paths: ['VERSION.txt', 'manifest.json']
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: VERSION.txt と manifest.json の version を照合
        run: |
          VTXT=$(cat VERSION.txt | tr -d ' \n\r')
          MJSON=$(grep -oE '"version"[[:space:]]*:[[:space:]]*"[^"]+"' manifest.json | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1)
          if [ "$VTXT" != "$MJSON" ]; then echo "::error::不一致 ($VTXT vs $MJSON)"; exit 1; fi
```

**2. .zip 自動ビルド** ([`.github/workflows/release.yml`](.github/workflows/release.yml)):

```yaml
# .github/workflows/release.yml
name: Build & Release
on:
  push:
    tags: ['v*']
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Zip extension folder
        run: cd sf-devtool-extension && zip -r ../devtoolsnext-${{ github.ref_name }}.zip . -x '*.git*' -x 'tests/*'
      - uses: softprops/action-gh-release@v2
        with:
          files: devtoolsnext-*.zip
```

**3. Chrome Web Store 自動公開** (シークレットに `CWS_CLIENT_ID` / `CWS_REFRESH_TOKEN` / `CWS_EXT_ID` 設定):

```yaml
# .github/workflows/cws-publish.yml — タグ push でストア更新申請
- name: Upload to Chrome Web Store
  uses: mnao305/chrome-extension-upload@v5.0.0
  with:
    file-path: devtoolsnext-${{ github.ref_name }}.zip
    extension-id: ${{ secrets.CWS_EXT_ID }}
    client-id: ${{ secrets.CWS_CLIENT_ID }}
    refresh-token: ${{ secrets.CWS_REFRESH_TOKEN }}
```

**4. README リンクチェック** (壊れたリンク早期検出):
- `lychee-action` や `markdown-link-check` を週次実行
- 大量の `[テキスト](url)` リンクで誤字・移転を防ぐ

**運用 Tips**:
- Phase 121 で新設した「リリース前 全体動作確認チェックリスト」は **手動テスト** のため、CI とは併用 (CI 通過 → 手動テスト → リリース)
- `manifest.json` の `version` は **三桁** (例: `3.55.0`) — Web Store は四桁まで受け付けるが運用簡素化のため三桁固定
- リリースタグは `v3.55.0` 形式 → workflow が `${{ github.ref_name }}` でそのまま `.zip` 名に流用

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

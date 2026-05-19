# GitHub セットアップ（初回のみ）

このリポジトリは既にローカルで `git init` + 初回コミット済です。
GitHub にプッシュするには、**1 度だけ** 認証が必要です。

## 手順

### 1. GitHub CLI に認証 (1 度だけ)

PowerShell / Bash で:
```bash
gh auth login
```

対話プロンプトで:
- **GitHub.com** を選択
- **HTTPS** を選択
- **Authenticate with your GitHub credentials** → **Login with a web browser** を選択
- ブラウザで表示される 8 桁コードを入力 → ログイン

### 2. リモートリポジトリ作成 + 初回 push

このディレクトリ (`sf-devtool-extension/`) で:
```bash
gh repo create sf-devtool-extension --public --source=. --remote=origin --push --description "Salesforce 開発者向け Chrome 拡張 (MV3): SOQL/Apex/Inspector/設計書20種/データエクスポート/API URLビルダー/変更セット/Limits ダッシュボード"
```

- **--public**: 公開 / **--private**: 非公開 にする場合は変更
- 既存の同名リポジトリがある場合は `gh repo create akira/sf-devtool-extension --public ...` のように `<user>/<repo>` 形式で

### 3. 以降の自動 push

サイクル完了時に Claude が以下を実行します（認証済の場合）:
```bash
cd sf-devtool-extension
git add -A
git commit -m "v0.X.Y: <変更内容>"
git push origin main
```

## ローカル状態確認

```bash
cd sf-devtool-extension
git log --oneline      # コミット履歴
git remote -v          # リモート設定 (空なら未連携)
git status             # ワーキングツリー
```

## トラブルシュート

- **`gh auth login` できない**: トークン経由で `echo $GITHUB_TOKEN | gh auth login --with-token`
- **push が拒否される**: リモートが先に存在 → `git pull --rebase origin main` で同期してから再 push
- **クレデンシャル切れ**: `gh auth refresh`

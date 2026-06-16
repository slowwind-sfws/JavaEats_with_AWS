# CLAUDE.md

## プロジェクト概要

Spring Boot で作られた "JavaEats" を AWS Serverless に移行する実験リポジトリ。  
Java 21 + Spring Boot 4.0.0 を AWS Lambda + API Gateway (SAM) で動かすことが目標。

## ディレクトリ構成と各パッケージの役割

```
JavaEats_with_AWS/
├── .devcontainer/       # Dev Container 設定（WSL2 + Docker-in-Docker 対応）
│   ├── Dockerfile       # fuse-overlayfs を導入した base イメージ
│   ├── devcontainer.json
│   └── install.sh       # postCreateCommand: .aws/.claude を /home/vscode/ へコピー
├── .aws/                # AWS 認証情報バックアップ（.gitignore 対象、コンテナ再作成用）
├── .claude/             # Claude Code 設定バックアップ（.gitignore 対象、コンテナ再作成用）
└── packages/
    └── api/             # SAM + Spring Boot Lambda ハンドラ本体
        ├── pom.xml      # Maven ビルド定義（assembly-zip がデフォルト有効）
        ├── template.yml # SAM テンプレート（Lambda + API Gateway）
        └── src/
            └── assembly/bin.xml  # ZIP アセンブリ記述
```

## 主要コマンド

```bash
# ビルド（SAM が Docker コンテナ内で Maven を実行）
cd packages/api && sam build --use-container

# ローカル動作確認
cd packages/api && sam local start-api
# → http://127.0.0.1:3000/ping で {"pong": "Hello, World!"} が返る

# AWS へデプロイ（初回は --guided で対話設定）
cd packages/api && sam deploy --guided
```

## AWS・インフラ設定

- **リージョン**: `ap-northeast-1`
- **Lambda ハンドラ**: `jp.co.ambl.javaeats.StreamLambdaHandler::handleRequest`
- **ランタイム**: `java21`、メモリ `512MB`、タイムアウト `30秒`
- **SAM テンプレート**: `packages/api/template.yml`
- **ビルド成果物**: `packages/api/.aws-sam/build/`

## Claude Code 設定

Claude Code は Amazon Bedrock 経由で動作しています（`.claude/settings.json` 参照）。

- `CLAUDE_CODE_USE_BEDROCK=1`
- モデル: `jp.anthropic.claude-sonnet-4-6`

## 認証情報の管理方針（重要）

`.aws/` と `.claude/` は `.gitignore` に入っており**コミットされません**が、  
Dev Container 再作成時に認証情報が消えるため、リポジトリルートにバックアップとして置く設計になっています。

- `install.sh`（`postCreateCommand`）がコンテナ起動時にこれらを `/home/vscode/` へ自動コピーします。
- コンテナ外で認証情報を更新したら、必ず以下のコマンドでバックアップを更新してください。

```bash
cp -r /home/vscode/.aws ./
cp -r /home/vscode/.claude ./
```

## ビルドの注意点

- `pom.xml` の `assembly-zip` プロファイルがデフォルト有効です。`sam build --use-container` がこれを使います。
- Tomcat は依存から除外済みです（Lambda 対応のため）。
- `shaded-jar` プロファイルは代替のビルド方式ですが、通常は使用しません。

## 開発環境（Dev Container）の注意点

WSL2 上でホスト FS が overlayfs のため、Docker-in-Docker で overlay-on-overlay エラーが発生します。  
これを回避するため Dockerfile で `fuse-overlayfs` を導入し、`daemon.json` に `storage-driver: fuse-overlayfs` を設定済みです。  
`postStartCommand` は現在コメントアウトされていますが、`docker-init.sh` の再実行が必要な場合は有効化してください。

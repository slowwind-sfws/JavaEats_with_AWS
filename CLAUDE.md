# CLAUDE.md

## プロジェクト概要

Spring Boot で作られた "JavaEats" を AWS Serverless に移行する実験リポジトリ。  
Java 21 + Spring Boot 4.1.0 を AWS Lambda + API Gateway で動かし、マイクロサービス化を進めることが目標。

## モノレポ構成

```
JavaEats_with_AWS/
├── .devcontainer/       # Dev Container 設定（WSL2 + Docker-in-Docker 対応）
│   ├── Dockerfile       # fuse-overlayfs を導入した base イメージ
│   ├── devcontainer.json
│   └── install.sh       # postCreateCommand: .aws/.claude を /home/vscode/ へコピー
├── .aws/                # AWS 認証情報バックアップ（.gitignore 対象、コンテナ再作成用）
├── .claude/             # Claude Code 設定バックアップ（.gitignore 対象、コンテナ再作成用）
├── localstack/          # ローカル開発インフラ（MySQL + Floci）
│   └── docker-compose.yml
└── packages/
    ├── api/             # バックエンド: Spring Boot + Lambda（詳細は packages/api/CLAUDE.md）
    ├── web/             # フロントエンド: React（詳細は packages/web/CLAUDE.md）
    └── cdk/             # 本番デプロイ: AWS CDK（詳細は packages/cdk/CLAUDE.md）
```

各パッケージの詳細は配下の `CLAUDE.md` を参照すること。

## 主要コマンド

```bash
# バックエンド ビルド & ローカル起動
cd packages/api && ./mvnw package -DskipTests
cd packages/api && sam local start-api -t template.local.yaml -p 8080 --docker-network sam-network

# フロントエンド開発サーバー起動
cd packages/web && npm start

# フロントエンド本番ビルド
cd packages/web && npm run build

# 本番デプロイ（api・web のビルド後に実行）
cd packages/cdk && npx cdk deploy

# ローカルインフラ（MySQL + Floci）起動
cd localstack && docker compose up -d
```

## AWS・インフラ設定

- **リージョン**: `ap-northeast-1`
- **Lambda ハンドラ**: `org.springframework.cloud.function.adapter.aws.FunctionInvoker`
- **ランタイム**: `java21`、メモリ `512MB`、タイムアウト `30秒`、SnapStart 有効
- **ローカル開発用 SAM テンプレート**: `packages/api/template.local.yaml`
- **本番デプロイ**: `packages/cdk/`（AWS CDK）
  - Lambda + API Gateway（バックエンド）
  - S3 + CloudFront（フロントエンド）
  - CloudFront の `api/*` ビヘイビアで API Gateway に転送

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

## 開発環境（Dev Container）の注意点

WSL2 上でホスト FS が overlayfs のため、Docker-in-Docker で overlay-on-overlay エラーが発生します。  
これを回避するため Dockerfile で `fuse-overlayfs` を導入し、`daemon.json` に `storage-driver: fuse-overlayfs` を設定済みです。  
`postStartCommand` は現在コメントアウトされていますが、`docker-init.sh` の再実行が必要な場合は有効化してください。

# JavaEats_with_AWS

Spring Boot で作成された "JavaEats" システムを AWS Serverless に移行する実験リポジトリ。  
Java 21 + Spring Boot 4.1.0 を AWS Lambda + API Gateway で動かし、マイクロサービス化を進めることを目的としています。

## 技術スタック

| 分類 | 内容 |
|---|---|
| バックエンド言語 | Java 21 |
| バックエンドフレームワーク | Spring Boot 4.1.0 |
| フロントエンド言語 | TypeScript 4.9.5 |
| フロントエンドフレームワーク | React 19 |
| デプロイ先 | AWS Lambda + API Gateway（バックエンド）/ S3 + CloudFront（フロントエンド、将来追加） |
| ローカル開発 | AWS SAM CLI（バックエンド）/ React 開発サーバー（フロントエンド） |
| 本番デプロイ | AWS CDK（`packages/cdk/`、将来追加） |
| AI アシスタント | Claude Code (Amazon Bedrock, ap-northeast-1) |

## モノレポ構成

```
JavaEats_with_AWS/
├── .devcontainer/       # Dev Container 設定（WSL2 + Docker-in-Docker 対応）
├── .aws/                # AWS 認証情報バックアップ（コンテナ再作成用）
├── .claude/             # Claude Code 設定バックアップ（コンテナ再作成用）
├── local/               # ローカル開発インフラ（MySQL 等）
│   └── docker-compose.yml
└── packages/
    ├── api/             # バックエンド（Spring Boot + Lambda）
    ├── web/             # フロントエンド（React）
    └── cdk/             # 本番デプロイ（AWS CDK）※将来追加
```

各パッケージの詳細は配下の README.md を参照してください。

- [packages/api/README.md](packages/api/README.md) — バックエンド API
- [packages/web/README.md](packages/web/README.md) — フロントエンド

## 開発環境（Dev Container）

VS Code の Dev Container 機能で環境が自動構築されます。  
コンテナには以下がプリインストールされます。

- Java 21 + Maven
- Node.js + npm
- AWS CLI
- AWS SAM CLI
- Docker-in-Docker（WSL2 での overlay 問題を `fuse-overlayfs` で回避済み）

`postCreateCommand` として `.devcontainer/install.sh` が実行され、  
リポジトリルートにバックアップされた `.aws/` と `.claude/` を `/home/vscode/` へ自動コピーします。

## コンテナ（再）作成時に行うこと

```bash
# AWS 認証設定
aws configure

# Git 初期設定
git config --global user.email "you@example.com"
git config --global user.name "Your Name"

# AWS 認証情報と Claude の設定をリポジトリルートにバックアップ
# ※ .gitignore に含まれているためコミットはされない
cp -r /home/vscode/.aws ./
cp -r /home/vscode/.claude ./
```

## ローカル開発の起動手順

```bash
# 1. ローカルインフラ（MySQL）起動
cd local && docker compose up -d

# 2. バックエンド ビルド
cd packages/api && ./mvnw package -DskipTests

# 3. ローカル API サーバー起動（port 8080）
cd packages/api && sam local start-api -t template.local.yaml -p 8080 --docker-network sam-network
# → http://127.0.0.1:8080/item/list
# → http://127.0.0.1:8080/item/{id}
# → http://127.0.0.1:8080/item/category

# 4. フロントエンド開発サーバー起動（port 3000、別ターミナル）
cd packages/web && npm start
# → http://localhost:3000
```

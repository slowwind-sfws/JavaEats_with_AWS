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
| 認証 | AWS Cognito + Amplify v6 |
| デプロイ先 | AWS Lambda + API Gateway（バックエンド）/ S3 + CloudFront（フロントエンド）/ Aurora Serverless V2（DB） |
| ローカル開発 | AWS SAM CLI（バックエンド）/ React 開発サーバー（フロントエンド）/ Floci（Cognito エミュレータ） |
| 本番デプロイ | AWS CDK（`packages/cdk/`） |
| AI アシスタント | Claude Code (Amazon Bedrock, ap-northeast-1) |

## モノレポ構成

```
JavaEats_with_AWS/
├── .devcontainer/       # Dev Container 設定（WSL2 + Docker-in-Docker 対応）
├── .aws/                # AWS 認証情報バックアップ（コンテナ再作成用）
├── .claude/             # Claude Code 設定バックアップ（コンテナ再作成用）
├── docs/                # 設計ドキュメント
│   └── user-feature-planning.md
├── localstack/          # ローカル開発インフラ（MySQL + Floci）
│   └── docker-compose.yml
└── packages/
    ├── api/             # バックエンド（Spring Boot + Lambda）
    ├── web/             # フロントエンド（React）
    └── cdk/             # 本番デプロイ（AWS CDK）
```

各パッケージの詳細は配下の README.md を参照してください。

- [packages/api/README.md](packages/api/README.md) — バックエンド API
- [packages/web/README.md](packages/web/README.md) — フロントエンド
- [packages/cdk/README.md](packages/cdk/README.md) — 本番デプロイ（AWS CDK）

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

### 1. インフラ起動

```bash
cd localstack && docker compose up -d
```

### 2. DB 初期化（初回・リセット時のみ）

> **重要:** `item-service` の `sql.init.mode` は `never` に設定されています。  
> Lambda 起動時にテーブルが自動作成されないため、初回セットアップ時と DB をリセットしたい場合は以下を手動実行してください。

```bash
docker exec -i localstack-mysql-1 mysql -u user -ppassword db \
  < packages/api/item-service/src/main/resources/schema.sql
docker exec -i localstack-mysql-1 mysql -u user -ppassword db \
  < packages/api/item-service/src/main/resources/data.sql
```

### 3. バックエンド起動

```bash
cd packages/api
./mvnw package -DskipTests
sam local start-api -t template.local.yaml -p 8080 --docker-network sam-network
```

### 4. フロントエンド起動（別ターミナル）

```bash
cd packages/web && npm start
# → http://localhost:3000
```

未認証時は Amplify UI のサインイン画面が自動表示されます。  
サインイン成功後、`POST /user/register` が自動呼び出されて DB にユーザーレコードが登録されます（`INSERT IGNORE` により既存ユーザーは上書きされません）。

## 本番デプロイ

```bash
# バックエンド・フロントエンドをビルド後に実行
cd packages/cdk && npx cdk deploy
```

# JavaEats_with_AWS

SpringBootで作成された"JavaEats"システムをAWSクラウドに移行する実験リポジトリ。  
Java 21 + Spring Boot 4.0.0 を AWS Lambda + API Gateway (SAM) へ載せ替えることを目的としています。

## 技術スタック

| 分類 | 内容 |
|---|---|
| 言語 | Java 21 |
| フレームワーク | Spring Boot 4.0.0 |
| デプロイ先 | AWS Lambda + API Gateway |
| インフラ定義 | AWS SAM (`template.yml`) |
| ビルドツール | Maven (assembly-zip プロファイルで ZIP 生成) |
| AI アシスタント | Claude Code (Amazon Bedrock, ap-northeast-1) |

## ディレクトリ構成

```
JavaEats_with_AWS/
├── .devcontainer/       # Dev Container 設定（WSL2 + Docker-in-Docker 対応）
├── .aws/                # AWS 認証情報バックアップ（コンテナ再作成用）
├── .claude/             # Claude Code 設定バックアップ（コンテナ再作成用）
└── packages/
    └── api/             # SAM + Spring Boot Lambda ハンドラ本体
        ├── pom.xml
        ├── template.yml # SAM テンプレート
        └── src/
```

## 開発環境（Dev Container）

VS Code の Dev Container 機能で環境が自動構築されます。  
コンテナには以下がプリインストールされます。

- Java 21 + Maven
- AWS CLI
- AWS SAM CLI
- Docker-in-Docker（WSL2 での overlay 問題を `fuse-overlayfs` で回避済み）

`postCreateCommand` として `.devcontainer/install.sh` が実行され、  
リポジトリルートにバックアップされた `.aws/` と `.claude/` を `/home/vscode/` へ自動コピーします。

## コンテナ（再）作成時に行うこと

```bash
# AWS 認証設定
aws configure

# Git 初期設定（認証も含む）
git config --global user.email "you@example.com"
git config --global user.name "Your Name"

# AWS 認証情報と Claude の API キーをリポジトリルートにバックアップ
# ※ .gitignore に含まれているためコミットはされない
cp -r /home/vscode/.aws ./
cp -r /home/vscode/.claude ./
```

## ビルド・ローカル実行・デプロイ

```bash
cd packages/api

# ビルド（Docker コンテナ内でビルド）
sam build --use-container

# ローカル動作確認
sam local start-api
# → http://127.0.0.1:3000/ping にアクセス

# AWS へデプロイ
sam deploy --guided
```

詳細は [`packages/api/README.md`](packages/api/README.md) を参照してください。

## 備忘録

```bash
mkdir packages
cd packages/
mvn archetype:generate -DgroupId=jp.co.ambl.javaeats -DartifactId=api -Dversion=1.0-SNAPSHOT \
-DarchetypeGroupId=com.amazonaws.serverless.archetypes \
-DarchetypeArtifactId=aws-serverless-springboot4-archetype -DarchetypeVersion=3.0.0
cd api
sam build --use-container
sam local start-api
```
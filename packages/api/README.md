# packages/api — バックエンド

JavaEats のバックエンド API。Spring Boot + Spring Cloud Function で実装し、AWS Lambda + API Gateway 上で動作する。  
サービスは **Mavenマルチモジュール**で分割し、それぞれ独立した JAR として Lambda にデプロイする。

## 技術スタック

| 分類 | 内容 |
|---|---|
| 言語 | Java 21 |
| フレームワーク | Spring Boot 4.1.0 |
| Lambda アダプタ | Spring Cloud Function 2025.1.2 |
| ORM | MyBatis 4.0.1（XML マッピング） |
| DB | MySQL（ローカル: Docker、本番: Aurora Serverless V2） |
| ビルド | Maven マルチモジュール（maven-shade-plugin で fat JAR） |
| ローカル開発 | AWS SAM CLI |

## ディレクトリ構成

```
packages/api/
├── pom.xml                          # 親 POM
├── template.local.yaml              # ローカル開発用 SAM テンプレート
├── shared/                          # 共通ライブラリ（各サービスに組み込み）
│   └── src/.../shared/
│       ├── entity/Category.java
│       └── util/ResponseUtility.java  # 共通レスポンス
├── item-service/                    # 商品・カテゴリ（実装済み）
│   └── src/main/resources/
│       ├── schema.sql               # 全テーブルの定義（DROP → CREATE）
│       └── data.sql                 # 初期データ
├── order-service/                   # 注文管理（実装済み）
└── user-service/                    # ユーザープロフィール（実装済み）
```

## セットアップ（初回・DB リセット後）

> **重要:** `item-service` の `sql.init.mode` は `never` に設定されています。  
> ローカル MySQL にテーブルとデータが存在しない状態では API が動作しません。  
> 初回セットアップ時、または DB をリセットしたい場合は以下を手動実行してください。

```bash
# ローカルインフラ（MySQL + Floci）起動
cd localstack && docker compose up -d

# スキーマと初期データを MySQL に流し込む（初回 or リセット時のみ）
docker exec -i localstack-mysql-1 mysql -u user -ppassword db \
  < packages/api/item-service/src/main/resources/schema.sql
docker exec -i localstack-mysql-1 mysql -u user -ppassword db \
  < packages/api/item-service/src/main/resources/data.sql
```

## ビルド・起動

```bash
cd packages/api

# 全サービスをまとめてビルド
./mvnw package -DskipTests

# ローカル API サーバー起動（--docker-network は MySQL コンテナとの通信に必須）
sam local start-api -t template.local.yaml -p 8080 --docker-network sam-network
```

## テスト実行

テストは `sql.init.mode=always` を環境変数で上書きして実行します（トランザクションにより自動ロールバックされ、初期データは保護されます）。

```bash
cd packages/api
SPRING_DATASOURCE_URL=jdbc:mysql://localhost:3306/db \
SPRING_DATASOURCE_USERNAME=user \
SPRING_DATASOURCE_PASSWORD=password \
./mvnw test
```

## API エンドポイント

### item-service（実装済み）

| メソッド | パス | 説明 |
|---|---|---|
| GET | `/item/list` | 商品検索（`keyword`, `categoryId` クエリパラメータ） |
| GET | `/item/{id}` | 商品1件取得 |
| GET | `/item/category` | カテゴリ一覧取得 |

### order-service（実装済み）

| メソッド | パス | 説明 |
|---|---|---|
| GET | `/order/list` | 注文一覧取得（`userId` クエリパラメータ必須、Cognito sub を渡す） |
| GET | `/order/{id}` | 注文サマリー取得（`{id}` は userId＝Cognito sub） |
| POST | `/order` | 注文作成 |

### user-service（実装済み）

| メソッド | パス | 説明 |
|---|---|---|
| POST | `/user/register` | ユーザー登録（`INSERT IGNORE` によるべき等処理） |
| GET | `/user/{id}` | ユーザープロフィール情報取得 |
| PUT | `/user/{id}` | ユーザープロフィール情報更新（名前・郵便番号・住所・電話番号） |

全エンドポイントに `Authorization: Bearer <Cognito ID Token>` ヘッダーが必要。  
本番環境では API Gateway の Cognito オーソライザーが JWT を自動検証する。

## 設計上の注意点

### LocalDateTime を使わない

`spring-boot-starter-web` を依存に含めないため `ObjectMapper` は `new ObjectMapper()` で直接生成する。  
`JavaTimeModule` が自動登録されず `LocalDateTime` が数値配列にシリアライズされるため、日時フィールドは **`String` 型**で定義する。

### sql.init.mode の分担

スキーマ（`schema.sql`）と初期データ（`data.sql`）は `item-service` のみに配置。  
`order-service`・`user-service` はいずれも `sql.init.mode=never`（デフォルト）とし、起動時の DROP/CREATE を防ぐ。  
テスト実行時のみ環境変数で `sql.init.mode=always` を上書きする。

### SAM local での Cognito sub 取得

SAM local には API Gateway の Cognito オーソライザーが存在しないため `requestContext.authorizer` が null になる。  
`UserFunctions.registerUser()` は `claims` が null の場合にリクエストボディの `id` フィールドにフォールバックする。  
本番では `claims.sub` が付与されるためボディの `id` は無視される。

## デプロイ

本番環境へのデプロイは `packages/cdk/` の AWS CDK スタックで行います。  
`template.local.yaml` はローカル開発専用です。

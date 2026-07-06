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
| DB | MySQL |
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
│   └── target/item-service-0.0.1-SNAPSHOT.jar
├── order-service/                   # 注文管理（実装済み）
│   └── src/.../order/
│       ├── service/OrderService.java  # ビジネスロジック（金額計算・主キー補完）
│       └── ...
└── user-service/                    # ユーザー・認証（未実装）
```

## セットアップ

ローカル MySQL が必要です。`localstack/docker-compose.yml` で起動できます。

```bash
cd localstack
docker compose up -d
```

## ビルド・起動

```bash
cd packages/api

# 全サービスをまとめてビルド
./mvnw package -DskipTests

# ローカル API サーバー起動（--docker-network は MySQL コンテナとの通信に必須）
sam local start-api -t template.local.yaml --docker-network sam-network
```

## API エンドポイント

### item-service（実装済み）

| メソッド | パス | Bean 名 | 説明 |
|---|---|---|---|
| GET | `/item/list` | `listItems` | 商品検索（`keyword`, `categoryId` クエリパラメータ） |
| GET | `/item/{id}` | `getItem` | 商品1件取得 |
| GET | `/item/category` | `listCategories` | カテゴリ一覧取得 |

フロントエンドからは `Authorization: Bearer <Cognito ID Token>` ヘッダーが付与される。本番環境では、API Gateway レベルで Cognito ユーザープールオーソライザー（`JavaEatsAuthorizer`）が有効化されており、JWT の有効性が自動的に検証される。バックエンド Lambda は検証済みの安全なリクエストのみを受け取る。

### order-service（実装済み）

| メソッド | パス | Bean 名 | 説明 |
|---|---|---|---|
| GET | `/order/list` | `listOrders` | 注文一覧取得（`userId` クエリパラメータ必須、Cognito sub を渡す） |
| GET | `/order/{id}` | `getOrder` | 注文サマリー取得（`{id}` は実態として userId＝Cognito sub） |
| POST | `/order` | `createOrder` | 注文作成 |

### user-service（未実装）

| メソッド | パス | Bean 名 | 説明 |
|---|---|---|---|
| POST | `/user/register` | `registerUser` | ユーザー登録 |
| GET | `/user/{id}` | `getUser` | ユーザー情報取得 |

## サービス構成

| サービス | パッケージ | 状態 |
|---|---|---|
| shared | `jp.co.ambl.javaeats.shared` | 実装済み（Category entity） |
| item-service | `jp.co.ambl.javaeats.item` | 実装済み |
| order-service | `jp.co.ambl.javaeats.order` | 実装済み（POST /order 注文作成・動作確認済み） |
| user-service | `jp.co.ambl.javaeats.user` | 未実装 |

## 設計上の注意点

### LocalDateTime を使わない理由

`spring-boot-starter-web` を依存に含めないため、`ObjectMapper` は `new ObjectMapper()` で直接生成する。  
この場合 `jackson-datatype-jsr310` の `JavaTimeModule` が自動登録されず、`LocalDateTime` は `[2026,7,5,10,30,0]` のような数値配列でシリアライズされてしまう。  
依存を増やさないため、日時フィールドは **`String` 型**で定義する。MyBatis が MySQL の `DATETIME` 型を `String` に自動変換する。

### sql.init.mode の分担とローカルでのデータリセット問題

スキーマ（`schema.sql`）とテストデータ（`data.sql`）は `item-service` のみに置いている。  
`order-service` で `sql.init.mode=always` にすると起動時に DROP/CREATE が走り既存データが失われるため、`order-service` の `application.properties` は `sql.init.mode=never` に設定している。

**注意（ローカル開発）:** `schema.sql` は `DROP TABLE IF EXISTS` から始まるため、item-service の Lambda がコールドスタートするたびに全テーブルがリセットされる。商品一覧や商品詳細を取得するリクエストを送ると item-service がコールドスタートし、その時点で orders テーブルも含めた全データが初期化される。本番環境では Lambda が常駐するため問題は発生しない。ローカルでデータを維持したい場合は `schema.sql` の `DROP TABLE` を `CREATE TABLE IF NOT EXISTS` に変更し、`data.sql` を `INSERT IGNORE` に書き換えること。

## デプロイ

本番環境へのデプロイは `packages/cdk/` の AWS CDK スタックで行います。  
`template.local.yaml` はローカル開発専用です。

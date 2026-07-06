# CLAUDE.md — packages/api

## パッケージの役割

モノレポ `JavaEats_with_AWS` のバックエンドパッケージ。  
Spring Boot + Spring Cloud Function で Lambda 関数を実装し、API Gateway 経由で REST API を提供する。  
サービスは **Mavenマルチモジュール**で分割し、それぞれ独立した JAR として Lambda にデプロイする。

## 技術スタック

| 分類 | 内容 |
|---|---|
| 言語 | Java 21 |
| フレームワーク | Spring Boot 4.1.0 |
| Lambda アダプタ | Spring Cloud Function 2025.1.2 (`spring-cloud-function-adapter-aws`) |
| ORM | MyBatis 4.0.1（XML マッピング） |
| DB（ローカル） | MySQL（`mysql:3306/db`、Docker ネットワーク `sam-network` 経由） |
| DB（本番） | Aurora Serverless V2（`shared.cluster-c1ygeeuiuvel.ap-northeast-1.rds.amazonaws.com:3306/db`） |
| ビルド | Maven マルチモジュール（`maven-shade-plugin` で各サービスが fat JAR 生成） |
| ローカル開発 | AWS SAM CLI（`template.local.yaml`） |

## ディレクトリ構成

### 現在の構成

```
packages/api/
├── pom.xml                          # 親 POM（共通依存・バージョン管理）
├── template.local.yaml              # sam local 専用（本番デプロイは packages/cdk が担当）
├── shared/                          # 共通ライブラリ（entity や共通ユーティリティを各サービスで共有）
│   ├── pom.xml
│   └── src/main/java/jp/co/ambl/javaeats/shared/
│       ├── entity/
│       │   └── Category.java
│       └── util/
│           └── ResponseUtility.java      # ok, notFound, error の共通レスポンス
├── item-service/                    # 商品・カテゴリ（実装済み）
│   ├── pom.xml
│   ├── target/item-service-0.0.1-SNAPSHOT.jar
│   └── src/main/java/jp/co/ambl/javaeats/item/
│       ├── ItemServiceApplication.java
│       ├── function/ItemFunctions.java   # listItems, getItem, listCategories
│       ├── dto/                          # ItemSearchRequest, ItemResponse
│       └── mapper/                       # ItemMapper, CategoryMapper
└── order-service/                   # 注文管理（スケルトン実装済み）
    ├── pom.xml
    └── src/main/java/jp/co/ambl/javaeats/order/
        ├── OrderServiceApplication.java
        ├── function/OrderFunctions.java  # listOrders, getOrder, createOrder
        ├── service/OrderService.java     # ビジネスロジック（仮金額計算、日時・主キー補完）
        ├── dto/                          # OrderRequest, OrderResponse
        └── mapper/                       # OrderMapper
```

### 今後追加予定

```
└── user-service/                    # ユーザー・認証（未実装）
```

## Lambda 関数と API エンドポイント

### item-service（実装済み）

| Bean 名 | HTTP | パス | 説明 |
|---|---|---|---|
| `listItems` | GET | `/item/list` | 商品検索（`keyword`, `categoryId` クエリパラメータ） |
| `getItem` | GET | `/item/{id}` | 商品1件取得 |
| `listCategories` | GET | `/item/category` | カテゴリ一覧取得 |

フロントエンドからは `Authorization: Bearer <Cognito ID Token>` ヘッダーが付与される。  
本番環境では、API Gateway レベルで Cognito ユーザープールオーソライザー（`JavaEatsAuthorizer`）が有効化されており、JWT の有効性が自動的に検証される。バックエンド Lambda は検証済みの安全なリクエストのみを受け取る。

### order-service（実装済み）

| Bean 名 | HTTP | パス | 説明 |
|---|---|---|---|
| `listOrders` | GET | `/order/list` | 注文一覧取得（`userId` クエリパラメータ必須、Cognito sub を渡す） |
| `getOrder` | GET | `/order/{id}` | 注文サマリー取得（`{id}` は実態として userId＝Cognito sub） |
| `createOrder` | POST | `/order` | 注文作成 |

### user-service（未実装）

| Bean 名 | HTTP | パス | 説明 |
|---|---|---|---|
| `registerUser` | POST | `/user/register` | ユーザー登録 |
| `getUser` | GET | `/user/{id}` | ユーザー情報取得 |

Lambda ハンドラ（全サービス共通）: `org.springframework.cloud.function.adapter.aws.FunctionInvoker`  
呼び出したい Bean は環境変数 `SPRING_CLOUD_FUNCTION_DEFINITION` で指定する。

## 主要コマンド

```bash
# 全サービスをまとめてビルド（親 POM から実行）
cd packages/api && ./mvnw package -DskipTests

# IDE の依存解決用（shared を ~/.m2 に登録してから resolve）
cd packages/api && ./mvnw install -DskipTests

# ローカルインフラ（MySQL）起動
cd localstack && docker compose up -d

# ローカル API 起動（Maven ビルド後に実行）
cd packages/api && sam local start-api -t template.local.yaml -p 8080 --docker-network sam-network
# → http://127.0.0.1:8080/item/list
# → http://127.0.0.1:8080/item/{id}
# → http://127.0.0.1:8080/item/category
# → http://127.0.0.1:8080/order/list?userId=1
# → http://127.0.0.1:8080/order/{id}
# → POST http://127.0.0.1:8080/order

# テスト実行
cd packages/api && ./mvnw test
```

## `template.local.yaml` の位置づけ

`template.local.yaml` は `sam local start-api` によるローカル開発専用ファイル。  
各サービスの `CodeUri` はサブモジュールの `target/` への相対パスで指定するため `packages/api/` 直下に置く。  
本番環境のデプロイ定義は `packages/cdk/` の AWS CDK スタックが担う。

## ビルドの注意点

- `maven-shade-plugin` が各サービスの `package` フェーズで fat JAR を生成する（`shared` は対象外）。
- `shared` モジュールは fat JAR 不要。他モジュールに組み込まれる前提のため `maven-shade-plugin` を設定しない。
- `shared` を他モジュールから参照するには `./mvnw install` で `~/.m2` に登録が必要（`package` だけでは不足）。
- `sam local start-api` はコンテナ内で動くため `--docker-network sam-network` オプションが必須。
- SnapStart (`ApplyOn: PublishedVersions`) が有効。本番では `AutoPublishAlias: live` で管理される。
- GET 関数でパスパラメータ・クエリパラメータを取得するには `Function<APIGatewayProxyRequestEvent, APIGatewayProxyResponseEvent>` を使う（`Function<Integer, T>` では受け取れない）。
- `ObjectMapper` は `spring-boot-starter-web` がないと Bean 登録されないため `new ObjectMapper()` で直接生成する。
- **`LocalDateTime` は使用しない。** `spring-boot-starter-web` がない環境で `new ObjectMapper()` を直接生成すると、`LocalDateTime` は `[2026,7,5,10,30,0]` のような数値配列としてシリアライズされる。`jackson-datatype-jsr310` の `JavaTimeModule` を使えば解決できるが、依存を増やさないため日時フィールドは `String` 型で定義する（`springboot-food-delivery-system` の元実装も同様の方針）。MyBatis 側は `String` マッピングで MySQL の `DATETIME` 型を自動変換する。

## データベーススキーマ概要

| テーブル | 主な用途 | 担当サービス |
|---|---|---|
| `users` | ユーザー（`id` は Cognito sub の VARCHAR(50)、rank_code: 1=一般 / 2=プレミアム / 3=VIP） | user-service |
| `categories` | 料理カテゴリ | item-service / shared |
| `shops` | 店舗（category_id で分類） | item-service |
| `items` | 商品（shop_id, price, image_path） | item-service |
| `orders` | 注文（user_id は Cognito sub の VARCHAR(50)、item_id, quantity, total_price 等） | order-service |

`schema.sql` / `data.sql` は `spring.sql.init.mode=always` でアプリ起動時に毎回実行される（ローカル・本番ともに）。

> **注意（ローカル開発）:** `schema.sql` は `DROP TABLE IF EXISTS` から始まるため、item-service の Lambda がコールドスタートするたびに全テーブルがリセットされる。注文データが消えた場合は item-service へのリクエスト（商品一覧・商品詳細の取得など）によるコールドスタートが原因。本番環境では Lambda が常駐するため問題は発生しないが、ローカルでデータを維持したい場合は `schema.sql` の `DROP TABLE` を `CREATE TABLE IF NOT EXISTS` に変更し、`data.sql` を `INSERT IGNORE` に書き換えること。

## application.properties の環境変数対応

DB 接続設定は環境変数フォールバック形式に変更済み。ローカルでは環境変数未設定時に Docker の MySQL へ接続する。

| プロパティ | item-service デフォルト | order-service デフォルト | 本番（Lambda 環境変数で上書き） |
|---|---|---|---|
| `SPRING_DATASOURCE_URL` | `jdbc:mysql://mysql:3306/db` | 同左 | Aurora エンドポイント |
| `SPRING_DATASOURCE_USERNAME` | `user` | 同左 | `dbadmin` |
| `SPRING_DATASOURCE_PASSWORD` | `password` | 同左 | （CDK で設定） |
| `SPRING_SQL_INIT_MODE` | `always` | **`never`** | （サービスごとに設定） |

`order-service` の `sql.init.mode` を `never` にしている理由: スキーマ定義（`schema.sql`）とテストデータ（`data.sql`）は `item-service` にのみ置いており、`order-service` が起動時に DROP/CREATE を実行すると既存データが消えるため。

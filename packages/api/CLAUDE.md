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
| DB | MySQL（ローカル: `mysql:3306/db`、Docker ネットワーク `sam-network` 経由） |
| ビルド | Maven マルチモジュール（`maven-shade-plugin` で各サービスが fat JAR 生成） |
| ローカル開発 | AWS SAM CLI（`template.local.yaml`） |

## ディレクトリ構成

### 現在の構成

```
packages/api/
├── pom.xml                          # 親 POM（共通依存・バージョン管理）
├── template.local.yaml              # sam local 専用（本番デプロイは packages/cdk が担当）
├── shared/                          # 共通ライブラリ（entity を各サービスで共有）
│   ├── pom.xml
│   └── src/main/java/jp/co/ambl/javaeats/shared/
│       └── entity/
│           └── Category.java
├── item-service/                    # 商品・カテゴリ（実装済み）
│   ├── pom.xml
│   ├── target/item-service-0.0.1-SNAPSHOT.jar
│   └── src/main/java/jp/co/ambl/javaeats/item/
│       ├── ItemServiceApplication.java
│       ├── function/ItemFunctions.java   # listItems, getItem, listCategories
│       ├── dto/                          # ItemSearchRequest, ItemResponse
│       └── mapper/                       # ItemMapper, CategoryMapper
```

### 今後追加予定

```
├── order-service/                   # 注文管理（未実装）
└── user-service/                    # ユーザー・認証（未実装）
```

## Lambda 関数と API エンドポイント

### item-service（実装済み）

| Bean 名 | HTTP | パス | 説明 |
|---|---|---|---|
| `listItems` | GET | `/item/list` | 商品検索（`keyword`, `categoryId` クエリパラメータ） |
| `getItem` | GET | `/item/{id}` | 商品1件取得 |
| `listCategories` | GET | `/item/category` | カテゴリ一覧取得 |

### order-service（未実装）

| Bean 名 | HTTP | パス | 説明 |
|---|---|---|---|
| `createOrder` | POST | `/order` | 注文作成 |
| `getOrder` | GET | `/order/{id}` | 注文1件取得 |
| `listOrders` | GET | `/order/list` | 注文一覧取得 |

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
cd packages/api && sam local start-api -t template.local.yaml --docker-network sam-network
# → http://127.0.0.1:3000/item/list
# → http://127.0.0.1:3000/item/{id}
# → http://127.0.0.1:3000/item/category

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

## データベーススキーマ概要

| テーブル | 主な用途 | 担当サービス |
|---|---|---|
| `users` | ユーザー（rank_code: 1=一般 / 2=プレミアム / 3=VIP） | user-service |
| `categories` | 料理カテゴリ | item-service / shared |
| `shops` | 店舗（category_id で分類） | item-service |
| `items` | 商品（shop_id, price, image_path） | item-service |
| `orders` | 注文（user_id, item_id, quantity, total_price 等） | order-service |

`schema.sql` / `data.sql` は `spring.sql.init.mode=always` でアプリ起動時に毎回実行される。

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
| DB | MySQL（ローカル: `host.docker.internal:3306/db`） |
| ビルド | Maven マルチモジュール（`maven-shade-plugin` で各サービスが fat JAR 生成） |
| ローカル開発 | AWS SAM CLI（`template.local.yaml`） |

## ディレクトリ構成

### 目標構成（マルチモジュール）

```
packages/api/
├── pom.xml                          # 親 POM（共通依存・バージョン管理）
├── template.local.yaml              # sam local 専用（本番デプロイは packages/cdk が担当）
├── shared/                          # 共通ライブラリ（entity・例外・設定）
│   ├── pom.xml
│   └── src/main/java/jp/co/ambl/javaeats/shared/
│       ├── config/
│       └── exception/
├── item-service/                    # 商品・カテゴリ・ショップ
│   ├── pom.xml
│   ├── target/item-service-0.0.1-SNAPSHOT.jar
│   └── src/main/java/jp/co/ambl/javaeats/item/
│       ├── ItemServiceApplication.java
│       ├── function/ItemFunctions.java   # listItems, getItem, listCategories
│       ├── entity/                       # Item, Category, Shop
│       ├── dto/                          # ItemSearchRequest, ItemResponse
│       └── mapper/                       # ItemMapper, CategoryMapper, ShopMapper
├── order-service/                   # 注文管理
│   ├── pom.xml
│   ├── target/order-service-0.0.1-SNAPSHOT.jar
│   └── src/main/java/jp/co/ambl/javaeats/order/
│       ├── OrderServiceApplication.java
│       ├── function/OrderFunctions.java  # createOrder, getOrder, listOrders
│       ├── entity/Order.java
│       ├── dto/                          # OrderRequest, OrderResponse
│       └── mapper/OrderMapper.java
└── user-service/                    # ユーザー・認証
    ├── pom.xml
    ├── target/user-service-0.0.1-SNAPSHOT.jar
    └── src/main/java/jp/co/ambl/javaeats/user/
        ├── UserServiceApplication.java
        ├── function/UserFunctions.java   # registerUser, getUser
        ├── entity/User.java
        ├── dto/                          # UserRequest, UserResponse
        └── mapper/UserMapper.java
```

### 現在の構成（移行前・フラット構成）

```
packages/api/
├── pom.xml
├── template.local.yaml
├── testevent.json
└── src/
    ├── main/
    │   ├── java/jp/co/ambl/javaeats/
    │   │   ├── ApiApplication.java
    │   │   ├── MyFunctions.java      # Spring Cloud Function の Bean 定義（リファクタ対象）
    │   │   ├── entity/Category.java
    │   │   ├── form/ItemForm.java    # 検索条件と検索結果を兼用（リファクタ対象）
    │   │   └── mapper/
    │   │       ├── CategoryMapper.java
    │   │       └── ItemMapper.java
    │   └── resources/
    │       ├── application.properties
    │       ├── schema.sql / data.sql
    │       └── mapper/
    │           ├── CategoryMapper.xml
    │           └── ItemMapper.xml
    └── test/
```

## Lambda 関数と API エンドポイント

### item-service

| Bean 名 | HTTP | パス | 説明 |
|---|---|---|---|
| `listItems` | GET | `/item/list` | 商品検索（keyword, categoryId でフィルタ） |
| `getItem` | GET | `/item/{id}` | 商品1件取得 |
| `listCategories` | GET | `/item/category` | カテゴリ一覧取得 |

### order-service

| Bean 名 | HTTP | パス | 説明 |
|---|---|---|---|
| `createOrder` | POST | `/order` | 注文作成 |
| `getOrder` | GET | `/order/{id}` | 注文1件取得 |
| `listOrders` | GET | `/order/list` | 注文一覧取得 |

### user-service

| Bean 名 | HTTP | パス | 説明 |
|---|---|---|---|
| `registerUser` | POST | `/user/register` | ユーザー登録 |
| `getUser` | GET | `/user/{id}` | ユーザー情報取得 |

Lambda ハンドラ（全サービス共通）: `org.springframework.cloud.function.adapter.aws.FunctionInvoker`  
呼び出したい Bean は環境変数 `SPRING_CLOUD_FUNCTION_DEFINITION` で指定する。

## 主要コマンド

```bash
# 全サービスをまとめてビルド（親 POM から実行）
cd packages/api && ./mvnw package

# ローカル API 起動（Maven ビルド後に実行）
cd packages/api && sam local start-api -t template.local.yaml
# → http://127.0.0.1:3000/item/list
# → http://127.0.0.1:3000/item/{id}
# → http://127.0.0.1:3000/item/category
# → http://127.0.0.1:3000/user/register
# → http://127.0.0.1:3000/user/{id}

# テスト実行
cd packages/api && ./mvnw test
```

> `sam build --use-container` はマルチモジュール構成では `./mvnw package` で代替する。  
> 各サービスの JAR が `target/` に生成された後、`sam local start-api` で起動する。

## `template.local.yaml` の位置づけ

`template.local.yaml` は `sam local start-api` によるローカル開発専用ファイル。  
各サービスの `CodeUri` はサブモジュールの `target/` への相対パスで指定するため `packages/api/` 直下に置く。  
本番環境のデプロイ定義は `packages/cdk/` の AWS CDK スタックが担う。

## ビルドの注意点

- `maven-shade-plugin` が各サービスの `package` フェーズで fat JAR を生成する（Tomcat は除外済み）。
- `sam local start-api` はコンテナ内で動くため DB 接続先は `localhost` ではなく `host.docker.internal` を使う。
- SnapStart (`ApplyOn: PublishedVersions`) が有効。本番では `AutoPublishAlias: live` で管理される。
- パスパラメータ（`/item/{id}` 等）は `APIGatewayProxyRequestEvent#getPathParameters()` で取得する。

## データベーススキーマ概要

| テーブル | 主な用途 | 担当サービス |
|---|---|---|
| `users` | ユーザー（rank_code: 1=一般 / 2=プレミアム / 3=VIP） | user-service |
| `categories` | 料理カテゴリ | item-service |
| `shops` | 店舗（category_id で分類） | item-service |
| `items` | 商品（shop_id, price, image_path） | item-service |
| `orders` | 注文（user_id, item_id, quantity, total_price 等） | order-service |

`schema.sql` / `data.sql` は `spring.sql.init.mode=always` でアプリ起動時に毎回実行される。

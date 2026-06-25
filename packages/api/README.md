# packages/api — バックエンド

JavaEats のバックエンド API。Spring Boot + Spring Cloud Function で実装し、AWS Lambda + API Gateway 上で動作する。  
サービスは **Mavenマルチモジュール**で分割し、`item-service`・`order-service`・`user-service` をそれぞれ独立した JAR として Lambda にデプロイする。

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
├── shared/                          # 共通ライブラリ
├── item-service/                    # 商品・カテゴリ・ショップ
│   └── target/item-service-0.0.1-SNAPSHOT.jar
├── order-service/                   # 注文管理
│   └── target/order-service-0.0.1-SNAPSHOT.jar
└── user-service/                    # ユーザー・認証
    └── target/user-service-0.0.1-SNAPSHOT.jar
```

## セットアップ

ローカル MySQL が必要です。リポジトリルートの `local/docker-compose.yml` で起動できます。

```bash
cd local
docker compose up -d
```

## ビルド・起動

```bash
cd packages/api

# 全サービスをまとめてビルド
./mvnw package

# ローカル API サーバー起動
sam local start-api -t template.local.yaml
```

## API エンドポイント

### item-service

| メソッド | パス | Bean 名 | 説明 |
|---|---|---|---|
| GET | `/item/list` | `listItems` | 商品検索（`keyword`, `categoryId` クエリパラメータ） |
| GET | `/item/{id}` | `getItem` | 商品1件取得 |
| GET | `/item/category` | `listCategories` | カテゴリ一覧取得 |

### order-service

| メソッド | パス | Bean 名 | 説明 |
|---|---|---|---|
| POST | `/order` | `createOrder` | 注文作成 |
| GET | `/order/{id}` | `getOrder` | 注文1件取得 |
| GET | `/order/list` | `listOrders` | 注文一覧取得 |

### user-service

| メソッド | パス | Bean 名 | 説明 |
|---|---|---|---|
| POST | `/user/register` | `registerUser` | ユーザー登録 |
| GET | `/user/{id}` | `getUser` | ユーザー情報取得 |

## サービス構成方針

各サービスは独立した Spring Boot アプリとして動作し、異なる JAR にパッケージングされます。  
`template.local.yaml` の `CodeUri` でサービスごとの JAR を指定することで、  
ローカルでも本番と同じ分離構成を再現します。

| サービス | パッケージ | JAR | 担当ドメイン |
|---|---|---|---|
| item-service | `jp.co.ambl.javaeats.item` | `item-service-*.jar` | 商品・カテゴリ・ショップ |
| order-service | `jp.co.ambl.javaeats.order` | `order-service-*.jar` | 注文管理 |
| user-service | `jp.co.ambl.javaeats.user` | `user-service-*.jar` | ユーザー・認証 |
| shared | `jp.co.ambl.javaeats.shared` | 各サービスに組み込み | 共通コード |

## デプロイ

本番環境へのデプロイは `packages/cdk/` の AWS CDK スタックで行います。  
`template.local.yaml` はローカル開発専用であり、本番デプロイには使用しません。

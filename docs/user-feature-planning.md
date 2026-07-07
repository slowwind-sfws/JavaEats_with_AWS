# ユーザー機能実装に向けた検討事項定義書

本書は、JavaEatsプロジェクトにおけるユーザー機能（ユーザー情報管理、注文との紐付け等）の実装にあたって、検討・決定すべき事項および技術的な課題・選択肢を整理したドキュメントです。

---

## 1. 現状のシステム構成と設計前提

| 分類 | 内容 |
| :--- | :--- |
| **インフラ** | AWS CDK で管理。Cognito User Pool・User Pool Client・`CognitoUserPoolsAuthorizer` 定義済み |
| **API Gateway** | `/item/*`・`/order/*` に Cognito オーソライザー適用済み |
| **フロントエンド** | React (TypeScript)。`aws-amplify` v6 + `@aws-amplify/ui-react` 導入済み |
| **認証UI** | `<Authenticator>` コンポーネントで実装済み。独自 `LoginPage` は削除済み |
| **API トークン付与** | `fetchAuthSession()` で ID トークン取得 → `Authorization: Bearer <token>` 付与済み |
| **バックエンド** | Spring Boot **4.1.0** + Spring Cloud Function + AWS Lambda (Java 21) |
| **Lambda アダプタ** | `spring-cloud-function-adapter-aws`（`FunctionInvoker`） |
| **ORM** | MyBatis（XML マッピング）|
| **データベース** | MySQL（ローカル: Docker、本番: Aurora Serverless V2） |
| **既存サービス** | `item-service`（商品・カテゴリ）、`order-service`（注文）— いずれも実装・本番デプロイ済み |

### 実装済みの主要事項（作業不要）

- Cognito 認証基盤（User Pool、Authorizer）
- フロントエンドの認証UI（`<Authenticator>`）
- API リクエストへの Bearer トークン付与
- `orders.user_id`（Cognito sub、`VARCHAR(50)`）— 注文テーブルへのユーザー紐付けは実装済み

---

## 2. 主要な検討事項と選択肢

### 2.1 インフラ・認証基盤 (AWS Cognito) の詳細化

| 検討項目 | 現状・選択肢 | 影響・考慮事項 |
| :--- | :--- | :--- |
| **サインアップ・検証フロー** | `autoVerify: { email: true }` で設定済み。メール確認コードによるセルフサインアップ | 変更不要。必要に応じてパスワードポリシーを調整する |
| **ユーザー属性の持ち方** | ① Cognito のカスタム属性に保存<br>② Cognito には認証情報のみ、プロフィールは MySQL の `users` テーブルで管理 | **推奨: ②**。既存の `orders.user_id = Cognito sub` の設計と一貫性があり、トランザクション管理・検索も容易 |
| **user エンドポイントへのオーソライザー適用** | 新設する `/user/*` にも `JavaEatsAuthorizer`（Cognito）を適用するか | 認証済みユーザーのみ操作可能にすべきため、基本的には適用する |

---

### 2.2 バックエンド — `user-service` モジュールの新規実装

既存の `item-service`・`order-service` と同構造で Maven サブモジュールとして追加する。

#### API エンドポイント

| Bean 名 | HTTP | パス | 説明 |
| :--- | :--- | :--- | :--- |
| `registerUser` | POST | `/user/register` | ユーザー登録（初回ログイン時に `users` テーブルへ INSERT） |
| `getUser` | GET | `/user/{id}` | ユーザー情報取得（`{id}` は Cognito sub） |
| `updateUser` | PUT | `/user/{id}` | プロフィール更新（名前・住所・電話番号など） |

#### `users` テーブル設計の決定事項

- `id` は Cognito sub（`VARCHAR(50)`）— 既存の `orders.user_id` と型・命名を一致させる。
- 認証情報（メールアドレス・パスワード）は Cognito が管理するため、MySQLの `users` テーブルには保持しない（完全に削除）。
- 注文確認画面への自動補完を目的として、配送先住所・電話番号・郵便番号カラムを追加する。
- `rank_code`（1=一般 / 2=プレミアム / 3=VIP）の初期値は `1`（一般）固定とし、ユーザー登録時にインサートする。

#### このプロジェクト固有の実装制約（必須）

- **`LocalDateTime` は使用しない。** `spring-boot-starter-web` がない Lambda 環境で `new ObjectMapper()` を直接生成すると数値配列にシリアライズされるため、日時フィールドは `String` 型で定義する
- **`SPRING_SQL_INIT_MODE=never`** を設定する。スキーマ定義（`schema.sql`）は `item-service` が一元管理しており、`user-service` が起動時に DROP/CREATE を実行するとデータが消える
- `ObjectMapper` は `new ObjectMapper()` で直接生成する（Bean 登録なし）
- `shared` モジュールを参照する場合は `./mvnw install` で `~/.m2` に登録が必要

#### Cognito `sub` の取得方法

API Gateway の Cognito オーソライザーを通過したリクエストは、`APIGatewayProxyRequestEvent` の `requestContext.authorizer.claims` に認証情報が格納される。

```java
String userId = input.getRequestContext()
    .getAuthorizer()
    .get("claims") // Map<String, Object>
    // または getClaims() — SDK バージョンにより異なる
    .get("sub").toString();
```

ローカル開発では Floci（Cognito エミュレータ）が動作しており、実際の Cognito と同様のフローで `sub` が払い出される。専用のモックフィルタは不要。

---

### 2.3 フロントエンド — ユーザー関連画面の追加

認証UI・Bearer トークン付与は実装済みのため、プロフィール画面の追加が主な作業となる。

| パス | コンポーネント | 内容 |
| :--- | :--- | :--- |
| `/user/profile` | `UserProfilePage` | ユーザー情報表示・編集フォーム |

#### 実装上の設計

- **初回ログイン後の自動登録** — `fetchAuthSession()` で `sub` を取得し、`POST /user/register` を呼び出すタイミング（`App.tsx` の認証成功/サインイン成功の非同期コールバック等）。べき等な登録処理（UPSERT）とする。
- **ヘッダーへのナビゲーション追加** — 「マイページ」リンクを `DefaultPage` のヘッダーに追加。
- **注文履歴画面の実装** — 注文履歴（`/order/history`）は今回は同時に実装せず、後ほど改めて実装する。
- **配送先の自動補完** — ユーザープロフィールに郵便番号・住所・電話番号が登録されている場合、`OrderConfirmPage` などの住所入力欄に初期値として補完する。

---

### 2.4 インフラ — SAM テンプレート・CDK への追加

既存サービスと同様のパターンで `user-service` を追加する。

#### `template.local.yaml` への追加

```yaml
UserRegisterFunction:
  Type: AWS::Serverless::Function
  Properties:
    CodeUri: user-service/target/user-service-0.0.1-SNAPSHOT.jar
    Handler: org.springframework.cloud.function.adapter.aws.FunctionInvoker
    Runtime: java21
    Environment:
      Variables:
        SPRING_CLOUD_FUNCTION_DEFINITION: registerUser
        # ...DB 接続設定
    Events:
      Api:
        Type: Api
        Properties:
          Path: /user/register
          Method: post
```

`getUser`・`updateUser` も同様に追加する。

#### CDK スタックへの追加

- `user-service` 用の Lambda 関数・Lambda バージョン・エイリアス（SnapStart 対応）
- API Gateway への `/user/register`（POST）・`/user/{id}`（GET、PUT）ルート
- 各ルートへの `JavaEatsAuthorizer` 適用

---

## 3. 実装ロードマップ

| フェーズ | 内容 | 状態 |
| :--- | :--- | :--- |
| **フェーズ1** | 検討事項の合意・DBスキーマ方針確定 | → **今ここ** |
| **フェーズ2** | `users` テーブルのカラム設計確定 → `schema.sql` 更新 | 未着手 |
| **フェーズ3** | `user-service` Maven モジュール実装（`registerUser`・`getUser`・`updateUser`） | 未着手 |
| **フェーズ4** | `template.local.yaml` 更新 → ローカル動作確認 | 未着手 |
| **フェーズ5** | フロントエンド（`UserProfilePage`、初回ログイン後の自動登録） | 未着手 |
| **フェーズ6** | CDK スタック更新 → 本番デプロイ | 未着手 |
| **フェーズ7** | フロントエンドからサインアップ〜ログイン〜プロフィール閲覧・編集の結合テスト | 未着手 |

---

## 4. 決定された事項と設計方針

1. **`users` テーブルに持たせるカラム**
   - パスワード・メールアドレスなどの認証情報は Cognito 側で一元管理（マスター）されるため、MySQL の `users` テーブルからは削除。
   - 注文確認画面での配送先自動補完を可能にするため、`zip_code`（郵便番号）、`address`（住所）、`phone_number`（電話番号）カラムを `users` テーブルに追加。
2. **`rank_code` の初期値と変更ポリシー**
   - 初期値は `1`（一般）固定とする。今回のユーザー機能の範囲内では自動変更ロジックは実装せず、将来の管理機能や手動変更に委ねる。
3. **注文履歴画面（`/order/history`）の同時実装**
   - 今回は同時実装は行わず、後ほど改めて実装する。
4. **初回ログイン後の自動ユーザー登録のトリガー**
   - `App.tsx` での認証成功（サインイン成功）を検知したタイミングで非同期で `POST /user/register` をコール。
   - バックエンドの `/user/register` 処理は、既に登録済みの場合は何もしない（あるいは最新情報でUPDATEする）べき等な設計（UPSERT）とする。

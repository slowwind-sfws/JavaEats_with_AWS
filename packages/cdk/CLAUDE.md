# CLAUDE.md — packages/cdk

## パッケージの役割

モノレポ `JavaEats_with_AWS` の本番デプロイパッケージ。  
AWS CDK（TypeScript）で `packages/api` の Lambda + API Gateway と、`packages/web` のフロントエンドを S3 + CloudFront にまとめてデプロイする。

## 技術スタック

| 分類 | 内容 |
|---|---|
| 言語 | TypeScript |
| IaC フレームワーク | AWS CDK v2（`aws-cdk-lib`） |
| ビルドツール | `tsc`（`npm run build`） |
| デプロイ先リージョン | `ap-northeast-1` |

## ディレクトリ構成

```
packages/cdk/
├── bin/
│   └── cdk.ts               # CDK アプリのエントリポイント（env 設定済み）
├── lib/
│   └── cdk-stack.ts         # スタック定義（全リソース）
├── cdk.json                 # CDK ツールキット設定
├── tsconfig.json
└── package.json
```

## デプロイされるリソース

### VPC・ネットワーク

| リソース | 内容 |
|---|---|
| VPC | `vpc-0aa26b319b8286781`（既存インポート） |
| Lambda 用 SG（`LambdaSg`） | アウトバウンド全許可 |
| Aurora SG へのインバウンドルール | Lambda SG → Aurora SG（`sg-0ae9bbe6a88477d97`）TCP 3306 |
| CloudWatch Logs VPC Endpoint | Interface 型、subnet × 2 に配置 |

### Cognito (ユーザー認証)

| リソース | 内容 |
|---|---|
| User Pool (`JavaEatsUserPool`) | `javaeats-user-pool` (セルフサインアップ、Username・Email 認証、RemovalPolicy: DESTROY) |
| User Pool Client (`JavaEatsUserPoolClient`) | `JavaEatsUserPoolClient` (SRP認証対応) |

### Lambda関数（item-service / order-service）

| プロパティ | 値 |
|---|---|
| ランタイム | Java 21 |
| ハンドラ | `org.springframework.cloud.function.adapter.aws.FunctionInvoker` |
| タイムアウト | 30秒 |
| メモリ | 512MB |
| SnapStart | **無効化中**（初期化失敗の切り分けのため。安定後に再有効化予定） |
| エイリアス | `live` |
| VPC | `vpc-0aa26b319b8286781` |
| Subnet | `subnet-0a5539df09716c9f7`、`subnet-0a53ffdb75738bbb4` |
| SG | `LambdaSg` |

#### デプロイ対象の Spring Cloud Function 一覧

| 関数論理ID | 定義名 (`SPRING_CLOUD_FUNCTION_DEFINITION`) | 所属サービス / JAR パス |
|---|---|---|
| `listItemsFunc` | `listItems` | item-service / `../api/item-service/target/item-service-0.0.1-SNAPSHOT.jar` |
| `getItemFunc` | `getItem` | item-service / `../api/item-service/target/item-service-0.0.1-SNAPSHOT.jar` |
| `listCategoriesFunc` | `listCategories` | item-service / `../api/item-service/target/item-service-0.0.1-SNAPSHOT.jar` |
| `createOrderFunc` | `createOrder` | order-service / `../api/order-service/target/order-service-0.0.1-SNAPSHOT.jar` |

Lambda 共通環境変数：

| 変数名 | 値 |
|---|---|
| `SPRING_CLOUD_FUNCTION_DEFINITION` | 各定義名（上記参照） |
| `SPRING_DATASOURCE_URL` | `jdbc:mysql://shared.cluster-c1ygeeuiuvel.ap-northeast-1.rds.amazonaws.com:3306/db` |
| `SPRING_DATASOURCE_USERNAME` | `dbadmin` |
| `SPRING_DATASOURCE_PASSWORD` | （設定済み・実験段階） |
| `SPRING_SQL_INIT_MODE` | `always`（起動毎に DROP→CREATE→データ投入） |

### API Gateway（RestApi）

| プロパティ | 値 |
|---|---|
| ステージ名 | `api` |
| エンドポイント種別 | REGIONAL |
| CORS | ALL_ORIGINS / ALL_METHODS / DEFAULT_HEADERS |
| CloudWatch ログ | 有効 |
| オーソライザー | `JavaEatsAuthorizer` (Cognito User Pool 連動) |

#### ルーティング・マッピング

| メソッド | パス | 認証 | ターゲット Lambda |
|---|---|---|---|
| GET | `/item/list` | **Cognito 必須** | itemListFunction（`listItems`） |
| GET | `/item/category` | **Cognito 必須** | itemCategoryFunction（`listCategories`） |
| GET | `/item/{id}` | **Cognito 必須** | itemGetFunction（`getItem`） |
| POST | `/order` | **Cognito 必須** | createOrderFunction（`createOrder`） |

#### CDK スタックのリファクタリング（保守性・拡張性の向上）

CDKスタックの肥大化・冗長化を防ぐため、以下の2つの工夫を取り入れています。
1. **`createSpringLambda` ヘルパーによるカプセル化**:
   - Lambda関数の作成と Alias (`live`) の登録、環境変数の設定をヘルパー化。定義名と対象 JAR のパスを渡すだけで論理 ID が一貫して自動生成されるように設計。
2. **`routes` 配列による宣言的API定義**:
   - リソースの作成（`getOrCreateResource` パス解決ヘルパー）と Cognito 認証付きメソッドの登録をループ処理に集約。新規 API は `routes` 配列に 1 行追加するだけでデプロイ可能です。

### S3 バケット

- React ビルド成果物のホスティング用
- パブリックアクセスブロック（CloudFront OAC 経由のみアクセス）
- `RemovalPolicy.DESTROY` + `autoDeleteObjects: true`

### CloudFront Distribution

| ビヘイビア | オリジン | プロトコル | キャッシュ |
|---|---|---|---|
| `/*`（デフォルト） | S3 バケット（OAC） | HTTPS リダイレクト | 無効 |
| `api/*` | API Gateway | HTTPS のみ | 無効 |

- `defaultRootObject: index.html`
- SPA のエラードキュメント: `index.html`
- デプロイ後に `Hosting URL` として CloudFront ドメイン名を出力

### BucketDeployment (動的ビルド ＆ 動的環境変数配置)

SPAデプロイを最適化するため、以下の2つの処理をデプロイ時に自動実行します。
1. **コンテナによる React の自動ビルド (Bundling)**
   - `node:20-alpine` コンテナをデプロイ時に起動し、`packages/web` のソースコードから `npm ci && npm run build` をクリーンビルドします。事前ビルドは不要です。
2. **`env-config.js` の動的生成と直接配置**
   - CDKトークン問題（ビルド時に実際のCognito IDが未確定である問題）を回避するため、デプロイ時に確定した `userPoolId` と `userPoolClientId` を書き込んだ `env-config.js` ファイルを動的に生成し、S3へ直接配置します。
   - React側はこのスクリプトを `index.html` でロードし、`window._env_` からCognito設定値を動的に適用してAmplifyを初期化します。

## 主要コマンド

```bash
cd packages/cdk

# 型チェック
npx tsc --noEmit

# CloudFormation テンプレートをプレビュー（デプロイなし）
npx cdk synth

# デプロイ済みスタックとの差分確認
npx cdk diff

# デプロイ（ビルドからデプロイまでをコンテナで自動実行）
npx cdk deploy
```

## デプロイ前の準備

```bash
# 1. バックエンドのビルド
cd packages/api && ./mvnw package -DskipTests

# 2. CDK デプロイ (フロントエンドのビルドと環境変数反映はCDKがコンテナで自動実行します)
cd packages/cdk && npx cdk deploy
```

## .env ファイルの管理

DB 接続情報は `packages/cdk/.env` で管理しています。このファイルは `.gitignore` に含まれているためコミットされません。

### 初回セットアップ（コンテナ再作成時など）

```bash
cp packages/cdk/.env.example packages/cdk/.env
# .env を開いて実際の値を設定する
```

### .env のフォーマット

```
DB_URL=jdbc:mysql://<cluster-endpoint>:3306/<database-name>
DB_USERNAME=<master-username>
DB_PASSWORD=<master-password>
```

`.env` が存在しない状態で `cdk deploy` / `cdk diff` / `cdk synth` を実行するとエラーになります。  
実際の接続情報は担当者に確認してください。

## 注意点

- **`cdk destroy` と VPC ENI**: Lambda を VPC 内に配置しているため、`cdk destroy` 時に ENI 削除が20分以上詰まることがある。通常の開発では `cdk destroy` を使わず `cdk deploy` で上書きすること。どうしても必要な場合は CloudFormation コンソールで該当リソースを「スキップ」して強制完了させる。
- **`bin/cdk.ts` の `env` 設定**: `Vpc.fromLookup` を使うために `CDK_DEFAULT_ACCOUNT` / `CDK_DEFAULT_REGION` を設定済み。削除しないこと。
- **DB 認証情報**: 現在は Lambda 環境変数に平文で設定（実験段階）。本番運用時は Secrets Manager への移行を検討すること。
- **SnapStart**: 現在無効化中。Aurora 接続が安定したら再度有効化を検討する。
- **CloudFront の `api/*` パス**: CloudFront から API Gateway へのオリジンパス is 空文字（`''`）のため、`/api/item/list` → API Gateway は `/api/item/list` として受け取る。API Gateway のリソースパスと一致させること。
- **SPA の環境変数（CDK Token 問題）**: React側はビルド時環境変数ではなく、S3に直接デプロイされる `/env-config.js` を実行時に読み込んでAmplifyのCognito設定を動的に行います。環境変数の変更は `cdk-stack.ts` の `s3deploy.Source.data` 設定を通じて実施します。

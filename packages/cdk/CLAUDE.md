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

### Lambda（item-service）

| プロパティ | 値 |
|---|---|
| ランタイム | Java 21 |
| ハンドラ | `org.springframework.cloud.function.adapter.aws.FunctionInvoker` |
| JAR | `../api/item-service/target/item-service-0.0.1-SNAPSHOT.jar` |
| タイムアウト | 30秒 |
| メモリ | 512MB |
| SnapStart | **無効化中**（初期化失敗の切り分けのため。安定後に再有効化予定） |
| エイリアス | `live` |
| VPC | `vpc-0aa26b319b8286781` |
| Subnet | `subnet-0a5539df09716c9f7`、`subnet-0a53ffdb75738bbb4` |
| SG | `LambdaSg` |

Lambda 環境変数：

| 変数名 | 値 |
|---|---|
| `SPRING_CLOUD_FUNCTION_DEFINITION` | `listItems` |
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

| メソッド | パス | Lambda |
|---|---|---|
| GET | `/item/list` | itemListFunction（`listItems`） |

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

### BucketDeployment

`packages/web/build/` の成果物を S3 にアップロードし、CloudFront キャッシュを自動パージする。`memoryLimit: 512`（デフォルト 128MB ではメモリ不足になるため）。

## 主要コマンド

```bash
cd packages/cdk

# 型チェック
npx tsc --noEmit

# CloudFormation テンプレートをプレビュー（デプロイなし）
npx cdk synth

# デプロイ済みスタックとの差分確認
npx cdk diff

# デプロイ（事前に packages/api と packages/web のビルドが必要）
npx cdk deploy
```

## デプロイ前の準備

```bash
# 1. バックエンドのビルド
cd packages/api && ./mvnw package -DskipTests

# 2. フロントエンドのビルド
cd packages/web && npm run build

# 3. CDK デプロイ
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
- **CloudFront の `api/*` パス**: CloudFront から API Gateway へのオリジンパスは空文字（`''`）のため、`/api/item/list` → API Gateway は `/api/item/list` として受け取る。API Gateway のリソースパスと一致させること。
- **BucketDeployment の前提**: `cdk deploy` 実行時に `../web/build/` が存在しないとデプロイが失敗する。必ずフロントエンドのビルドを先に行うこと。

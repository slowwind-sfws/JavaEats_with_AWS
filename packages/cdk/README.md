# packages/cdk — AWS CDK デプロイパッケージ

`JavaEats_with_AWS` モノレポの本番デプロイを担当するパッケージ。  
AWS CDK（TypeScript）で Lambda・API Gateway・S3・CloudFront・VPC を一括定義・デプロイする。

詳細な設計・注意点は [CLAUDE.md](./CLAUDE.md) を参照してください。

## デプロイされるリソース

- **VPC**（既存インポート）+ **セキュリティグループ**（Lambda 用）+ **CloudWatch Logs VPC Endpoint**
- **Lambda**（`item-service`）: Spring Cloud Function で実装した商品一覧 API、VPC 内 private subnet に配置
- **API Gateway**（RestApi）: `/item/list` エンドポイント、CORS 設定済み
- **S3 バケット**: React ビルド成果物ホスティング（CloudFront OAC 経由のみ）
- **CloudFront Distribution**: S3（フロントエンド）+ API Gateway（`api/*`）をまとめて配信
- **BucketDeployment**: `packages/web/build/` を S3 へ自動アップロード

## Aurora Serverless V2 接続

Lambda から Aurora Serverless V2 に直接接続（VPC 内プライベートネットワーク経由）。

| 項目 | 値 |
|---|---|
| エンドポイント | `shared.cluster-c1ygeeuiuvel.ap-northeast-1.rds.amazonaws.com` |
| ポート | 3306 |
| DB名 | `db` |
| 初期化 | 起動毎に `schema.sql` / `data.sql` を実行（実験段階） |

## コマンド

```bash
cd packages/cdk

# 型チェック
npx tsc --noEmit

# テンプレートプレビュー
npx cdk synth

# 差分確認
npx cdk diff

# デプロイ
npx cdk deploy
```

## デプロイ前の準備

```bash
# バックエンドビルド
cd packages/api && ./mvnw package -DskipTests

# フロントエンドビルド
cd packages/web && npm run build

# デプロイ
cd packages/cdk && npx cdk deploy
```

## .env ファイルの準備

DB 接続情報は `packages/cdk/.env`（`.gitignore` 対象）で管理しています。  
初回または環境再構築時に以下を実行してください：

```bash
cp packages/cdk/.env.example packages/cdk/.env
# .env を開いて実際の値を設定する
```

`.env` が存在しない状態で `cdk deploy` を実行するとエラーになります。

## 注意

- `cdk destroy` は Lambda VPC ENI 削除で長時間詰まることがある。通常は `cdk deploy` で上書きすること。
- DB 認証情報は現在 `.env` 経由で Lambda 環境変数に設定（実験段階）。本番運用時は Secrets Manager への移行を検討。

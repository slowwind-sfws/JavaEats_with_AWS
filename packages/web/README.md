# packages/web — フロントエンド

JavaEats のフロントエンド SPA。React + TypeScript で実装し、`packages/api` の REST API を呼び出す。  
デザインは Thymeleaf 版（`springboot-food-delivery-system`）のレイアウトをトレースしている。

## 技術スタック

| 分類 | 内容 |
|---|---|
| 言語 | TypeScript 4.9.5 |
| UI フレームワーク | React 19 |
| ルーティング | React Router DOM 7 |
| 認証 | AWS Amplify v6 + `@aws-amplify/ui-react`（`<Authenticator>` コンポーネント） |
| ビルドツール | Create React App（react-scripts 5.0.1） |
| スタイル | 素の CSS3 |
| ローカル開発 | React 開発サーバー（port 3000）+ API プロキシ |

## ディレクトリ構成

```
packages/web/
├── public/
│   ├── index.html
│   └── images/                      # 商品画像（静的配信）
├── src/
│   ├── index.tsx                    # React エントリポイント
│   ├── index.css                    # グローバルスタイル
│   ├── App.tsx                      # Amplify.configure + <Authenticator> でラップ、初回ログイン後の自動ユーザー登録
│   ├── route.tsx                    # ルート定義
│   ├── setupProxy.js                # CRA プロキシ設定（Cognito CORS 回避）
│   └── components/
│       ├── Header.tsx               # 共通ヘッダー（showMyPage props でマイページリンクを制御）
│       ├── DefaultPage.tsx          # 商品一覧ページ
│       ├── ItemDetailPage.tsx       # 商品詳細・注文入力ページ
│       ├── OrderConfirmPage.tsx     # 注文確認ページ
│       ├── OrderCompletePage.tsx    # 注文完了ページ
│       └── UserProfilePage.tsx      # マイページ（プロフィール編集・注文履歴・退会）
└── package.json
```

## セットアップ（初回・DB リセット後）

> **重要:** `item-service` の `sql.init.mode` は `never` に設定されています。  
> ローカル MySQL にテーブルとデータが存在しない状態では API が動作しません。  
> 初回セットアップ時、または DB をリセットしたい場合は以下のコマンドを手動で実行してください。

```bash
# ローカルインフラ（MySQL + Floci）起動
cd localstack && docker compose up -d

# スキーマと初期データを MySQL に流し込む（初回 or リセット時のみ）
docker exec -i localstack-mysql-1 mysql -u user -ppassword db \
  < packages/api/item-service/src/main/resources/schema.sql
docker exec -i localstack-mysql-1 mysql -u user -ppassword db \
  < packages/api/item-service/src/main/resources/data.sql

# バックエンド API ビルド・起動（別ターミナル）
cd packages/api
./mvnw package -DskipTests
sam local start-api -t template.local.yaml -p 8080 --docker-network sam-network
```

## 起動

```bash
cd packages/web
npm start
# → http://localhost:3000
```

未認証時は Amplify UI の `<Authenticator>` により自動的にサインイン画面が表示されます。  
サインイン成功後、`App.tsx` が `POST /user/register` を呼び出して DB にユーザーレコードを自動登録します（`INSERT IGNORE` により既存ユーザーは上書きされません）。

## 画面構成

| パス | 内容 | 状態 |
|---|---|---|
| `/` | 商品一覧（検索・カテゴリフィルター・マイページ・ログアウト） | 実装済み |
| `/item/:id` | 商品詳細・注文入力（プロフィールから住所自動補完） | 実装済み |
| `/order/confirm` | 注文確認（POST /order 呼び出し） | 実装済み |
| `/order/complete` | 注文完了 | 実装済み |
| `/user/profile` | マイページ（プロフィール編集・注文履歴・退会） | 実装済み |

## ビルド

```bash
npm run build
# → build/ に本番用成果物が生成される
```

## デプロイ

本番環境へのデプロイは `packages/cdk/` の AWS CDK スタックで行います。  
Amplify の Cognito 接続設定や API のエンドポイントは、CDK の BucketDeployment 時に動的生成される `/env-config.js` を経由して実行時に適用されます。

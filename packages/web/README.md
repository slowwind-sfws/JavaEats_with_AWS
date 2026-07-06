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
│   └── images/          # 商品画像（静的配信）
├── src/
│   ├── index.tsx        # React エントリポイント
│   ├── index.css        # グローバルスタイル
│   ├── App.tsx          # Amplify.configure + <Authenticator> でラップ
│   ├── route.tsx        # ルート定義
│   ├── setupProxy.js    # CRA プロキシ設定（Cognito CORS 回避）
│   └── components/
│       ├── DefaultPage.tsx      # 商品一覧ページ
│       ├── ItemDetailPage.tsx   # 商品詳細・注文入力ページ
│       ├── OrderConfirmPage.tsx # 注文確認ページ
│       └── OrderCompletePage.tsx # 注文完了ページ
└── package.json
```

## セットアップ

バックエンド API（`packages/api`）・MySQL・Floci（`localstack/docker-compose.yml`）が起動済みであることが前提です。

```bash
# ローカルインフラ（MySQL + Floci）起動
cd localstack && docker compose up -d

# バックエンド API 起動（別ターミナル）
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

## 画面構成

| パス | 内容 | 状態 |
|---|---|---|
| `/` | 商品一覧（検索・カテゴリフィルター・ログアウトボタン） | 実装済み |
| `/item/:id` | 商品詳細・注文入力（数量・住所入力、金額計算、確認画面へ遷移） | 実装済み |
| `/order/confirm` | 注文確認（注文内容表示、POST /order 呼び出し、修正へ戻る） | 実装済み |
| `/order/complete` | 注文完了 | 実装済み |
| `/user/...` | ユーザー登録・マイページ | 未実装 |

※ 未認証時は、Amplify UI の `<Authenticator>` により自動的にサインイン画面が表示されます。

## ビルド

```bash
npm run build
# → build/ に本番用成果物が生成される
```

## デプロイ

本番環境へのデプロイは `packages/cdk/` の AWS CDK スタックで行います。  
Amplify の Cognito 接続設定や API のエンドポイントは、CDK の BucketDeployment 時に動的生成される `/env-config.js` を経由して実行時に適用されます。

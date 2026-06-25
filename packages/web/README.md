# packages/web — フロントエンド

JavaEats のフロントエンド SPA。React + TypeScript で実装し、`packages/api` の REST API を呼び出す。  
デザインは Thymeleaf 版（`springboot-food-delivery-system`）のレイアウトをトレースしている。

## 技術スタック

| 分類 | 内容 |
|---|---|
| 言語 | TypeScript 4.9.5 |
| UI フレームワーク | React 19 |
| ルーティング | React Router DOM 7 |
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
│   ├── App.tsx          # RouterProvider マウント
│   ├── route.tsx        # ルート定義
│   └── components/
│       └── DefaultPage.tsx   # 商品一覧ページ
└── package.json
```

## セットアップ

バックエンド API（`packages/api`）と MySQL（`local/docker-compose.yml`）が起動済みであることが前提です。

```bash
# ローカルインフラ起動
cd local && docker compose up -d

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
| `/` | 商品一覧（検索・カテゴリフィルター付き） | 実装済み |
| `/order/input/{id}` | 注文入力 | 未実装 |
| `/user/...` | ユーザー登録・マイページ | 未実装 |

## ビルド

```bash
npm run build
# → build/ に本番用成果物が生成される
```

## デプロイ

本番環境へのデプロイは `packages/cdk/` の AWS CDK スタックで行います（将来追加）。  
環境変数 `REACT_APP_API_BASE` で API のベース URL を指定します。

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
│   ├── App.tsx          # RouterProvider マウント（AuthProvider でラップ）
│   ├── route.tsx        # ルート定義
│   ├── setupProxy.js    # CRA プロキシ設定（Cognito CORS 回避）
│   ├── components/
│   │   ├── DefaultPage.tsx   # 商品一覧ページ（認証ガード付き）
│   │   └── LoginPage.tsx     # ログイン画面
│   ├── contexts/
│   │   └── AuthContext.tsx   # 認証状態管理
│   └── services/
│       └── authService.ts    # Cognito API 呼び出し
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
| `/login` | ログイン（Cognito 認証） | 実装済み |
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

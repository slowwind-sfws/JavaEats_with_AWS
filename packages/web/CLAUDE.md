# CLAUDE.md — packages/web

## パッケージの役割

モノレポ `JavaEats_with_AWS` のフロントエンドパッケージ。  
React + TypeScript で SPA を実装し、`packages/api` が提供する REST API を呼び出す。  
デザインは `springboot-food-delivery-system`（Thymeleaf 版）のレイアウトをトレースしている。

## 技術スタック

| 分類 | 内容 |
|---|---|
| 言語 | TypeScript 4.9.5 |
| UI フレームワーク | React 19 |
| ルーティング | React Router DOM 7 |
| ビルドツール | Create React App（react-scripts 5.0.1） |
| スタイル | 素の CSS3（`src/index.css`） |
| ローカル開発 | React 開発サーバー（port 3000）+ API プロキシ |

## ディレクトリ構成

```
packages/web/
├── public/
│   ├── index.html                   # エントリポイント HTML
│   └── images/                      # 商品画像（静的配信）
├── src/
│   ├── index.tsx                    # React エントリポイント（StrictMode なし）
│   ├── index.css                    # グローバルスタイル（参照リポジトリのCSSをトレース）
│   ├── App.tsx                      # RouterProvider マウント
│   ├── route.tsx                    # ルート定義
│   └── components/
│       └── DefaultPage.tsx          # 商品一覧ページ（/ にマッピング）
└── package.json
```

## 画面構成

| パス | コンポーネント | 状態 |
|---|---|---|
| `/` | `DefaultPage` | 実装済み（商品一覧・検索・カテゴリフィルター） |
| `/order/input/{id}` | — | 未実装 |
| `/user/...` | — | 未実装 |

## API 呼び出し

開発時は `package.json` の `"proxy": "http://localhost:8080"` により、React 開発サーバーが API リクエストを SAM local（port 8080）へ転送する。

| エンドポイント | 用途 |
|---|---|
| `GET /item/category` | カテゴリ一覧取得（起動時に1回） |
| `GET /item/list` | 商品一覧取得（起動時 + 検索時） |
| `GET /item/list?keyword=xxx` | キーワード検索 |
| `GET /item/list?categoryId=n` | カテゴリフィルター |

本番環境では環境変数 `REACT_APP_API_BASE` で API のベース URL を指定する。

## 主要コマンド

```bash
cd packages/web

# 開発サーバー起動（port 3000）
npm start

# 本番ビルド生成
npm run build

# 型チェック
npx tsc --noEmit

# テスト実行
npm test
```

## ローカル開発の注意点

- **React.StrictMode は無効化している。** SAM local は並行リクエストを処理できないため、StrictMode が `useEffect` を2回実行すると Internal Server Error が発生する。本番環境では問題ない。
- **初期化は直列実行。** `/item/category` → `/item/list` の順で `await` して直列に呼び出す。並列 fetch は SAM local の制約により500エラーになる。
- **`AbortController` でクリーンアップ。** `useEffect` のクリーンアップ関数でリクエストをキャンセルし、アンマウント時の不要な state 更新を防ぐ。
- **VSCode TypeScript Language Server の設定。** モノレポ構成のため `.vscode/settings.json` に `"typescript.tsdk": "packages/web/node_modules/typescript/lib"` を設定済み。

## 画像ファイルの扱い

現在の商品画像は `public/images/` に静的ファイルとして格納している。  
`npm run build` 時に `build/images/` へコピーされ、S3 + CloudFront にそのままデプロイできる。  
将来的に店舗が画像をアップロードする機能を追加する場合は、S3 バケット（別管理）への移行が必要になる。

## デプロイ

本番環境へのデプロイは `packages/cdk/` の AWS CDK スタックで行います（将来追加）。  
ビルド成果物は `build/` ディレクトリに生成される。

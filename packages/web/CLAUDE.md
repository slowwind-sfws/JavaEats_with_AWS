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
│   ├── App.tsx                      # RouterProvider マウント（AuthProvider でラップ）
│   ├── route.tsx                    # ルート定義
│   ├── setupProxy.js                # CRA プロキシ設定（Cognito CORS 回避）
│   ├── components/
│   │   ├── DefaultPage.tsx          # 商品一覧ページ（/ にマッピング、認証ガード付き）
│   │   └── LoginPage.tsx            # ログイン画面（/login にマッピング）
│   ├── contexts/
│   │   └── AuthContext.tsx          # 認証状態グローバル管理（isLoggedIn, signIn, signOut）
│   └── services/
│       └── authService.ts           # Cognito API 呼び出し（fetch ベース、Amplify 不使用）
└── package.json
```

## 画面構成

| パス | コンポーネント | 状態 |
|---|---|---|
| `/` | `DefaultPage` | 実装済み（商品一覧・検索・カテゴリフィルター・ログアウトボタン） |
| `/login` | `LoginPage` | 実装済み（Cognito 認証） |
| `/order/input/{id}` | — | 未実装 |
| `/user/...` | — | 未実装 |

## 認証フロー（Cognito）

AWS Amplify を使わず、ブラウザ標準の `fetch` API で Cognito の JSON-RPC API を直接呼び出す。  
ローカルでは Floci（Cognito エミュレータ）を使用し、本番環境ではエンドポイント URL を切り替えるだけで動作する。

```
ブラウザ → /cognito/* → React 開発サーバー（setupProxy.js） → Floci :4566
```

CORS を回避するため、`setupProxy.js` で `/cognito` パスを Floci にプロキシしている。  
`authService.ts` がサインイン成功後に `localStorage` へ `id_token` / `access_token` / `refresh_token` を保存し、  
以降の API リクエストは `Authorization: Bearer <id_token>` ヘッダーを付与する。

### 環境変数（`.env.development`）

| 変数名 | 説明 |
|---|---|
| `REACT_APP_COGNITO_ENDPOINT` | Cognito エンドポイント（開発時は `/cognito`） |
| `REACT_APP_COGNITO_CLIENT_ID` | Cognito アプリクライアント ID |
| `REACT_APP_COGNITO_USER_POOL_ID` | Cognito ユーザープール ID |

### ローカルダミーユーザーの作成

```bash
# 1. ユーザー作成
aws --endpoint-url=http://localhost:4566 cognito-idp admin-create-user \
  --user-pool-id <USER_POOL_ID> \
  --username testuser \
  --temporary-password "Temp1234!" \
  --region ap-northeast-1

# 2. FORCE_CHANGE_PASSWORD を解除（CONFIRMED 状態にする）
aws --endpoint-url=http://localhost:4566 cognito-idp admin-set-user-password \
  --user-pool-id <USER_POOL_ID> \
  --username testuser \
  --password "Password1234!" \
  --permanent \
  --region ap-northeast-1
```

## API 呼び出し

開発時は `package.json` の `"proxy": "http://localhost:8080"` により、React 開発サーバーが API リクエストを SAM local（port 8080）へ転送する。  
ログイン後のすべてのリクエストには `Authorization: Bearer <id_token>` ヘッダーが付与される。

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
- **Cognito CORS 回避。** ブラウザから `localhost:4566` に直接リクエストすると CORS エラーになる。`setupProxy.js` で `/cognito` を Floci にプロキシすることで回避している。開発サーバー再起動時に `setupProxy.js` が自動で読み込まれる。
- **`AuthContext` の初期値。** `useState(AuthService.isLoggedIn())` で初回レンダリング時に `localStorage` から状態を同期的に読み込む。`useEffect` による非同期初期化では、未ログイン状態で一瞬レンダリングされてリダイレクトが発生するため使わない。

## 画像ファイルの扱い

現在の商品画像は `public/images/` に静的ファイルとして格納している。  
`npm run build` 時に `build/images/` へコピーされ、S3 + CloudFront にそのままデプロイできる。  
将来的に店舗が画像をアップロードする機能を追加する場合は、S3 バケット（別管理）への移行が必要になる。

## デプロイ

本番環境へのデプロイは `packages/cdk/` の AWS CDK スタックで行う。  
`BucketDeployment` が `build/` の成果物を S3 にアップロードし、CloudFront キャッシュを自動パージする。  
詳細は [packages/cdk/CLAUDE.md](../cdk/CLAUDE.md) を参照。

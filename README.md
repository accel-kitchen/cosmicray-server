# Cosmic Ray Server

宇宙線測定データの収集・管理・可視化を行うWebアプリケーションです。

## プロジェクト構成

```
cosmicray-server/
├── webserver/          # Node.js バックエンドサーバー
│   ├── server.js       # メインサーバーファイル
│   ├── package.json    # 依存関係とスクリプト
│   ├── users.json      # ユーザー情報（自動生成）
│   └── setup-user.js   # 初期ユーザー設定スクリプト
├── cosmicray-viewer/   # フロントエンド
│   ├── index.html      # メインビューアー
│   ├── app.js          # JavaScript アプリケーション
│   ├── style.css       # スタイルシート
│   └── admin/          # 管理者パネル
└── cosmicray-data/     # 測定データ保存ディレクトリ（自動生成）
```

## 機能

### バックエンド (Node.js + Express)
- **ユーザー認証**: JWT トークンベースの認証システム
- **データ収集**: 宇宙線測定器からのデータアップロード API
- **データ管理**: ID別のデータファイル管理
- **管理者機能**: ユーザー管理、データ監視
- **API エンドポイント**: RESTful API でデータアクセス

### フロントエンド
- **データビューアー**: インタラクティブなデータ可視化
- **地図表示**: 測定地点の地理的可視化
- **ファイル管理**: データファイルのブラウズとダウンロード
- **統計表示**: データの統計情報と分布グラフ
- **管理者パネル**: ユーザー管理インターフェース

## セットアップ

### 1. 依存関係のインストール

```bash
cd webserver
npm install
```

### 2. 初期管理者ユーザーの作成

```bash
node setup-user.js
```
管理者アカウント（ID: `root`）が作成されます。

### 3. サーバーの起動

```bash
# 本番環境
npm start

# 開発環境（自動再起動）
npm run dev
```

サーバーは `http://localhost:3000` で起動します。

## 使用方法

### データビューアー
1. ブラウザで `http://localhost:3000/viewer` にアクセス
2. 測定IDを選択してデータを確認
3. 地図上で測定地点を確認
4. データファイルを選択して詳細分析

### 管理者パネル
1. `http://localhost:3000/viewer/admin` にアクセス
2. 管理者アカウントでログイン
3. ユーザー管理、データ監視

### API エンドポイント

#### 認証
- `POST /auth/login` - ログイン
- `POST /auth/register` - ユーザー登録
- `GET /auth/verify` - トークン検証

#### データ管理
- `POST /upload-data/:id` - データアップロード
- `GET /latest-data/:id` - 最新データ取得
- `GET /api/files/:id` - ファイル一覧取得
- `GET /api/data/:id/:filename` - データファイル取得

#### 管理者機能
- `GET /admin/users` - ユーザー一覧
- `POST /admin/users` - ユーザー作成
- `PUT /admin/users/:id` - ユーザー更新
- `DELETE /admin/users/:id` - ユーザー削除

## データ形式

### 測定データ
```
ADC値\tタイムスタンプ\t電圧\tデッドタイム
```

### 設定ファイル (config.json)
```json
{
  "id": "測定ID",
  "comment": "説明",
  "gps_latitude": 緯度,
  "gps_longitude": 経度,
  "created_at": "作成日時",
  "server_setup_at": "サーバー設定日時"
}
```

## セキュリティ

- JWT トークンによる認証
- bcrypt によるパスワードハッシュ化
- ユーザーは自分のデータのみアクセス可能
- 管理者による全体管理

## 開発者向け情報

### 技術スタック
- **バックエンド**: Node.js, Express, JWT, bcrypt
- **フロントエンド**: HTML5, Bootstrap 5, Chart.js, Leaflet
- **データ形式**: JSON, TSV

### 環境変数
- `JWT_SECRET`: JWT署名用秘密鍵（本番環境では必須）
- `PORT`: サーバーポート（デフォルト: 3000）

## ライセンス

このプロジェクトは研究・教育目的で開発されています。
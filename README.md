# ハイクちゃんとおしゃべり

中学生の明るい女の子「ハイクちゃん」と日本語で雑談できる、一般公開向けのチャットボットです。LINE 風の画面で、AI のキャラクターと気軽におしゃべりできます。

## 主な機能

- LINE 風の吹き出し画面（スマホ表示を優先）
- 返答のストリーミング表示
- スタンプ（ユーザーもハイクちゃんも送れる）
- 1 日の回数制限（ブラウザごとに 50 回、IP ごとに 200 回。日本時間 0 時にリセット）
- 未成年のキャラクターとしての安全ルール（恋愛・性的な話題や危険な行為には応じない、深刻な悩みには相談窓口を案内する、など）

会話の内容は保存しません。ページをリロードすると会話は消えます。MongoDB に保存するのは回数のカウントだけで、IP アドレスはハッシュ化しています。

## 技術構成

| 分類 | 採用技術 |
| --- | --- |
| フレームワーク | Next.js 16（App Router）、React 19、TypeScript |
| スタイル | Tailwind CSS v4 |
| AI | Claude API（`@anthropic-ai/sdk`） |
| データベース | MongoDB Atlas（回数のカウントのみ） |
| テスト | Vitest |
| 公開先 | Google Cloud Run（Docker コンテナ） |

## ローカルでの起動

Node.js 24 で動作を確認しています。

```bash
npm install
cp .env.example .env.local
```

`.env.local` に次の環境変数を設定します。このファイルは git に含めません。

| 名前 | 用途 |
| --- | --- |
| `ANTHROPIC_API_KEY` | Claude API キー |
| `MONGODB_URI` | MongoDB Atlas の接続文字列 |
| `IP_HASH_SALT` | IP アドレスをハッシュ化するためのソルト（長いランダムな文字列） |
| `DAILY_LIMIT` | ブラウザごとの 1 日の上限（省略すると 50） |

開発サーバーを起動して、http://localhost:3000 を開きます。

```bash
npm run dev
```

同じネットワークのスマホから試すときは、次のコマンドで起動して、PC の IP アドレスの 3000 番ポートを開きます。

```bash
npm run dev -- -H 0.0.0.0
```

## テストと確認

```bash
npm test        # 回数制限、日付計算、入力検証、スタンプのテスト
npm run lint    # Lint
npm run build   # 本番ビルド
```

## デプロイ

`Dockerfile` で standalone 出力のコンテナを作り、8080 番ポートで待ち受けます。秘密情報はイメージに入れず、実行時に環境変数として渡します。

## 仕様

詳しい仕様と開発のルールは [CLAUDE.md](./CLAUDE.md) を、作業の計画は [TODO.md](./TODO.md) を見てください。

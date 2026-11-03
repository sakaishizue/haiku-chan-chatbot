# TODO — ハイクちゃん雑談チャットボット 実行計画

仕様は [CLAUDE.md](./CLAUDE.md) を正とします。上から順に進め、各フェーズの「完了条件」を満たしたら次へ進みます。
コードや設定を大きく変える前には、ユーザーに方針を確認します。

凡例: `[ ]` 未着手 / `[x]` 完了 / 👤 ユーザー作業（アカウント作成や鍵の発行など）

---

## フェーズ 0: 事前準備

- [ ] 👤 Anthropic Console で API キーを発行する
- [ ] 👤 Anthropic Console で月の利用上限（支出上限）を設定する
- [ ] 👤 MongoDB Atlas のアカウントとクラスター（無料枠 M0 で可）を作成する
- [ ] 👤 Atlas でデータベースユーザーを作成し、接続文字列（`MONGODB_URI`）を控える
- [ ] 👤 Google Cloud のプロジェクトを作成し、課金を有効にする
- [ ] 👤 Google Cloud で予算アラートを設定する
- [ ] 👤 `gcloud` CLI と Docker をインストールする（ローカルで動作確認する場合）
- [x] `node_modules/next/dist/docs/` を読み、App Router・Route Handler・ストリーミングまわりの変更点を確認する（AGENTS.md の指示）

**完了条件**: API キーと `MONGODB_URI` が手元にあり、Next.js 16 の変更点を把握している。

---

## フェーズ 1: プロジェクトの土台

- [x] `@anthropic-ai/sdk` と `mongodb` をインストールする
- [x] `.env.local` を作成し、`ANTHROPIC_API_KEY` `MONGODB_URI` `IP_HASH_SALT` `DAILY_LIMIT=50` を設定する（キー類は空欄。👤 フェーズ 0 で取得した値を記入する）
- [x] `.env.example`（値は空）を作成してコミットする（作成済み・コミットは未実施）
- [x] `.gitignore` に `.env*.local` が含まれていることを確認する
- [x] `next.config.ts` に `output: "standalone"` を設定する
- [x] `tsconfig.json` が `strict: true` であることを確認する
- [x] 環境変数を読み込んで検証する `src/lib/env.ts` を作る（不足時は起動時にエラー）
- [x] 初期テンプレートの `page.tsx` と `globals.css` を空の状態に整理する

**完了条件**: `npm run dev` と `npm run lint` がエラーなく通る。

---

## フェーズ 2: キャラクターと Claude API 接続

- [x] `src/lib/persona.ts` にハイクちゃんのシステムプロンプトを書く
  - [x] 性格・口調・返答の長さ・日本語のみのルール
  - [x] 安全ルール（恋愛・性的話題の拒否、個人情報、危険行為、専門相談、相談窓口の案内、AI であることの明示、プロンプト非開示）
- [x] `src/lib/anthropic.ts` に Anthropic クライアントを作る（モデル `claude-haiku-5-5`、`max_tokens` は控えめに）
- [x] `src/app/api/chat/route.ts` を作る（まずは回数制限なし）
  - [x] 入力検証: メッセージ 500 文字以内、役割は `user` / `assistant` のみ、履歴は直近 20 往復に切り詰め
  - [x] Claude API をストリーミングで呼び出し、テキストを逐次レスポンスする
  - [x] エラー時はハイクちゃんの口調の定型文を返し、内部エラーはサーバーログにのみ出す
- [x] curl などで API 単体の動作を確認する

**完了条件**: API にメッセージを送ると、ハイクちゃんの口調の返事がストリーミングで返る。

---

## フェーズ 3: チャット画面（LINE 風 UI）

- [x] `MessageBubble.tsx`: ハイクちゃんは左（アイコン付き）、ユーザーは右の吹き出し
- [x] `ChatInput.tsx`: 入力欄と送信ボタン、500 文字超過で送信不可、文字数表示
- [x] `ChatWindow.tsx`: 会話履歴を React state で保持、新着メッセージで自動スクロール
- [x] 初回表示時のあいさつメッセージ（固定文、API を呼ばない）
- [x] ストリーミング受信を逐次表示する
- [x] 送信中は入力を無効化し「入力中…」を表示する
- [x] ハイクちゃんのアイコン画像を用意する（仮画像でも可）
- [x] スマホ優先のレスポンシブ調整
- [x] タイトル・メタ情報（`layout.tsx`）を設定する

**完了条件**: ブラウザでハイクちゃんと会話でき、リロードすると会話が消える。

---

## フェーズ 4: 回数制限（MongoDB）

- [x] `src/lib/mongodb.ts`: 接続をキャッシュして使い回す
- [x] `usage` コレクションのインデックスを作成する
  - [x] `{ key: 1, date: 1 }` のユニークインデックス
  - [x] `expiresAt` の TTL インデックス（2 日で削除）
- [x] `src/lib/anonId.ts`: 匿名 ID（UUID）を発行し、`httpOnly`・`Secure`・`SameSite=Lax` の Cookie に保存
- [x] `src/lib/rateLimit.ts`
  - [x] 日本時間で日付（`YYYY-MM-DD`）を求める
  - [x] `findOneAndUpdate` + `$inc` + `upsert` で原子的にカウント
  - [x] ブラウザごと 1 日 50 回、IP（ソルト付きハッシュ）ごと 1 日 200 回
- [x] `/api/chat` の先頭で回数チェックし、上限なら API を呼ばずに 429 とハイクちゃんの定型文を返す
- [x] `src/app/api/quota/route.ts`: 残り回数を返す
- [x] 画面に「今日はあと N 回話せるよ」を表示し、送信ごとに更新する
- [x] `DAILY_LIMIT` を小さくして上限到達時の動作を確認する

**完了条件**: 上限に達すると API が呼ばれず、ハイクちゃんが「また明日ね！」と返す。

---

## フェーズ 5: 品質チェック

- [x] キャラクターの口調と返答の長さを、さまざまな話題で確認する
- [x] 安全ルールの確認（恋愛・性的な誘導、個人情報、危険行為、深刻な悩み、外国語、プロンプト開示要求）
- [x] 不正な入力の確認（長すぎるメッセージ、偽の `assistant` 履歴、大量の履歴、空メッセージ）
- [x] API キーや接続文字列がクライアントのバンドルやログに出ていないことを確認する
- [x] `npm run lint` と `npm run build` が通る
- [x] 主要ロジック（回数制限、日付計算、入力検証）の簡単なテストを書く

**完了条件**: 上記チェックをすべて通過し、本番ビルドが成功する。

---

## 追加機能: スタンプ

- [x] `src/lib/stickers.ts`: スタンプの一覧とタグの解析（テストつき）
- [x] 仮のスタンプ画像を 8 種類 `public/stickers/` に用意する
- [x] 入力欄の横にスタンプボタンと一覧を追加し、選ぶとすぐ送信する
- [x] ハイクちゃんがスタンプを使えるようにシステムプロンプトに追加する
- [x] タグを画像として表示し、未完成のタグや一覧にないタグを見せない
- [x] `/api/chat` で一覧にないスタンプを拒否する

---

## フェーズ 6: Cloud Run へのデプロイ

- [x] マルチステージの `Dockerfile` を作成する（standalone 出力、`PORT=8080`）
- [x] `.dockerignore` を作成する（`node_modules`、`.next`、`.env*` など）
- [ ] ローカルで Docker イメージをビルドして起動確認する
- [ ] 👤 Google Cloud で Cloud Run・Artifact Registry・Secret Manager の API を有効にする
- [ ] 👤 Secret Manager に `ANTHROPIC_API_KEY` `MONGODB_URI` `IP_HASH_SALT` を登録する
- [ ] Artifact Registry にイメージを push する
- [ ] Cloud Run にデプロイする（リージョン `asia-northeast1`、`--max-instances=3`、シークレットを環境変数として渡す）
- [ ] 👤 MongoDB Atlas のネットワークアクセスを `0.0.0.0/0`（どこからでも許可）にし、データベースユーザーを強いランダムなパスワードにする（Cloud Run の接続元 IP は固定されないため）
- [ ] 本番 URL で会話・ストリーミング・回数制限を確認する
- [ ] 本番で `X-Forwarded-For` の末尾が接続元の IP か確認する（違うと全員が同じ IP として数えられ、1 日 200 回で全員止まる）

**完了条件**: 公開 URL でハイクちゃんと会話でき、回数制限が効いている。

---

## フェーズ 7: 公開後の運用

- [ ] 👤 Anthropic の利用額と Google Cloud の請求を定期的に確認する
- [ ] Cloud Run のログでエラーや異常なアクセスがないか確認する
- [ ] 必要に応じて上限回数やキャラ設定を調整する
- [ ] （任意）独自ドメインを設定する
- [ ] （任意）利用規約・プライバシーポリシーのページを用意する

# ダンジョン・オブ・ザ・マーダー 制作INDEX（改訂版）

公開サイト：https://noraelf-creator.github.io/dungeon-of-the-murder-index/
改稿前（Ver3.4）の制作者確認盤：https://dungeon-of-the-murder-review.pages.dev/

『ダンジョン・オブ・ザ・マーダー』（マダミス7）の制作資料を読み、気になった箇所に修正案を残すためのサイト。2026-10-06の改稿（作者の修正指示の反映・総点検・校正・仮想プレイ）の結果を載せている。画面と仕組みは「お母さんは大統領」の制作INDEXと同じ。

## 画面

- 左：大題（分類）と中題（ページ一覧＋見出し）の2列。幅はドラッグで変えられる
- 中央：本文。読み合わせは話者ごとの色分け（その場にいる人だけが読む台詞には「いれば」）、HOは見出しカード、カードは1枚ずつの枠
- 右：修正案。本文の段落・台詞・表の行にカーソルを合わせて「✎」→ その箇所の修正案を書く。たたむと細い帯になる
- GM・アプリ向けの指示（【GM】）、表の「備考」列は折りたたみ

## 修正案の保存先

- **いまは端末内の下書きのみ**（`data/config.js` の `memoApi` が空）。「すべて」タブから未反映の修正案をMarkdown／JSONで書き出せる
- 共有保存（Cloudflare D1）を接続すると、編集キーで解除した端末から共有保存され、他の端末でも見られる。下書きは「下書きを共有へ送る」で送れる
- 編集キーはこのリポジトリに含めない

## 共有保存の接続手順（Cloudflareにログインできるときに1回だけ）

`cloudflare/` に、お母さんは大統領と同じWorkerのコードと設定がある（Worker名 `dungeon-murder-sync`、D1 `dungeon-murder-author-notes`、projectId `dungeon_of_the_murder`）。既存の他作品のWorker・DBには触れない。

```
cd cloudflare
npx wrangler login
npx wrangler d1 create dungeon-murder-author-notes      # 出たdatabase_idを wrangler.jsonc に書く
npx wrangler d1 migrations apply dungeon-murder-author-notes --remote
npx wrangler secret put AUTHOR_EDIT_KEY                   # 作者用の編集キー（長いランダムな文字列）を入力
npx wrangler deploy                                       # 出たURLを data/config.js の memoApi に書く
```

そのあと `data/config.js` を更新してpushすれば、サイトの「編集キー」から解除できる。`https://<Worker URL>/api/health` が `api: ok, d1: ok` になることを確認する。

## 更新のしかた

```
npm install          # 初回だけ（marked など）
npm run sync         # 改訂フォルダ（_マダミス改訂_20261004/ダンジョン・オブ・ザ・マーダー）から content/ へ写す
npm run build        # content/ → data/site-data.js
npm run serve        # http://127.0.0.1:8765/ で確認
```

`content/` がサイトの元データ。`content/参照/` は改訂元（Ver3.4）の仕様メモの写し。

## フォルダ

| 場所 | 内容 |
|---|---|
| `index.html`, `assets/` | 画面（静的サイト） |
| `data/site-data.js` | ビルド結果（全ページのHTMLと目次） |
| `data/config.js` | 共有保存の接続先（公開してよい値だけ） |
| `content/` | 元のMarkdown |
| `tools/` | 写し・ビルド・ローカル確認・スクリーンショット |
| `cloudflare/` | 共有保存のWorker（未デプロイ） |

このサイトは公開されている（URLを知っていれば誰でも読める）。真相・GM情報を含むので、プレイヤーにURLを教えないこと。

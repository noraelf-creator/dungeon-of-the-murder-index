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

- 閲覧は誰でも可。作者用の編集キーで解除すると、Cloudflare D1 に共有保存される（Worker `dungeon-murder-sync`、D1 `dungeon-murder-author-notes`、projectId `dungeon_of_the_murder`。この作品専用で、他作品のWorker・DBとは別）
- 解除していない間は、端末のブラウザーに下書きとして残る（あとで「下書きを共有へ送る」）
- 「すべて」タブから未反映の修正案をMarkdown／JSONで書き出せる
- 編集キーはこのリポジトリに含めない（Worker Secret `AUTHOR_EDIT_KEY`。控えは改訂フォルダの `.private/`）

## Workerの更新・確認

```
cd cloudflare
npx wrangler deploy                                       # Workerのコードを直したとき
npx wrangler secret put AUTHOR_EDIT_KEY                   # 編集キーを変えるとき
```

`https://dungeon-murder-sync.noraelf-mta-review.workers.dev/api/health` が `api: ok, d1: ok` を返せば正常。

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
| `cloudflare/` | 共有保存のWorker（デプロイ済み） |

このサイトは公開されている（URLを知っていれば誰でも読める）。真相・GM情報を含むので、プレイヤーにURLを教えないこと。

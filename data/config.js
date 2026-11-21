// 公開してよい設定だけを書く。作者キーやその他の秘密はここに書かない。
window.SITE_CONFIG = {
  projectId: 'dungeon_of_the_murder',
  // 共有保存（Cloudflare Worker dungeon-murder-sync、D1 dungeon-murder-author-notes）
  memoApi: 'https://dungeon-murder-sync.noraelf-mta-review.workers.dev',
  pagePrefix: 'rv1-',
  legacySessionKey: 'dom-index:dungeon_of_the_murder:session',
  // 改訂前（Ver3.4）の制作者確認盤
  v2Url: 'https://dungeon-of-the-murder-review.pages.dev/',
  // 右に並べる「ゲームの実際の画面」（media/gameview-next・build の page.shots / gameview.unitShots）を全ページで出さない。
  // 2026-11-18 作者の指示「右に実際の画面をつける仕様は無くしてください。基本は本文が見えればいいです」。
  // 仕組み（撮影・manifest・build のデータ）は消さずに、ここだけで止める。true に戻すと元どおり右に出る。
  showGameShots: false
};

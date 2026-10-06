// 公開してよい設定だけを書く。作者キーやその他の秘密はここに書かない。
window.SITE_CONFIG = {
  projectId: 'dungeon_of_the_murder',
  // 共有保存（Cloudflare Worker dungeon-murder-sync、D1 dungeon-murder-author-notes）
  memoApi: 'https://dungeon-murder-sync.noraelf-mta-review.workers.dev',
  pagePrefix: 'rv1-',
  legacySessionKey: 'dom-index:dungeon_of_the_murder:session',
  // 改訂前（Ver3.4）の制作者確認盤
  v2Url: 'https://dungeon-of-the-murder-review.pages.dev/'
};

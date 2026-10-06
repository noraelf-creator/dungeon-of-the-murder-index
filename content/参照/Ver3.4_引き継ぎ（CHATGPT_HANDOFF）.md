# ダンジョン・オブ・ザ・マーダー — 最新引き継ぎ
更新：2026-09-28／Ver.3.4＋制作者確認盤・Cloudflare制作メモ同期。正本はsrc。履歴ではなく現在の仕様。

## 現在の実装・今回の変更
333/333テスト成功、build・Cloudflare deploy成功。ゲームと独立したdist/review.htmlを追加。PC4＋NPC1、P1〜P12、27部屋、77カード、全48経路、推理導線・証拠マトリクス・LS・アイテム・技能・功績・結果を169ページ／16大カテゴリから確認可能。
今回、既存ゲームのsrc/data.js／engine.js／app.js／board.js／styles.css／theme.css／index.htmlは既存Ver3.4 ZIPとSHA256完全一致。原稿・効果・数値・公開条件・進行は不変。

## 制作者向けシナリオ総合確認盤
- 公開URL：https://dungeon-of-the-murder-review.pages.dev/ 。ローカル成果物：dist/review.html（本文・CSS・JS内包、クラウドAPIは同一オリジンのみ）。HTTP起動確認済み。file://はアプリ内ブラウザのURLポリシーで開けず、直接起動の実画面確認は未実施。埋込スクリプト構文・実行は自動検証。
- 左固定・折りたたみサイドバー＋右本文。検索でPC／部屋／カード／フェイズへ直接アクセス。URL hashでページ保持。本文と制作者解説を分離し、秘密・真相は隠さない。
- 内訳：概要1、PC4、NPC1、フェイズ12、ダンジョン3、部屋27、カードフィルタ12、カード本文77、推理導線13、LS12（一覧＋11種）、アイテム1、技能1、功績1、結果1、制作管理3。
- 本文はdata.js、条件と結果はengine.js、要約はboard.jsを直接参照。ビルド時に正本を埋め込む。review専用データには導線・マトリクス評価・取り逃し耐久・制作解説だけを追加。本文を二重管理しない。
- 全27部屋SVG＋全48接続一覧。ノード・カードの発見場所から部屋へ移動。全カードに取得条件・owners想定・PRIVATE/MULTI・共有用途・真相軸・代替説明。
- 古代／現代／再生／エルディン／ガルド／レオン／完全排除／名前／鏡構造／77×7マトリクス／取り逃し／ミスリード／証拠ABC。◎○△は制作評価で、ゲーム条件や点数ではない。
- LSは既存engineを保存と無関係な新規検証状態で呼び、PC選択・全共有・武器・戦況優位を比較。HP/MP/功績・消失品・結果文を表示。初期HP/MP・装備なし・4人参加の基準例であり、実セーブ再現機能ではない。
- 全169ページのメモ＋3チェックをCloudflare D1 review_notesへ保存。project_id=dungeon-of-the-murder固定、既存page_idを維持。閲覧公開、編集だけキー認証。ゲーム保存には非接続。
- 800ms自動保存。初回・ページ変更・フォーカス／表示／オンライン復帰・20秒毎・手動で同期。localStorageはreviewCloud:dungeon-of-the-murder:キャッシュ／下書き／端末名のみ。未同期下書きは保持・再試行。競合409で他端末の本文を表示し、採用／上書きを明示選択。旧reviewMemoは消去せずJSON移行可（既存クラウドメモはスキップ）。
- 現行差分：P10各PC1回、武器完成flags.weapon、L3《一度だけ使われた剣》は武器完成時取得、全室thresholdsは空。時期本文P6以前とB=2、調査8回と全深度12、U1→U11のunlock表示文などは「未解決事項」に記録し本体不変。

## ゲーム本体の現在のUI（維持）
濃紺・シアン・薄金、細い発光枠、半透明パネル。表示専用src/theme.css。
- タイトル／キャラ選択：集合絵、ロゴ風英題、段階表示、PCカラー、SELECTED／SELECTED BY PLAYER。4人が揃うと1.8秒のPARTY COMPLETE。次へは従来通り全員選択が条件（演出で進行を強制停止しない）。
- HUD：公開情報・薄い立ち絵、HP／MPゲージ、低HP赤、行動不能の暗転。MP最大0のガルドは空ゲージ。本人操作は最右端のサイドパネルを維持。
- レオン：救出状態への変化でPARTY MEMBER JOINED／LEON。NPC / COMPANION表記とゲージ。初回ロード時から救出済みなら加入演出を再生しない。
- フェイズ英字見出し、帰還EXPLORATION COMPLETE、LSの色・枠・文字を統一。成否は既存日本語の結果を維持し、不成立／退避を成功と誤表示しない。
- マップ：現在地・未知・探索可能・選択・ロックの枠／発光を強化。選択先へつながる既知の線を強調。通常通路の不要な矢印を除去。現行データに明示oneWay属性はないため矢印なし（発見方向を一方通行とは解釈しない）。固定座標は現行維持。
- 通常情報欄の最上部に「公開情報ボードを開く」を常設。情報親が閉でも入口は残る。P10/P11と決戦前会議にも入口追加。
- ボード：4列（中幅3／2・小画面1）、本文時3／2列。0.26秒開閉。再描画時は経過時間を引き継ぐため検索・ピンで入場演出を繰り返さない。
- スキル：顔→英名＋和名→役職SAINT等→種別→ACTIVATE→最大の和文技能名→SKILL ACTIVATE。0.2秒間隔中心、合計2秒。効果の追加・変更なし。

## 公開情報ボード
- 通常情報欄上部／P10・P11／決戦前会議／ヘッダーの入口から大きなオーバーレイ。閉じる／Escで元へ戻る。開閉はフェイズ・HP・タイマー・探索選択を変更しない。タイマーは進み続ける。
- 一覧：レスポンシブグリッド、タイトル・場所・分類・1行要約。本文は右詳細パネル（小画面は重ね表示）。
- マップ：発見済みの地図だけ、共有件数、部屋クリックでその場所のSHARED。探索先は変更しない。未知の遠方部屋・未共有カードの存在は出さない。
- 時系列：共有済みカード本文の時期だけを表示。P4は摂取／台帳、P6以前は投与推定、P6〜P9は症状記録。P9は「突然始まった症状ではない」のみ。死亡時期等をカード以上に断定せず、未共有イベントを補完しない。
- ピン留め：☆／★はパーティ共通。通常SHARED、一覧、本文、時系列から操作できる。ピンモードは★だけ。
- 人物／場所／事件／攻略フィルタ、タイトル／場所／要約検索。関連カードジャンプは非実装。
- 名前フェイズではSHAREDかつancientのカードだけ。ピン変更も不可、閲覧専用。PRIVATE/MULTIはボードへ一切出さない。管理者ONでもボードは同じ公開条件。
- モード・検索・部屋・開いた本文はタブ個人UI。ピンだけ保存へ反映。本文と所有権を二重管理しない。

## 現在の画面・ゲームフロー
- 上段：4PC＋P4救助後レオン。公開ステータス・能力・功績・位置・スキル・立ち絵のみ。本人操作なし。
- 左：フェイズ説明／探索RESULT／マップ／探索操作。右：独立した情報欄。
- 最右端：本人専用／ログの横並びタブ。本人専用は目標／所持品／HO／スキル。本人枠だけの収納はなく、サイド全体の収納と「画面を伏せる」を維持。
- ログ：個別上／公開下、固定高・それぞれ内部スクロール。幅320px（中幅300px）、収納時44px。1100px以下は初期収納、700px以下はオーバーレイ。
- 情報：親とPRIVATE／MULTI／SHAREDを独立開閉。各カードは初期閉、タイトル／場所／状態を残す。開閉は再描画で閉じる。
- 部屋クリックは既存の探索先選択も維持しつつSHAREDを開いて場所で絞る。共有なし案内、全件ボタンあり。未共有カードの存在は漏らさない。
- ロビーでPC予約（再クリック解除）→全4人→HO・支給品・準備確認→P1開始。HO目安10分だけでは開始しない。
- 探索準備は無期限、全4人提出後探索。帰還RESULTは全4人の「次へ」で共有へ。共有は参加可能者全員の確認または最大10分で進行。
- LSは対象PC名＋立ち絵の2.2秒カットイン、補助設定→選択肢1クリック即回答→一斉結果。人数は成功条件のみ、現在の選択人数は非表示。
- P1〜P12、27部屋・77情報、事件・証拠・P10現行1回調査・P11投票・P12名前・完全排除条件は現行維持。

## 実装済みの重要仕様・データ
- localStorage gameState:<partyId>、sessionStorage partyId／madamis7-viewerPcId／madamis7-tabToken。Web Locks排他と本人タブ寿命ロックあり。
- sidePanelMode=personal/logsはsessionStorageだけ。sharedRoomフィルタもUI内のみ。ゲーム共有状態を増やさない。
- 保存version=3.1、interfaceVersion=3.4、新規uiRevision=correction。旧保存は削除しない。
- rooms：UNKNOWN→REVEALED→VISITED→PARTIAL→CLEARED。未知の遠方部屋をプレイヤーDOMへ入れない。管理者ONのみ全体表示。
- cards：status LOCKED/PRIVATE/SHARED、owner/owners/privateSources。保存PRIVATEは未共有、表示分類はinfoKind。通常探索は1人所有でもMULTI、専用情報は本人だけ。
- カード場所はD.roomsのcards/card配置からUI索引を構成。固定解放イベント2件のみ既存engineの地点に対応付け。事件調査は調査区分名、場所未記録の技能・イベントはその旨を表示。本文や取得履歴の二重管理はしない。未訪問の正式部屋名は伏せる。
- マップの共有件数・フィルタはstatus=SHAREDだけ。探索済み判定とは別。
- explorationRoundに開始plans・eligible・known・noteStart・hp・取得eventsを記録し、returnViewで本人向け投影。同室専用情報はPC IDだけの存在描写でカード名・本文なし。別室には通知しない。
- 同室拾得は現在の器用順、同値PC順。通常工程・秘密区画の品に適用。技能／品バフ／装備込み、罠専用precisionは除外。配布・譲渡等は対象外。実受取人がowner=originalFinder。
- privateNotesに本人取得・使用・受領・MP・HP変化。公開logsへ一般使用先・譲渡履歴・専用通知を追加しない。
- 技能2秒／匿名回復1.2秒の演出。LS結果は文章→HP/MP/功績の前後差分、実消失品、戦況・公開状態。効果計算は変更なし。
- ガルド秘密HO／工作は本人だけ。投与P4救出時、推理途中P6以前。《事故痕の違和感》は弱めた固定文＋偽装あり追加分析。

## 新しい表示データ・スキル演出
- src/board.js：77件summary、簡易分類、時系列メタデータ。原稿から作成し、元の本文より強い結論・未判明の名・偽装断定を追加しない。data.jsの原文を置換しない。
- publicBoardPins：ゲーム保存内のカードID配列（旧保存では欠落可・空扱い）。既存Web Locksと保存同期を利用。ピン操作はSHARED確認を必須とし、証拠値・公開条件を変更しない。
- presentationEvents：有効期間内の技能イベント、最大32件。id／startedAt／until／type／actor／keyのみ。対象者なし。既存presentationは匿名回復を含め維持。
- UI_TIMING.skillMs=2000。顔アップ→英名＋日本語名→役職→種別→ACTIVATE→技能名→SKILL ACTIVATE。PC別色、控えめな単発発光、prefers-reduced-motion対応。
- 各タブで短いイベント待ち行列を持つ。m7-seen-skills:<partyId>（sessionStorage、時刻＋id、最大256件）で重複抑止。再描画は経過時刻から続行し、再読込で既再生イベントを最初から再生しない。
- 技能の対象はカットインに含めず、本人・使用者の既存privateNotesだけ。LSカットイン・締切・技能効果は変更しない。

## 検証
npm test：333成功／失敗0／スキップ0。既存281件＋review40件＋cloud12件。全ページ・全リンク・本文・取得索引・各LS81通り・メモ保存／隔離／保存失敗・単独ビルド検証。
npm run build：成功。従来dist/index.htmlに加え、自己完結dist/review.htmlを生成。
今回ブラウザ：review概要、ミレイユ／ガルド／レオン、P4/P8/P10、U2/L2/L10、マップ、全カード、古代／現代導線、マトリクス、LS一覧／結果比較、メモ入力／再読込／一覧／コピー内容、カード→部屋・マップ→部屋を確認。エラー0。検証メモは空欄へ戻した。証跡docs/verification/review-*.png。ユーザーのゲーム操作なし。
ゲーム本体の既存ブラウザ検証：localhost:4176、専用パーティQ4FT-LL、1920×1080。
通常操作で新規作成→4PC選択→全員参加演出→HO・支給品・準備→P1→P2の西ルート探索→帰還まで確認。大広間と未知2方向、開示と新しい未知、選択枠、帰還の取得情報を確認。
以降は既存board-test-save.jsonを管理者復旧した検証用P7（SHARED25枚）。管理者OFFで公開ボード4モード、情報欄上部入口、ピン、通常画面復帰、5人HUD・低HP色を確認。自然なP1〜P12通し監査ではない。
治癒の役職入り連続文字を撮影。使用後MP12→11・対象HP5→11を確認。LSは管理者からP3型を検証用P7で再実行、参加者・必要人数・選択画面と時間切れC退避結果（HP-1）を確認。ブラウザエラー0。
証跡docs/verification/design-*.png：タイトル、キャラ選択、4人完了、HO、通常探索、HUD、地図、帰還、通常SHARED、ボード一覧／地図／時系列／ピン、技能、LS／結果。

## クラウド制作メモの構成・今回の検証
公開： https://dungeon-of-the-murder-review.pages.dev/ 。Pages同名プロジェクト／main。cloud-distはreview専用、ゲームは公開しない。
Worker：cloudflare/worker.mjs（Pages advanced mode _worker.js）。D1：dungeon-of-the-murder-review、binding DB、ID e5f1e880-4614-4243-9da5-65c7f23d3fb9。table review_notes、複合主キーproject_id/page_id、note/content_checked/text_fixed/testplay_needed/updated_at/updated_by。
API：GET /api/review/status、GET /api/review/notes、GET/PUT /api/review/notes/:pageId、POST /api/review/auth、POST /api/review/logout。
Secret名REVIEW_EDIT_KEY。ランダム生成済み、値は記載しない。30日HttpOnly/Secure/SameSite=Strict署名cookie、キー自体はフロント保存なし。更新時期は原子的比較更新し、無言上書きを防止。最大50,000文字。
通信断は最終キャッシュ表示＋下書き保持。初回取得前や再読込後のオフラインは編集不可。サイト自体のオフラインキャッシュなし。同期対象は制作メモのみ。
本番独立HTTPクライアントA/BでU2／P8のメモ・チェック双方向確認、未認証401・競合409成功。実ブラウザで編集認証→入力→チェック→保存→再読込→一覧→コピーを確認。検証メモは空欄へ復旧。docs/verification/review-cloud-memos.png。実機2台でのブラウザ確認は未実施。
再配置：npm test、npm run build、npm run deploy:review。同じPages/D1を使い続ける。初回マイグレーション適用済み。詳細はdocs/REVIEW_CLOUD.md。
未解決：共有キー方式で個別権限・履歴・自動マージなし、独自試行回数制限なし、実機2台の最終確認待ち。本文は引き続き閲覧専用。次の判断：共同制作者へのURL／編集キー配布範囲、実機テスト実施。

## 今回の変更ファイル
src/review.html/css/data.js/app.js、src/review-cloud.js、cloudflare/worker.mjs・page-ids.json・migrations/0001_notes.sql、wrangler.toml、scripts/build-review.js・build-cloud.js・provision-review-key.js・test-review-live.js、tests/review.test.js・review-cloud.test.js、package.json、docs/REVIEW_CLOUD.md、README.md、TEST_REPORT.md、本書、dist/review.html、cloud-dist。
docs/verification/review-*.png。dist/index.html再ビルド（ゲームソース不変）。元画像／package3.4.0／sourcesは変更なし。

## 未実装・制約・次の判断
- ゲーム本体は別端末ネットワーク同期・認証なし。同一オリジンの同一ブラウザ4タブ用。制作メモのみ今回クラウド同期。JS・保存データは秘密を含み開発者ツールへの防御境界ではない。
- 4175は別プロジェクトが使用中、本作4176。旧オリジンの保存を自動移行・消去しない。必要なら書出／復旧。
- レオン独立位置は未記録。同伴PC位置、遺体発見後は現場、それ以外は同行なしと表示。死亡確認はbodyFound後。
- file://同期はブラウザ依存。localhost推奨。休止・切断したタブは、有効期間を過ぎた演出を後から再生しない。オンライン別端末への配信ではない。
- 未記録の過去取得場所や旧保存の帰還詳細を推測復元しない。
- 集合絵は既存の白背景入り素材を維持。タイトルの背景だけを暗色化。新画像の生成・背景除去は行っていない。
- 地図の固定座標は現行維持。接続を変えない範囲で全27部屋の線交差をさらに減らす調整は今後の視覚監査対象。
- 地図は横・縦スクロールあり。全27部屋の混雑、実機小画面、人間テストプレイ、ネイティブ共有送信、P1〜P12実ブラウザ通しは未完了。
- 次工程：P1〜P12プレイヤー視点最終監査。テスプ前の大規模システム／数値変更はしない。

## 成果物
今回の制作者用同梱ZIP：C:/00_【創作】一時フォルダ/DUNGEON_OF_THE_MURDER_Ver3.4_REVIEW_CLOUD.zip
既存ゲームZIPは変更しない：C:/00_【創作】一時フォルダ/DUNGEON_OF_THE_MURDER_Ver3.4.zip
着手前保全：C:/00_【創作】一時フォルダ/before-Ver3.4-design-unification.zip
ゲーム：http://localhost:4176/ （サーバー停止後はREADMEの起動手順）
制作者確認盤：https://dungeon-of-the-murder-review.pages.dev/
編集キーは別ファイル：C:/00_【創作】一時フォルダ/DUNGEON_REVIEW_EDIT_KEY_PRIVATE.txt（公開・ZIP同梱禁止）。



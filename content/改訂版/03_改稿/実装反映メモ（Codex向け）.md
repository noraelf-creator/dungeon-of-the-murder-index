# 実装反映メモ（Codex／ChatGPT向け）

> 今回はゲームのソースを書き換えていない（元ファイル不変の原則）。改稿版をゲームに入れるときの差分一覧。
> 対象：Ver3.4（src/data.js・src/engine.js・src/app.js）。作業前に必ずバックアップ。

## 1. data.js（本文・定義）

| 項目 | 変更 |
|---|---|
| `manuscript.rooms` | 27部屋の公開文を `カード/01_部屋公開文.md` に差し替え |
| `manuscript.cards` | 全カード本文を `カード/02〜08` に差し替え。`info()` 側の古いtitle/textは削除して二重定義をなくす（INFO-E-SCENE1〜3、INFO-X-CONNECTION、INFO-E-LEDGER、INFO-E-MOTIVE） |
| `INFO-W-U4` | タイトル「冷却水路」→「水門の操作」 |
| `INFO-X-CONNECTION` | タイトル「魔力解析」→「黒金色の魔力反応」 |
| U7 step1 items | `potion` → `mana` |
| 新カード | INFO-P3-A/B/C、INFO-P6-A、INFO-P7-LEON、INFO-P9-B、INFO-P9-C、REC-U2/U5/U6/U8/U9/L1/L2/L8/L10。証拠値：INFO-P3-A は `{C:'C-B'}`（台帳と同じ系統、二重計上しない） |
| 新しい品 | guardCoin（警備兵の銀貨30）、silverCup（騎士の銀杯40）、jeweledGuard（宝石付きの鍔50）、crownShard（宝冠の欠片60） |
| `skills` | `enhanceAtk`・`enhanceInt` を統合し `enhance`（攻撃+1・頭脳+1、MP2）。`attack` の説明を差し替え |
| `characters[1].skills` | `['attack','enhance','analyze']` |
| `liveSelections` | P1（新規）、P3・P6・P9（三択に差し替え）、部屋LSを部屋ごとの定義に（`ROOM_U1` など18種） |
| `events` | P1・P4・P6・P7・P8・P9・P10・真相・名前の各本文を読み合わせR01〜R21に差し替え。`galdHO` を追加HO②に、`galdP9`（追加HO③）を新設 |
| `manuscript.ho` | 4PCのHOを一人称版（HO①）に差し替え。追加HO（ミレイユ②・ヴィオラ②・リュシア②）を新設 |
| `goals.PC2` | 任意目標「守護核の欠片」を追記 |
| `topology` | U4→U7、U5→U7 に `unlock:'P3崩落後'`（新フラグ `rescueRouteOpen`） |
| `phases[6]` | P6に探索を追加（speed 1） |
| `timers` | `secretTalk:300`（密談5分）、`tutorialLS:30` |

## 2. engine.js（進行）

| 項目 | 変更 |
|---|---|
| `routeOpen` | U7への経路は `s.flags.rescueRouteOpen` が真のときだけ開く。P3の分断LSの結果処理で真にする |
| `intro`（P1） | 回避カットイン→`startLS(s,'P1',ids,'tutorial')`→結果の後にR02→`beginPhase(2)` |
| `lsRequirements` | P1：A＝攻撃合計6、B＝2人。P3：A＝2人、B＝攻撃合計5。P6：A＝2人または攻撃合計8。P9：A＝2人。部屋LSは定義表どおり。**「攻撃合計」型の条件を新設**（選んだPCの `stat(atk)` 合計＋攻撃魔法使用者は+3） |
| `resolveLS`（P3/P6/P9） | 退避なし。選択肢ごとに組を作り `s.splitGroups={A:[...],B:[...],C:[...]}` を保存。時間切れは最少人数の組へ（同数C→B→A）＋HP−1。行動不能者は最多人数の組へ |
| P6のレオン | 最少人数の組（0人の組は除く）。同数はHP合計の低い組、さらに同数ならC→B→A。`s.leon.companionGroup` に保存 |
| P9のC | 選択時に「追跡者の名」「殺害者の名」を受け取る。候補は `nameCandidates` を流用＋愛称「ヴァン」（PC3、またはREC-U2/U8所持者のみ）。判定は結果表どおり |
| P9のD | 表示上は `choices[PC4]='B'`。同じB組に他PCがいれば、その帰還メモに「ガルドの姿が一時見えなくなった」 |
| 密談 | `stage='secretTalk'`（300秒）。組ごとに表示を分ける。共有（SHARED化）は不可 |
| P4 | `beginPhase(4)` の自動救出の前に `stage='rescueScene'`（R07）。全体共有（`share`）を探索前に1回挟む |
| P6 | `intro`でLSを始めず、`meeting`→`selection`→探索→帰還→窮地→分断LS |
| P7 | 開始時、`companionGroup` のPCにだけR12とINFO-P7-LEONを表示 |
| P10 | `investigate` で `target` に部屋IDも受け付け、`investigateRoom` を呼ぶ（追跡者の衝突判定なし） |
| 部屋LS | `D.rooms[id].ls` に部屋固有のLS IDを設定。報酬（品・記録片・功績・追跡者位置）は定義表どおり |
| ガルドの回復薬保護 | 既存の「P4前は最後の1本を使えない」をそのまま使う（仕込み瓶だから使わない、という設定に一致） |
| P4の投与 | 既存の `potion.used=true` を維持。ログは「薬棚の回復薬をレオンに飲ませた」 |

## 2-2. 仮想プレイ後の修正（Phase 6）

| No | 変更 |
|---|---|
| F1 | 分断LSで一人だけの組（レオンもいない）は `secretTalk` の代わりに `soloScene`（120秒）：独白表示＋「その場を調べる」1回（R24の表）。新カード INFO-P3-B2・INFO-P9-B2 |
| F2 | `skill('diagnose'|'analyze')` で INFO-E-DIAGNOSIS／CONTAMINATION を与えたとき、`s.investigation.body<3` なら `s.investigation.body=3` |
| F3 | 新カード INFO-E-BOTTLE（`{C:'C-B'}`）。U7を maxDepth 3 にし、深度3を `{stat:'dex',need:4,cards:['INFO-E-BOTTLE']}`。`investigations.ledger` を max 2・`['INFO-E-LEDGER','INFO-E-BOTTLE']` に。INFO-E-LEDGER が LOCKED でなければ、ledger 調査の開始深度を1にする（BOTTLEから） |
| F4 | P6分断の結果に、レオンの行き先と理由を表示 |
| F5 | P4救出の後、公開ログに入室順と薬棚の位置を記録 |
| F6 | P9のC：選択肢名に補足。「分からない」（追跡者の名）のダメージをHP−1に |
| F7 | P10開始時、INFO-N-ELDIN が未取得なら助け舟を表示 |
| F8 | `nameCandidates` に「ディン（愛称）」（PC3在籍、または REC-U2／REC-U8／INFO-P3-B のいずれかが取得済み）。3票で選ばれたら1回だけ未確定のまま続行（`s.namePhase.nicknameUsed=true`）、2回目は役職回答と同じ扱い |
| F9 | 記録片のタイトルに【物語】。公開情報ボードの分類「物語」 |
| F10 | P10の画面に専門判定の助け舟 |
| F12 | 証拠C-D（素材の出所）は、主偽装の素材をガルド以外のPCも採取していた場合（探索履歴・分断LSの調査）には数えない。現場の追加分析（INFO-E-FORGED）の判定は従来どおり |

## 3. app.js（表示）

- チュートリアル表示文（`ルール/ライブセレクション（プレイヤー向け説明）.md`）。
- 密談画面（組の仲間の名前と、組のカードだけを表示）。
- P9 Cの名前選択UI（2つのプルダウン）。
- 公開情報ボードに分類【物語】（記録片）を追加。
- 共通HOの任務文を `HO/00_共通HO.md` に差し替え。

## 4. テストで確かめること（追加）

1. P2・P3で救難所に入れない。P3の分断後に入れる。
2. P3で4人がA2・B1・C1に割れたとき、B（ガルド1人）が成功する。
3. P6でレオンが最少人数の組に入る。同数時の規則。
4. P9でDを選んだガルドが他PCにBと表示される。
5. P10で部屋を探索でき、追跡者と衝突しない。
6. 魔力強化で攻撃・頭脳が両方+1。
7. 攻撃魔法の「攻撃合計+3」がP1のAに効く。

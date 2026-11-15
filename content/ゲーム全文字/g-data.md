# ゲームの全文字：データの文言（1/10）（fb478cf）

:::note このページについて
ゲームの画面に出る文字を、コードから機械的に抜いて並べたもの。**原稿の本文ではない**（原稿は左の「HO」「読み合わせ」「カード」など）。**作者が足す文（サイトの別レイヤー）とも別**で、ここは読むだけ。
- このページ：**200 件**（1 / 10）／場面 `data`
- 出典：`git show fb478cf:<file>`。文字は1字も変えていない
- **この文字は `fb478cf` のゲームの記録**です。そのあと作者が P3・P6・P9 のライブセレクションの文言や部屋LSを直したので、**この中の選択肢の文が、いまの正とは違うことがあります**（いまの正：[今の状態の「場面LSの文言」](#/n-now)、[部屋LS 早見表](#/n-room-ls-map)）。原稿を取り込み直したゲームから採り直すと、ここも新しくなります。
- 先に「本文」を出す。画面の条件によって変わる組み立て（差し込みの型）は、下の「条件によって変わる表示・技術資料（参考）」にたたんである（開くと原文のまま見える）
- 出典の行・ID・連結式（テンプレート）は、各件の「出典」を開くと見える（本文の見える文字と分けてある）
:::

<!--vis:make-->

## 1. 本文（200 件）

**1**　見出し

LEON

<details class="note meta"><summary>出典</summary><code>src/data.js#npc.id@19:15</code>　<code>label</code>　<code>src/data.js</code> 行 19　<code>data_literal</code></details>

**2**　見出し

リック

<details class="note meta"><summary>出典</summary><code>src/data.js#npc.name@19:27</code>　<code>label</code>　<code>src/data.js</code> 行 19　<code>data_literal</code></details>

**3**　見出し

治癒

<details class="note meta"><summary>出典</summary><code>src/data.js#skills.heal.name@22:12</code>　<code>label</code>　<code>src/data.js</code> 行 22　<code>data_literal</code></details>

**4**　見出し

対象のHP+6、通常の状態異常を治す。

<details class="note meta"><summary>出典</summary><code>src/data.js#skills.heal.text@22:29</code>　<code>label</code>　<code>src/data.js</code> 行 22　<code>data_literal</code></details>

**5**　見出し

祝福

<details class="note meta"><summary>出典</summary><code>src/data.js#skills.bless.name@23:13</code>　<code>label</code>　<code>src/data.js</code> 行 23　<code>data_literal</code></details>

**6**　見出し

対象の器用+1・素早+1（このフェイズ）。

<details class="note meta"><summary>出典</summary><code>src/data.js#skills.bless.text@23:30</code>　<code>label</code>　<code>src/data.js</code> 行 23　<code>data_literal</code></details>

**7**　見出し

聖女の診断

<details class="note meta"><summary>出典</summary><code>src/data.js#skills.diagnose.name@24:16</code>　<code>label</code>　<code>src/data.js</code> 行 24　<code>data_literal</code></details>

**8**　見出し

見つけた負傷や異常を診る（使っても、そのフェイズの調べる回数は減らない）

<details class="note meta"><summary>出典</summary><code>src/data.js#skills.diagnose.text@24:36</code>　<code>label</code>　<code>src/data.js</code> 行 24　<code>data_literal</code></details>

**9**　見出し

攻撃魔法

<details class="note meta"><summary>出典</summary><code>src/data.js#skills.attack.name@25:14</code>　<code>label</code>　<code>src/data.js</code> 行 25　<code>data_literal</code></details>

**10**　見出し

このフェイズのライブセレクションで自分の行動の攻撃合計+3。追跡者との戦闘で受けるダメージ−2。魔法のかかった部屋の頭脳判定−1。騒音+2。

<details class="note meta"><summary>出典</summary><code>src/data.js#skills.attack.text@25:33</code>　<code>label</code>　<code>src/data.js</code> 行 25　<code>data_literal</code></details>

**11**　見出し

魔力強化

<details class="note meta"><summary>出典</summary><code>src/data.js#skills.enhance.name@26:15</code>　<code>label</code>　<code>src/data.js</code> 行 26　<code>data_literal</code></details>

**12**　見出し

対象の攻撃+1・頭脳+1（このフェイズ）。

<details class="note meta"><summary>出典</summary><code>src/data.js#skills.enhance.text@26:34</code>　<code>label</code>　<code>src/data.js</code> 行 26　<code>data_literal</code></details>

**13**　見出し

魔力解析

<details class="note meta"><summary>出典</summary><code>src/data.js#skills.analyze.name@27:15</code>　<code>label</code>　<code>src/data.js</code> 行 27　<code>data_literal</code></details>

**14**　見出し

見つけた魔法の対象・体の異常を調べる（部屋全体の探知ではない）。

<details class="note meta"><summary>出典</summary><code>src/data.js#skills.analyze.text@27:34</code>　<code>label</code>　<code>src/data.js</code> 行 27　<code>data_literal</code></details>

**15**　見出し

精密解除

<details class="note meta"><summary>出典</summary><code>src/data.js#skills.precision.name@28:17</code>　<code>label</code>　<code>src/data.js</code> 行 28　<code>data_literal</code></details>

**16**　見出し

罠・鍵の器用判定+2（このフェイズ）。

<details class="note meta"><summary>出典</summary><code>src/data.js#skills.precision.text@28:36</code>　<code>label</code>　<code>src/data.js</code> 行 28　<code>data_literal</code></details>

**17**　見出し

限定解除

<details class="note meta"><summary>出典</summary><code>src/data.js#skills.limit.name@29:13</code>　<code>label</code>　<code>src/data.js</code> 行 29　<code>data_literal</code></details>

**18**　見出し

今回のライブセレクションだけ2人分として数える（選ぶときに設定）。

<details class="note meta"><summary>出典</summary><code>src/data.js#skills.limit.text@29:32</code>　<code>label</code>　<code>src/data.js</code> 行 29　<code>data_literal</code></details>

**19**　見出し

斥候

<details class="note meta"><summary>出典</summary><code>src/data.js#skills.scout.name@30:13</code>　<code>label</code>　<code>src/data.js</code> 行 30　<code>data_literal</code></details>

**20**　見出し

未知の先の広さ・分かれ道を大まかに知る。名前・宝は分からない。

<details class="note meta"><summary>出典</summary><code>src/data.js#skills.scout.text@30:30</code>　<code>label</code>　<code>src/data.js</code> 行 30　<code>data_literal</code></details>

**21**　見出し

庇う

<details class="note meta"><summary>出典</summary><code>src/data.js#skills.cover.name@31:13</code>　<code>label</code>　<code>src/data.js</code> 行 31　<code>data_literal</code></details>

**22**　見出し

同じ部屋を探索した者が受けるダメージを全て肩代わりする。(自動発動)ライブセレクションのダメージも肩代わりして受ける（選択肢で分かれるときは同じ選択肢の仲間。肩代わりしたことは全員に知らされ、肩代わりしたフェイズごとに功績+1〈2回まで〉）

<details class="note meta"><summary>出典</summary><code>src/data.js#skills.cover.text@31:30</code>　<code>label</code>　<code>src/data.js</code> 行 31　<code>data_literal</code></details>

**23**　見出し

頑健

<details class="note meta"><summary>出典</summary><code>src/data.js#skills.ganken.name@32:14</code>　<code>label</code>　<code>src/data.js</code> 行 32　<code>data_literal</code></details>

**24**　見出し

全てのダメージは−1（エドガーが受けるダメージ。肩代わりした分にも効く。0より下にはならない）。

<details class="note meta"><summary>出典</summary><code>src/data.js#skills.ganken.text@32:47</code>　<code>label</code>　<code>src/data.js</code> 行 32　<code>data_literal</code></details>

**25**　見出し

何もなかったことにする

<details class="note meta"><summary>出典</summary><code>src/data.js#skills.hide.name@34:12</code>　<code>label</code>　<code>src/data.js</code> 行 34　<code>data_literal</code></details>

**26**　見出し

このフェイズの探索で見つけた物を隠す。同じ部屋の仲間には「何もなかった」と出る。

<details class="note meta"><summary>出典</summary><code>src/data.js#skills.hide.text@34:38</code>　<code>label</code>　<code>src/data.js</code> 行 34　<code>data_literal</code></details>

**27**　見出し

鑑定

<details class="note meta"><summary>出典</summary><code>src/data.js#skills.appraise.name@35:16</code>　<code>label</code>　<code>src/data.js</code> 行 35　<code>data_literal</code></details>

**28**　見出し

自分の持ち物から品を一つ選ぶ。その品の使い道と、何の材料になるかが分かる。分かったことはカードになり、全員へ共有できる。

<details class="note meta"><summary>出典</summary><code>src/data.js#skills.appraise.text@35:33</code>　<code>label</code>　<code>src/data.js</code> 行 35　<code>data_literal</code></details>

**29**　見出し

誘引

<details class="note meta"><summary>出典</summary><code>src/data.js#skills.lure.name@36:12</code>　<code>label</code>　<code>src/data.js</code> 行 36　<code>data_literal</code></details>

**30**　見出し

リックが居る部屋に印をかける（攻撃魔法の魔力をリックにまとわせる。このフェイズ）。その部屋の物音+5。遭遇したら、リックが一番に狙われる。

<details class="note meta"><summary>出典</summary><code>src/data.js#skills.lure.text@36:29</code>　<code>label</code>　<code>src/data.js</code> 行 36　<code>data_literal</code></details>

**31**　見出し

魔法剣

<details class="note meta"><summary>出典</summary><code>src/data.js#skills.sword.name@37:13</code>　<code>label</code>　<code>src/data.js</code> 行 37　<code>data_literal</code></details>

**32**　見出し

リック自身の能力1つ+1。騒音+2。

<details class="note meta"><summary>出典</summary><code>src/data.js#skills.sword.text@37:31</code>　<code>label</code>　<code>src/data.js</code> 行 37　<code>data_literal</code></details>

**33**　見出し

感応

<details class="note meta"><summary>出典</summary><code>src/data.js#skills.sense.name@38:13</code>　<code>label</code>　<code>src/data.js</code> 行 38　<code>data_literal</code></details>

**34**　見出し

見つけた古代の武器・剣印・封印を調べる。

<details class="note meta"><summary>出典</summary><code>src/data.js#skills.sense.text@38:30</code>　<code>label</code>　<code>src/data.js</code> 行 38　<code>data_literal</code></details>

**35**　見出し

魔法防壁

<details class="note meta"><summary>出典</summary><code>src/data.js#skills.barrier.name@39:15</code>　<code>label</code>　<code>src/data.js</code> 行 39　<code>data_literal</code></details>

**36**　見出し

同行者とリック自身が受けるダメージを、それぞれ毎回−2（固定。そのフェイズだけ）。

<details class="note meta"><summary>出典</summary><code>src/data.js#skills.barrier.text@39:34</code>　<code>label</code>　<code>src/data.js</code> 行 39　<code>data_literal</code></details>

**37**　見出し

回復薬

<details class="note meta"><summary>出典</summary><code>src/data.js#items.potion@44:13</code>　<code>label</code>　<code>src/data.js</code> 行 44　<code>data_literal</code></details>

**38**　見出し

魔力薬

<details class="note meta"><summary>出典</summary><code>src/data.js#items.mana@44:69</code>　<code>label</code>　<code>src/data.js</code> 行 44　<code>data_literal</code></details>

**39**　見出し

バフ薬

<details class="note meta"><summary>出典</summary><code>src/data.js#items.buff@44:123</code>　<code>label</code>　<code>src/data.js</code> 行 44　<code>data_literal</code></details>

**40**　見出し

選んだ能力+1（このフェイズ。上限なし）

<details class="note meta"><summary>出典</summary><code>src/data.js#items.buff.effectText@44:160</code>　<code>label</code>　<code>src/data.js</code> 行 44　<code>data_literal</code></details>

**41**　見出し

警備兵の銀貨

<details class="note meta"><summary>出典</summary><code>src/data.js#items.guardCoin@45:16</code>　<code>label</code>　<code>src/data.js</code> 行 45　<code>data_literal</code></details>

**42**　見出し

銀の匙

<details class="note meta"><summary>出典</summary><code>src/data.js#items.silverSpoon@45:46</code>　<code>label</code>　<code>src/data.js</code> 行 45　<code>data_literal</code></details>

**43**　見出し

燭台の銀皿

<details class="note meta"><summary>出典</summary><code>src/data.js#items.silverPlate@45:73</code>　<code>label</code>　<code>src/data.js</code> 行 45　<code>data_literal</code></details>

**44**　見出し

金の栞

<details class="note meta"><summary>出典</summary><code>src/data.js#items.goldMarker@45:101</code>　<code>label</code>　<code>src/data.js</code> 行 45　<code>data_literal</code></details>

**45**　見出し

古い銀の指輪

<details class="note meta"><summary>出典</summary><code>src/data.js#items.silverRing@45:127</code>　<code>label</code>　<code>src/data.js</code> 行 45　<code>data_literal</code></details>

**46**　見出し

魔晶の粒

<details class="note meta"><summary>出典</summary><code>src/data.js#items.crystalGrain@45:158</code>　<code>label</code>　<code>src/data.js</code> 行 45　<code>data_literal</code></details>

**47**　見出し

古い金貨

<details class="note meta"><summary>出典</summary><code>src/data.js#items.oldGold@45:206</code>　<code>label</code>　<code>src/data.js</code> 行 45　<code>data_literal</code></details>

**48**　見出し

金の留め具

<details class="note meta"><summary>出典</summary><code>src/data.js#items.goldClasp@45:232</code>　<code>label</code>　<code>src/data.js</code> 行 45　<code>data_literal</code></details>

**49**　見出し

銀の鈴

<details class="note meta"><summary>出典</summary><code>src/data.js#items.silverBell@45:260</code>　<code>label</code>　<code>src/data.js</code> 行 45　<code>data_literal</code></details>

**50**　見出し

警備隊長の銀貨袋

<details class="note meta"><summary>出典</summary><code>src/data.js#items.captainPurse@45:288</code>　<code>label</code>　<code>src/data.js</code> 行 45　<code>data_literal</code></details>

**51**　見出し

大粒の宝石付きの鍔

<details class="note meta"><summary>出典</summary><code>src/data.js#items.bigJewelHilt@45:321</code>　<code>label</code>　<code>src/data.js</code> 行 45　<code>data_literal</code></details>

**52**　見出し

宝冠

<details class="note meta"><summary>出典</summary><code>src/data.js#items.crown@45:348</code>　<code>label</code>　<code>src/data.js</code> 行 45　<code>data_literal</code></details>

**53**　見出し

古騎士勲章

<details class="note meta"><summary>出典</summary><code>src/data.js#items.medal@45:369</code>　<code>label</code>　<code>src/data.js</code> 行 45　<code>data_literal</code></details>

**54**　見出し

騎士の銀杯

<details class="note meta"><summary>出典</summary><code>src/data.js#items.silverCup@45:396</code>　<code>label</code>　<code>src/data.js</code> 行 45　<code>data_literal</code></details>

**55**　見出し

古代銀貨袋

<details class="note meta"><summary>出典</summary><code>src/data.js#items.coins@45:419</code>　<code>label</code>　<code>src/data.js</code> 行 45　<code>data_literal</code></details>

**56**　見出し

宝石付きの鍔

<details class="note meta"><summary>出典</summary><code>src/data.js#items.jeweledGuard@45:449</code>　<code>label</code>　<code>src/data.js</code> 行 45　<code>data_literal</code></details>

**57**　見出し

宝冠の欠片

<details class="note meta"><summary>出典</summary><code>src/data.js#items.crownShard@45:478</code>　<code>label</code>　<code>src/data.js</code> 行 45　<code>data_literal</code></details>

**58**　見出し

魔力真珠

<details class="note meta"><summary>出典</summary><code>src/data.js#items.pearl@45:501</code>　<code>label</code>　<code>src/data.js</code> 行 45　<code>data_literal</code></details>

**59**　見出し

王家装飾品

<details class="note meta"><summary>出典</summary><code>src/data.js#items.royal@45:547</code>　<code>label</code>　<code>src/data.js</code> 行 45　<code>data_literal</code></details>

**60**　見出し

遺物庫財宝

<details class="note meta"><summary>出典</summary><code>src/data.js#items.treasure@45:574</code>　<code>label</code>　<code>src/data.js</code> 行 45　<code>data_literal</code></details>

**61**　見出し

エリクサー

<details class="note meta"><summary>出典</summary><code>src/data.js#items.elixir@46:13</code>　<code>label</code>　<code>src/data.js</code> 行 46　<code>data_literal</code></details>

**62**　見出し

HP全回復（使うと価値0）

<details class="note meta"><summary>出典</summary><code>src/data.js#items.elixir.effectText@46:64</code>　<code>label</code>　<code>src/data.js</code> 行 46　<code>data_literal</code></details>

**63**　見出し

高純度魔晶石

<details class="note meta"><summary>出典</summary><code>src/data.js#items.crystal@46:95</code>　<code>label</code>　<code>src/data.js</code> 行 46　<code>data_literal</code></details>

**64**　見出し

MP+6（使うと価値0）

<details class="note meta"><summary>出典</summary><code>src/data.js#items.crystal.effectText@46:143</code>　<code>label</code>　<code>src/data.js</code> 行 46　<code>data_literal</code></details>

**65**　見出し

封印銀塊

<details class="note meta"><summary>出典</summary><code>src/data.js#items.silver@47:13</code>　<code>label</code>　<code>src/data.js</code> 行 47　<code>data_literal</code></details>

**66**　見出し

古代防護石

<details class="note meta"><summary>出典</summary><code>src/data.js#items.stone@48:12</code>　<code>label</code>　<code>src/data.js</code> 行 48　<code>data_literal</code></details>

**67**　見出し

P9・P12のイベントダメージを1回0（使うと価値0）

<details class="note meta"><summary>出典</summary><code>src/data.js#items.stone.effectText@48:66</code>　<code>label</code>　<code>src/data.js</code> 行 48　<code>data_literal</code></details>

**68**　見出し

精密工具

<details class="note meta"><summary>出典</summary><code>src/data.js#items.tools@49:12</code>　<code>label</code>　<code>src/data.js</code> 行 49　<code>data_literal</code></details>

**69**　見出し

装備中 器用+1

<details class="note meta"><summary>出典</summary><code>src/data.js#items.tools.effectText@49:57</code>　<code>label</code>　<code>src/data.js</code> 行 49　<code>data_literal</code></details>

**70**　見出し

対追跡者装具

<details class="note meta"><summary>出典</summary><code>src/data.js#items.gear@49:80</code>　<code>label</code>　<code>src/data.js</code> 行 49　<code>data_literal</code></details>

**71**　見出し

装備中 戦闘ダメージ−1

<details class="note meta"><summary>出典</summary><code>src/data.js#items.gear.effectText@49:138</code>　<code>label</code>　<code>src/data.js</code> 行 49　<code>data_literal</code></details>

**72**　見出し

古代観測鏡

<details class="note meta"><summary>出典</summary><code>src/data.js#items.mirror@50:13</code>　<code>label</code>　<code>src/data.js</code> 行 50　<code>data_literal</code></details>

**73**　見出し

装備中 頭脳+1

<details class="note meta"><summary>出典</summary><code>src/data.js#items.mirror.effectText@50:70</code>　<code>label</code>　<code>src/data.js</code> 行 50　<code>data_literal</code></details>

**74**　見出し

古代軽装具

<details class="note meta"><summary>出典</summary><code>src/data.js#items.armor@50:94</code>　<code>label</code>　<code>src/data.js</code> 行 50　<code>data_literal</code></details>

**75**　見出し

装備中 素早+1

<details class="note meta"><summary>出典</summary><code>src/data.js#items.armor.effectText@50:151</code>　<code>label</code>　<code>src/data.js</code> 行 50　<code>data_literal</code></details>

**76**　見出し

排水門操作具

<details class="note meta"><summary>出典</summary><code>src/data.js#items.drain@51:12</code>　<code>label</code>　<code>src/data.js</code> 行 51　<code>data_literal</code></details>

**77**　見出し

旧昇降機起動鍵

<details class="note meta"><summary>出典</summary><code>src/data.js#items.lift@51:40</code>　<code>label</code>　<code>src/data.js</code> 行 51　<code>data_literal</code></details>

**78**　見出し

封印武器

<details class="note meta"><summary>出典</summary><code>src/data.js#items.weapon@51:71</code>　<code>label</code>　<code>src/data.js</code> 行 51　<code>data_literal</code></details>

**79**　見出し

装備すると攻撃・器用・素早・頭脳がすべて+2（剣は1本だけ装備できる）。最終戦でヴィオラを一度だけ守る

<details class="note meta"><summary>出典</summary><code>src/data.js#items.weapon.effectText@51:149</code>　<code>label</code>　<code>src/data.js</code> 行 51　<code>data_literal</code></details>

**80**　見出し

リックの魔法剣

<details class="note meta"><summary>出典</summary><code>src/data.js#items.leonSword@52:16</code>　<code>label</code>　<code>src/data.js</code> 行 52　<code>data_literal</code></details>

**81**　見出し

装備すると攻撃+2（剣は1本だけ装備できる）

<details class="note meta"><summary>出典</summary><code>src/data.js#items.leonSword.effectText@52:79</code>　<code>label</code>　<code>src/data.js</code> 行 52　<code>data_literal</code></details>

**82**　見出し

武器庫の銅鍵

<details class="note meta"><summary>出典</summary><code>src/data.js#items.copper@52:173</code>　<code>label</code>　<code>src/data.js</code> 行 52　<code>data_literal</code></details>

**83**　見出し

封印司書章

<details class="note meta"><summary>出典</summary><code>src/data.js#items.librarian@52:206</code>　<code>label</code>　<code>src/data.js</code> 行 52　<code>data_literal</code></details>

**84**　見出し

黒金の鍵

<details class="note meta"><summary>出典</summary><code>src/data.js#items.blackkey@52:237</code>　<code>label</code>　<code>src/data.js</code> 行 52　<code>data_literal</code></details>

**85**　見出し

崩落石粉

<details class="note meta"><summary>出典</summary><code>src/data.js#items.powder@53:13</code>　<code>label</code>　<code>src/data.js</code> 行 53　<code>data_literal</code></details>

**86**　見出し

薬瓶ラベル

<details class="note meta"><summary>出典</summary><code>src/data.js#items.label@53:45</code>　<code>label</code>　<code>src/data.js</code> 行 53　<code>data_literal</code></details>

**87**　見出し

焼損封印片

<details class="note meta"><summary>出典</summary><code>src/data.js#items.seal@53:77</code>　<code>label</code>　<code>src/data.js</code> 行 53　<code>data_literal</code></details>

**88**　見出し

黒曜呪片

<details class="note meta"><summary>出典</summary><code>src/data.js#items.obsidian@54:15</code>　<code>label</code>　<code>src/data.js</code> 行 54　<code>data_literal</code></details>

**89**　見出し

追跡者身体片

<details class="note meta"><summary>出典</summary><code>src/data.js#items.fragment@54:50</code>　<code>label</code>　<code>src/data.js</code> 行 54　<code>data_literal</code></details>

**90**　見出し

深層水泥

<details class="note meta"><summary>出典</summary><code>src/data.js#items.mud@54:82</code>　<code>label</code>　<code>src/data.js</code> 行 54　<code>data_literal</code></details>

**91**　見出し

守護核の欠片

<details class="note meta"><summary>出典</summary><code>src/data.js#items.coreShard@55:16</code>　<code>label</code>　<code>src/data.js</code> 行 55　<code>data_literal</code></details>

**92**　見出し

持ち帰るかどうかは帰還後に決める

<details class="note meta"><summary>出典</summary><code>src/data.js#items.coreShard.effectText@55:45</code>　<code>label</code>　<code>src/data.js</code> 行 55　<code>data_literal</code></details>

**93**　見出し

小粒の宝石

<details class="note meta"><summary>出典</summary><code>src/data.js#items.soloSmall@57:16</code>　<code>label</code>　<code>src/data.js</code> 行 57　<code>data_literal</code></details>

**94**　見出し

大粒の宝玉

<details class="note meta"><summary>出典</summary><code>src/data.js#items.soloBig@57:71</code>　<code>label</code>　<code>src/data.js</code> 行 57　<code>data_literal</code></details>

**95**　見出し

REC

<details class="note meta"><summary>出典</summary><code>src/data.js#info.category@63:95</code>　<code>label</code>　<code>src/data.js</code> 行 63　<code>data_literal</code></details>

**96**　見出し

追尾特性

<details class="note meta"><summary>出典</summary><code>src/data.js#M7Data@64:21</code>　<code>label</code>　<code>src/data.js</code> 行 64　<code>data_literal</code></details>

**97**　見出し

特定魔力波形を優先追跡する。共有すると最終LS①の注意分断は2人で成立。

<details class="note meta"><summary>出典</summary><code>src/data.js#M7Data@64:28</code>　<code>label</code>　<code>src/data.js</code> 行 64　<code>data_literal</code></details>

**98**　見出し

外部からの魔力供給

<details class="note meta"><summary>出典</summary><code>src/data.js#M7Data@65:22</code>　<code>label</code>　<code>src/data.js</code> 行 65　<code>data_literal</code></details>

**99**　見出し

再生する肉体には外部供給がある。共有すると最終LS②の供給遮断は2人で成立。

<details class="note meta"><summary>出典</summary><code>src/data.js#M7Data@65:34</code>　<code>label</code>　<code>src/data.js</code> 行 65　<code>data_literal</code></details>

**100**　見出し

攻撃優先順位

<details class="note meta"><summary>出典</summary><code>src/data.js#M7Data@66:24</code>　<code>label</code>　<code>src/data.js</code> 行 66　<code>data_literal</code></details>

**101**　見出し

追跡者の攻撃対象には優先順がある。共有で最終LS③の拘束は1人、LS①注意分断成功時のダメージは0。

<details class="note meta"><summary>出典</summary><code>src/data.js#M7Data@66:33</code>　<code>label</code>　<code>src/data.js</code> 行 66　<code>data_literal</code></details>

**102**　見出し

封印環の固定点

<details class="note meta"><summary>出典</summary><code>src/data.js#M7Data@67:20</code>　<code>label</code>　<code>src/data.js</code> 行 67　<code>data_literal</code></details>

**103**　見出し

封印環には固定点がある。共有すると最終LS③の解除は1人で成立。

<details class="note meta"><summary>出典</summary><code>src/data.js#M7Data@67:30</code>　<code>label</code>　<code>src/data.js</code> 行 67　<code>data_literal</code></details>

**104**　見出し

再生経路制御

<details class="note meta"><summary>出典</summary><code>src/data.js#M7Data@68:20</code>　<code>label</code>　<code>src/data.js</code> 行 68　<code>data_literal</code></details>

**105**　見出し

再生の経路を制御する。共有すると最終LS④の経路制御は1人で成立。

<details class="note meta"><summary>出典</summary><code>src/data.js#M7Data@68:29</code>　<code>label</code>　<code>src/data.js</code> 行 68　<code>data_literal</code></details>

**106**　見出し

守護核停止論

<details class="note meta"><summary>出典</summary><code>src/data.js#M7Data@69:22</code>　<code>label</code>　<code>src/data.js</code> 行 69　<code>data_literal</code></details>

**107**　見出し

完全停止には再生経路切断と精神記録終端の両方が必要。

<details class="note meta"><summary>出典</summary><code>src/data.js#M7Data@69:31</code>　<code>label</code>　<code>src/data.js</code> 行 69　<code>data_literal</code></details>

**108**　見出し

封印剣設計

<details class="note meta"><summary>出典</summary><code>src/data.js#M7Data@70:22</code>　<code>label</code>　<code>src/data.js</code> 行 70　<code>data_literal</code></details>

**109**　見出し

封印剣の設計の記録。（2026-11-08 pt2c：工房での作成は外した。このカードは原稿で《封印剣》にまとめたので、ゲームには出ない）

<details class="note meta"><summary>出典</summary><code>src/data.js#M7Data@70:30</code>　<code>label</code>　<code>src/data.js</code> 行 70　<code>data_literal</code></details>

**110**　見出し

致命傷が見当たらない

<details class="note meta"><summary>出典</summary><code>src/data.js#M7Data@71:21</code>　<code>label</code>　<code>src/data.js</code> 行 71　<code>data_literal</code></details>

**111**　見出し

遺体に死に直結する外傷はない。

<details class="note meta"><summary>出典</summary><code>src/data.js#M7Data@71:34</code>　<code>label</code>　<code>src/data.js</code> 行 71　<code>data_literal</code></details>

**112**　見出し

体内性の異常

<details class="note meta"><summary>出典</summary><code>src/data.js#M7Data@72:21</code>　<code>label</code>　<code>src/data.js</code> 行 72　<code>data_literal</code></details>

**113**　見出し

異常は体内から生じている。

<details class="note meta"><summary>出典</summary><code>src/data.js#M7Data@72:30</code>　<code>label</code>　<code>src/data.js</code> 行 72　<code>data_literal</code></details>

**114**　見出し

遅効性魔毒

<details class="note meta"><summary>出典</summary><code>src/data.js#M7Data@73:25</code>　<code>label</code>　<code>src/data.js</code> 行 73　<code>data_literal</code></details>

**115**　見出し

魔力経路を少しずつ壊し、最後に全身を止める遅効性の魔毒。

<details class="note meta"><summary>出典</summary><code>src/data.js#M7Data@73:33</code>　<code>label</code>　<code>src/data.js</code> 行 73　<code>data_literal</code></details>

**116**　見出し

一本だけの反応

<details class="note meta"><summary>出典</summary><code>src/data.js#M7Data@74:21</code>　<code>label</code>　<code>src/data.js</code> 行 74　<code>data_literal</code></details>

**117**　見出し

空き瓶の山を解析した。日付印の新しい一本だけが、魔力薬の波形に反応する。売り物よりずっと濃い。ほかの瓶は、何も反応しない。

<details class="note meta"><summary>出典</summary><code>src/data.js#M7Data@74:31</code>　<code>label</code>　<code>src/data.js</code> 行 74　<code>data_literal</code></details>

**118**　見出し

内側からの魔力汚染

<details class="note meta"><summary>出典</summary><code>src/data.js#M7Data@75:29</code>　<code>label</code>　<code>src/data.js</code> 行 75　<code>data_literal</code></details>

**119**　見出し

体内に取り込まれた物質が、長い時間をかけて作用した反応。

<details class="note meta"><summary>出典</summary><code>src/data.js#M7Data@75:41</code>　<code>label</code>　<code>src/data.js</code> 行 75　<code>data_literal</code></details>

**120**　見出し

投与時期推定

<details class="note meta"><summary>出典</summary><code>src/data.js#M7Data@76:22</code>　<code>label</code>　<code>src/data.js</code> 行 76　<code>data_literal</code></details>

**121**　見出し

原因の物質を取り込んだのは、守護者門の前で悪寒が出るより前。

<details class="note meta"><summary>出典</summary><code>src/data.js#M7Data@76:31</code>　<code>label</code>　<code>src/data.js</code> 行 76　<code>data_literal</code></details>

**122**　見出し

リックの携行品

<details class="note meta"><summary>出典</summary><code>src/data.js#M7Data@77:27</code>　<code>label</code>　<code>src/data.js</code> 行 77　<code>data_literal</code></details>

**123**　見出し

装備、剣の整備用品、保存食。空の回復薬瓶が数本と、封蝋の跡が残る空き瓶が一本。毒物や呪物はない。

<details class="note meta"><summary>出典</summary><code>src/data.js#M7Data@77:37</code>　<code>label</code>　<code>src/data.js</code> 行 77　<code>data_literal</code></details>

**124**　見出し

症状メモ

<details class="note meta"><summary>出典</summary><code>src/data.js#M7Data@78:24</code>　<code>label</code>　<code>src/data.js</code> 行 78　<code>data_literal</code></details>

**125**　見出し

リックのメモ。

<details class="note meta"><summary>出典</summary><code>src/data.js#M7Data@78:31</code>　<code>label</code>　<code>src/data.js</code> 行 78　<code>data_literal</code></details>

**126**　見出し

未送信の手紙

<details class="note meta"><summary>出典</summary><code>src/data.js#M7Data@79:22</code>　<code>label</code>　<code>src/data.js</code> 行 79　<code>data_literal</code></details>

**127**　見出し

未送信の手紙。

<details class="note meta"><summary>出典</summary><code>src/data.js#M7Data@79:31</code>　<code>label</code>　<code>src/data.js</code> 行 79　<code>data_literal</code></details>

**128**　見出し

救出後の摂取

<details class="note meta"><summary>出典</summary><code>src/data.js#M7Data@80:23</code>　<code>label</code>　<code>src/data.js</code> 行 80　<code>data_literal</code></details>

**129**　見出し

救出時に飲んだ回復薬が、症状より前の唯一の摂取物。

<details class="note meta"><summary>出典</summary><code>src/data.js#M7Data@80:32</code>　<code>label</code>　<code>src/data.js</code> 行 80　<code>data_literal</code></details>

**130**　見出し

救難所物資台帳

<details class="note meta"><summary>出典</summary><code>src/data.js#M7Data@81:22</code>　<code>label</code>　<code>src/data.js</code> 行 81　<code>data_literal</code></details>

**131**　見出し

救難所の物資記録。

<details class="note meta"><summary>出典</summary><code>src/data.js#M7Data@81:32</code>　<code>label</code>　<code>src/data.js</code> 行 81　<code>data_literal</code></details>

**132**　見出し

空き瓶の封蝋

<details class="note meta"><summary>出典</summary><code>src/data.js#M7Data@82:22</code>　<code>label</code>　<code>src/data.js</code> 行 82　<code>data_literal</code></details>

**133**　見出し

救出時に飲ませた瓶。ギルドの封蝋に、一度剥がして貼り直した跡。重なった蝋の内側は乾いていて、遺跡の湿気を吸っていない。

<details class="note meta"><summary>出典</summary><code>src/data.js#M7Data@82:31</code>　<code>label</code>　<code>src/data.js</code> 行 82　<code>data_literal</code></details>

**134**　見出し

影写しの記録

<details class="note meta"><summary>出典</summary><code>src/data.js#M7Data@83:24</code>　<code>label</code>　<code>src/data.js</code> 行 83　<code>data_literal</code></details>

**135**　見出し

出発からの接続の記録。エドガーの接続だけが、ときどき乱れている。救難所での救出のあとは、乱れが消えている。

<details class="note meta"><summary>出典</summary><code>src/data.js#M7Data@83:33</code>　<code>label</code>　<code>src/data.js</code> 行 83　<code>data_literal</code></details>

**136**　見出し

支給台帳の写し

<details class="note meta"><summary>出典</summary><code>src/data.js#M7Data@84:22</code>　<code>label</code>　<code>src/data.js</code> 行 84　<code>data_literal</code></details>

**137**　見出し

出発の日に署名をした支給台帳の写し。

<details class="note meta"><summary>出典</summary><code>src/data.js#M7Data@84:32</code>　<code>label</code>　<code>src/data.js</code> 行 84　<code>data_literal</code></details>

**138**　見出し

所持品の見比べ

<details class="note meta"><summary>出典</summary><code>src/data.js#M7Data@85:23</code>　<code>label</code>　<code>src/data.js</code> 行 85　<code>data_literal</code></details>

**139**　見出し

台帳と、四人の今の所持品を見比べた。

<details class="note meta"><summary>出典</summary><code>src/data.js#M7Data@85:33</code>　<code>label</code>　<code>src/data.js</code> 行 85　<code>data_literal</code></details>

**140**　見出し

乱れの形

<details class="note meta"><summary>出典</summary><code>src/data.js#M7Data@86:24</code>　<code>label</code>　<code>src/data.js</code> 行 86　<code>data_literal</code></details>

**141**　見出し

乱れ方は、魔力の経路を崩すものを身につけているときに出る形と同じ。鎧や距離のせいではない。

<details class="note meta"><summary>出典</summary><code>src/data.js#M7Data@86:31</code>　<code>label</code>　<code>src/data.js</code> 行 86　<code>data_literal</code></details>

**142**　見出し

工作素材の出所

<details class="note meta"><summary>出典</summary><code>src/data.js#M7Data@87:22</code>　<code>label</code>　<code>src/data.js</code> 行 87　<code>data_literal</code></details>

**143**　見出し

現場の物質の中に、ダンジョンの限られた区画にしかないものがある。

<details class="note meta"><summary>出典</summary><code>src/data.js#M7Data@87:32</code>　<code>label</code>　<code>src/data.js</code> 行 87　<code>data_literal</code></details>

**144**　見出し

現場と探索履歴の不整合

<details class="note meta"><summary>出典</summary><code>src/data.js#M7Data@88:22</code>　<code>label</code>　<code>src/data.js</code> 行 88　<code>data_literal</code></details>

**145**　見出し

現場の物質の産地は、そこを実際に探索した者しか持ち出せない区画だった。

<details class="note meta"><summary>出典</summary><code>src/data.js#M7Data@88:36</code>　<code>label</code>　<code>src/data.js</code> 行 88　<code>data_literal</code></details>

**146**　見出し

祭壇周辺

<details class="note meta"><summary>出典</summary><code>src/data.js#M7Data@89:22</code>　<code>label</code>　<code>src/data.js</code> 行 89　<code>data_literal</code></details>

**147**　見出し

遺体のまわりに、激しい戦闘で壊れた跡は少ない。

<details class="note meta"><summary>出典</summary><code>src/data.js#M7Data@89:29</code>　<code>label</code>　<code>src/data.js</code> 行 89　<code>data_literal</code></details>

**148**　見出し

遺体の位置

<details class="note meta"><summary>出典</summary><code>src/data.js#M7Data@90:22</code>　<code>label</code>　<code>src/data.js</code> 行 90　<code>data_literal</code></details>

**149**　見出し

遺体は祭壇から少し離れて横向き。引きずった跡も、大量の血痕もない。

<details class="note meta"><summary>出典</summary><code>src/data.js#M7Data@90:30</code>　<code>label</code>　<code>src/data.js</code> 行 90　<code>data_literal</code></details>

**150**　見出し

事故痕の違和感

<details class="note meta"><summary>出典</summary><code>src/data.js#M7Data@91:22</code>　<code>label</code>　<code>src/data.js</code> 行 91　<code>data_literal</code></details>

**151**　見出し

事故を思わせる痕跡はあるが、遺体の状態と一致しない。

<details class="note meta"><summary>出典</summary><code>src/data.js#M7Data@91:32</code>　<code>label</code>　<code>src/data.js</code> 行 91　<code>data_literal</code></details>

**152**　見出し

入口大広間

<details class="note meta"><summary>出典</summary><code>src/data.js#names[0]@92:14</code>　<code>label</code>　<code>src/data.js</code> 行 92　<code>data_literal</code></details>

**153**　見出し

西警備回廊

<details class="note meta"><summary>出典</summary><code>src/data.js#names[1]@92:22</code>　<code>label</code>　<code>src/data.js</code> 行 92　<code>data_literal</code></details>

**154**　見出し

騎士団詰所

<details class="note meta"><summary>出典</summary><code>src/data.js#names[2]@92:30</code>　<code>label</code>　<code>src/data.js</code> 行 92　<code>data_literal</code></details>

**155**　見出し

崩落整備工房

<details class="note meta"><summary>出典</summary><code>src/data.js#names[3]@92:38</code>　<code>label</code>　<code>src/data.js</code> 行 92　<code>data_literal</code></details>

**156**　見出し

水門機関室

<details class="note meta"><summary>出典</summary><code>src/data.js#names[4]@92:47</code>　<code>label</code>　<code>src/data.js</code> 行 92　<code>data_literal</code></details>

**157**　見出し

誓剣武器庫

<details class="note meta"><summary>出典</summary><code>src/data.js#names[5]@92:55</code>　<code>label</code>　<code>src/data.js</code> 行 92　<code>data_literal</code></details>

**158**　見出し

追悼礼拝堂

<details class="note meta"><summary>出典</summary><code>src/data.js#names[6]@92:63</code>　<code>label</code>　<code>src/data.js</code> 行 92　<code>data_literal</code></details>

**159**　見出し

救難所

<details class="note meta"><summary>出典</summary><code>src/data.js#names[7]@92:71</code>　<code>label</code>　<code>src/data.js</code> 行 92　<code>data_literal</code></details>

**160**　見出し

双騎士碑文室

<details class="note meta"><summary>出典</summary><code>src/data.js#names[8]@92:77</code>　<code>label</code>　<code>src/data.js</code> 行 92　<code>data_literal</code></details>

**161**　見出し

王立封印記録庫

<details class="note meta"><summary>出典</summary><code>src/data.js#names[9]@92:86</code>　<code>label</code>　<code>src/data.js</code> 行 92　<code>data_literal</code></details>

**162**　見出し

守護監視室

<details class="note meta"><summary>出典</summary><code>src/data.js#names[10]@92:96</code>　<code>label</code>　<code>src/data.js</code> 行 92　<code>data_literal</code></details>

**163**　見出し

中央封鎖路

<details class="note meta"><summary>出典</summary><code>src/data.js#names[11]@92:104</code>　<code>label</code>　<code>src/data.js</code> 行 92　<code>data_literal</code></details>

**164**　見出し

守護者門

<details class="note meta"><summary>出典</summary><code>src/data.js#names[12]@92:112</code>　<code>label</code>　<code>src/data.js</code> 行 92　<code>data_literal</code></details>

**165**　見出し

守護研究前室

<details class="note meta"><summary>出典</summary><code>src/data.js#names[13]@92:119</code>　<code>label</code>　<code>src/data.js</code> 行 92　<code>data_literal</code></details>

**166**　見出し

殉職者墓廊

<details class="note meta"><summary>出典</summary><code>src/data.js#names[14]@92:128</code>　<code>label</code>　<code>src/data.js</code> 行 92　<code>data_literal</code></details>

**167**　見出し

誓剣騎士墓所

<details class="note meta"><summary>出典</summary><code>src/data.js#names[15]@92:136</code>　<code>label</code>　<code>src/data.js</code> 行 92　<code>data_literal</code></details>

**168**　見出し

命脈断絶工房

<details class="note meta"><summary>出典</summary><code>src/data.js#names[16]@92:145</code>　<code>label</code>　<code>src/data.js</code> 行 92　<code>data_literal</code></details>

**169**　見出し

王家秘蔵庫

<details class="note meta"><summary>出典</summary><code>src/data.js#names[17]@92:154</code>　<code>label</code>　<code>src/data.js</code> 行 92　<code>data_literal</code></details>

**170**　見出し

守護観測室

<details class="note meta"><summary>出典</summary><code>src/data.js#names[18]@92:162</code>　<code>label</code>　<code>src/data.js</code> 行 92　<code>data_literal</code></details>

**171**　見出し

再生実験室

<details class="note meta"><summary>出典</summary><code>src/data.js#names[19]@92:170</code>　<code>label</code>　<code>src/data.js</code> 行 92　<code>data_literal</code></details>

**172**　見出し

冷却水路

<details class="note meta"><summary>出典</summary><code>src/data.js#names[20]@92:178</code>　<code>label</code>　<code>src/data.js</code> 行 92　<code>data_literal</code></details>

**173**　見出し

隔離排水区画

<details class="note meta"><summary>出典</summary><code>src/data.js#names[21]@92:185</code>　<code>label</code>　<code>src/data.js</code> 行 92　<code>data_literal</code></details>

**174**　見出し

追跡環廊

<details class="note meta"><summary>出典</summary><code>src/data.js#names[22]@92:194</code>　<code>label</code>　<code>src/data.js</code> 行 92　<code>data_literal</code></details>

**175**　見出し

記憶封印殿

<details class="note meta"><summary>出典</summary><code>src/data.js#names[23]@92:201</code>　<code>label</code>　<code>src/data.js</code> 行 92　<code>data_literal</code></details>

**176**　見出し

裁定祭壇前

<details class="note meta"><summary>出典</summary><code>src/data.js#names[24]@92:209</code>　<code>label</code>　<code>src/data.js</code> 行 92　<code>data_literal</code></details>

**177**　見出し

裁定祭壇

<details class="note meta"><summary>出典</summary><code>src/data.js#names[25]@92:217</code>　<code>label</code>　<code>src/data.js</code> 行 92　<code>data_literal</code></details>

**178**　見出し

守護核

<details class="note meta"><summary>出典</summary><code>src/data.js#names[26]@92:224</code>　<code>label</code>　<code>src/data.js</code> 行 92　<code>data_literal</code></details>

**179**　見出し

内側へ向いた防壁

<details class="note meta"><summary>出典</summary><code>src/data.js#M7Data.steps[0]@99:32</code>　<code>label</code>　<code>src/data.js</code> 行 99　<code>data_literal</code></details>

**180**　見出し

内部から入口へ出る者を止める構造。

<details class="note meta"><summary>出典</summary><code>src/data.js#M7Data.steps[0]@99:43</code>　<code>label</code>　<code>src/data.js</code> 行 99　<code>data_literal</code></details>

**181**　見出し

西警備用小扉

<details class="note meta"><summary>出典</summary><code>src/data.js#M7Data.steps[1]@99:76</code>　<code>label</code>　<code>src/data.js</code> 行 99　<code>data_literal</code></details>

**182**　見出し

中央封鎖路へ続く人間専用の小扉。追跡者は通れない。

<details class="note meta"><summary>出典</summary><code>src/data.js#M7Data.steps[1]@99:85</code>　<code>label</code>　<code>src/data.js</code> 行 99　<code>data_literal</code></details>

**183**　見出し

騎士団長テレグラム

<details class="note meta"><summary>出典</summary><code>src/data.js#M7Data.steps[0]@100:32</code>　<code>label</code>　<code>src/data.js</code> 行 100　<code>data_literal</code></details>

**184**　見出し

テレグラム・レグルス。人々に信頼された英雄、騎士団長。

<details class="note meta"><summary>出典</summary><code>src/data.js#M7Data.steps[0]@100:44</code>　<code>label</code>　<code>src/data.js</code> 行 100　<code>data_literal</code></details>

**185**　見出し

団長と副長

<details class="note meta"><summary>出典</summary><code>src/data.js#M7Data.steps[1]@100:105</code>　<code>label</code>　<code>src/data.js</code> 行 100　<code>data_literal</code></details>

**186**　見出し

名を削られた副長は、団長の親友だった。

<details class="note meta"><summary>出典</summary><code>src/data.js#M7Data.steps[1]@100:113</code>　<code>label</code>　<code>src/data.js</code> 行 100　<code>data_literal</code></details>

**187**　見出し

地下へ続く整備孔

<details class="note meta"><summary>出典</summary><code>src/data.js#M7Data.steps[0]@101:77</code>　<code>label</code>　<code>src/data.js</code> 行 101　<code>data_literal</code></details>

**188**　見出し

人間だけが通れる地下への整備孔。

<details class="note meta"><summary>出典</summary><code>src/data.js#M7Data.steps[0]@101:88</code>　<code>label</code>　<code>src/data.js</code> 行 101　<code>data_literal</code></details>

**189**　見出し

灰色の石粉

<details class="note meta"><summary>出典</summary><code>src/data.js#M7Data.steps[1]@101:138</code>　<code>label</code>　<code>src/data.js</code> 行 101　<code>data_literal</code></details>

**190**　見出し

この石粉は崩落整備工房由来。

<details class="note meta"><summary>出典</summary><code>src/data.js#M7Data.steps[1]@101:146</code>　<code>label</code>　<code>src/data.js</code> 行 101　<code>data_literal</code></details>

**191**　見出し

水門の操作

<details class="note meta"><summary>出典</summary><code>src/data.js#M7Data.steps[0]@102:32</code>　<code>label</code>　<code>src/data.js</code> 行 102　<code>data_literal</code></details>

**192**　見出し

排水門操作具で地下への経路を開ける。

<details class="note meta"><summary>出典</summary><code>src/data.js#M7Data.steps[0]@102:40</code>　<code>label</code>　<code>src/data.js</code> 行 102　<code>data_literal</code></details>

**193**　見出し

祭壇へ届かない水

<details class="note meta"><summary>出典</summary><code>src/data.js#M7Data.steps[1]@102:92</code>　<code>label</code>　<code>src/data.js</code> 行 102　<code>data_literal</code></details>

**194**　見出し

通常の水流は裁定祭壇へ届かない。

<details class="note meta"><summary>出典</summary><code>src/data.js#M7Data.steps[1]@102:103</code>　<code>label</code>　<code>src/data.js</code> 行 102　<code>data_literal</code></details>

**195**　見出し

対守護者装備

<details class="note meta"><summary>出典</summary><code>src/data.js#M7Data.steps[0]@103:43</code>　<code>label</code>　<code>src/data.js</code> 行 103　<code>data_literal</code></details>

**196**　見出し

守護者への対処を想定した装具。

<details class="note meta"><summary>出典</summary><code>src/data.js#M7Data.steps[0]@103:52</code>　<code>label</code>　<code>src/data.js</code> 行 103　<code>data_literal</code></details>

**197**　見出し

空の封印鞘

<details class="note meta"><summary>出典</summary><code>src/data.js#M7Data.steps[1]@103:100</code>　<code>label</code>　<code>src/data.js</code> 行 103　<code>data_literal</code></details>

**198**　見出し

副長側の剣印はリックの魔法剣の紋章に似る。

<details class="note meta"><summary>出典</summary><code>src/data.js#M7Data.steps[1]@103:108</code>　<code>label</code>　<code>src/data.js</code> 行 103　<code>data_literal</code></details>

**199**　見出し

守護者への志願

<details class="note meta"><summary>出典</summary><code>src/data.js#M7Data.steps[0]@104:32</code>　<code>label</code>　<code>src/data.js</code> 行 104　<code>data_literal</code></details>

**200**　見出し

テレグラムは人々を守るため自ら守護者計画に志願した。

<details class="note meta"><summary>出典</summary><code>src/data.js#M7Data.steps[0]@104:42</code>　<code>label</code>　<code>src/data.js</code> 行 104　<code>data_literal</code></details>


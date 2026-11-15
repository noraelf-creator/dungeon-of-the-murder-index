# ゲームの全文字：はじめに（fb478cf）

:::note このページについて
ゲームの画面に出る文字を、コードから機械的に抜いて並べたもの。**原稿の本文ではない**（原稿は左の「HO」「読み合わせ」「カード」など）。**作者が足す文（サイトの別レイヤー）とも別**で、ここは読むだけ。
- このページ：**11 件**／場面 `intro`
- 出典：`git show fb478cf:<file>`。文字は1字も変えていない
- **この文字は `fb478cf` のゲームの記録**です。そのあと作者が P3・P6・P9 のライブセレクションの文言や部屋LSを直したので、**この中の選択肢の文が、いまの正とは違うことがあります**（いまの正：[今の状態の「場面LSの文言」](#/n-now)、[部屋LS 早見表](#/n-room-ls-map)）。原稿を取り込み直したゲームから採り直すと、ここも新しくなります。
- 先に「本文」を出す。画面の条件によって変わる組み立て（差し込みの型）は、下の「条件によって変わる表示・技術資料（参考）」にたたんである（開くと原文のまま見える）
- 出典の行・ID・連結式（テンプレート）は、各件の「出典」を開くと見える（本文の見える文字と分けてある）
:::

<!--vis:make-->

## 1. 本文（7 件）

**1**　資料

ダンジョン・オブ・ザ・マーダー ― プレイヤーの皆さんへ

<details class="note meta"><summary>出典</summary><code>src/manuscript.js#M7Manuscript.documents.intro.title@8728:13</code>　<code>doc</code>　<code>src/manuscript.js</code> 行 8728　<code>manuscript_pl</code>　<code>プレイヤー配布/00_はじめに</code>　<code>manuscript</code></details>

**2**　資料

4人のAランク冒険者として遺跡に取り残された魔法剣士リックを救い出し、倒しても起き上がる「追跡者」の謎を解き、**生きて帰る**。<br><br>## 最初に読むもの<br><br>キャラクターを選んだら、次の順に読む。<br><br>1. **全員で**：この「はじめに」と「ギルドからの依頼書」（共通HO）。代表者が一人、声に出して読み上げる。ほかの人は自分の画面で一緒に追う<br>2. **各自で**：自分のHO（自分専用。ほかの人には見せない）<br><br>---<br><br>## 遊び方の基本<br><br>- 4人で1つのパーティ。同じブラウザで4つのタブを開き、各自が自分のキャラクターのタブを使う。<br>- 1フェイズの流れは、**選ぶ（3分）→探索（2分）→帰還（1分）→会議（5分）**<br>  1. **選ぶフェイズ**（3分）：相談しながら探索先を決める。技能は選ぶ及び議論時に使用可能<br>  2. **探索フェイズ**（2分）：選んだ場所を調べる。話し合いはできない。<br>  3. **帰還フェイズ**（1分）：自分の結果を確かめる。話し合いはできない。全員が確かめ終えたら、次へ進む。<br>  4. **会議フェイズ**（5分）：見つけたことを共有して話し合う。<br>- 自分が見つけた情報は自分と同じ部屋にいた仲間しか知らない。共有するかどうかは自分で決める。<br>- 探索で「攻撃6以上」のように能力値が要る場所は、その部屋を一緒に探索した仲間の能力を合計して判定する。<br>- パーティ分断後は会議フェイズが密談フェイズとなる。その後全員がまた合流する。<br>- 所持品は仲間に譲渡及び使用が可能<br>- 大事な出来事は公開ログに記録される

<details class="note meta"><summary>出典</summary><code>src/manuscript.js#M7Manuscript.documents.intro.body@8729:12</code>　<code>doc</code>　<code>src/manuscript.js</code> 行 8729　<code>manuscript_pl</code>　<code>プレイヤー配布/00_はじめに</code>　<code>manuscript</code></details>

**3**　ボタン

閉じる

<details class="note meta"><summary>出典</summary><code>src/app.js#firstIntroHTML@569:119</code>　<code>button</code>　<code>src/app.js</code> 行 569　<code>ui_literal</code>　<code>ui</code></details>

**4**　ボタン

閉じる

<details class="note meta"><summary>出典</summary><code>src/app.js#firstHelp@578:98</code>　<code>button</code>　<code>src/app.js</code> 行 578　<code>ui_literal</code>　<code>ui</code></details>

**5**　見出し

全員で読む（代表者が一人、声に出して読み上げる）

<details class="note meta"><summary>出典</summary><code>src/app.js#lbDocTabs@2187:7</code>　<code>label</code>　<code>src/app.js</code> 行 2187　<code>ui_literal</code>　<code>ui</code></details>

**6**　見出し

各自で読む（自分専用）

<details class="note meta"><summary>出典</summary><code>src/app.js#lbDocTabs@2188:7</code>　<code>label</code>　<code>src/app.js</code> 行 2188　<code>ui_literal</code>　<code>ui</code></details>

**7**　見出し

あなたのHO

<details class="note meta"><summary>出典</summary><code>src/app.js#lbDocTabs@2188:30</code>　<code>label</code>　<code>src/app.js</code> 行 2188　<code>ui_literal</code>　<code>ui</code></details>

## 2. 条件によって変わる表示・技術資料（参考）（4 件）

画面の条件で変わる組み立て（差し込みの型）と、コードから抜いた断片。**本文として読むものではない**ので、たたんである。開くと原文（1字も変えていない）が見える。

**8**　動的表示

<details class="gt-code"><summary>コード（原文）を開く</summary><pre><code>{{esc(it.title)}} {{btn(&#39;閉じる&#39;,&#39;hfold&#39;,&#39;data-k=&quot;&#39;+k+&#39;&quot; data-closed=&quot;0&quot;&#39;,&#39;ghost fh-x&#39;)}} {{(it.lines||[]).map(function(l){var p=speakerPc(l.speaker),mine=!!v.me&amp;&amp;p===v.me.id;return &#39; &#39;+esc(l.speaker||&#39;&#39;)+&#39; &#39;+(mine?&#39; あなたの台詞 &#39;:&#39;&#39;)+&#39; &#39;+inline(l.text||&#39;&#39;)+&#39; &#39;}).join(&#39;&#39;)}}</code></pre></details>

<details class="note meta"><summary>出典</summary><code>src/app.js#firstIntroHTML@569:9</code>　<code>markup</code>　<code>src/app.js</code> 行 569　<code>ui_literal</code>　<code>ui</code>　<code>&#39;&lt;div class=&quot;first-help fh-talk&quot; data-first=&quot;&#39;+esc(it.key)+&#39;&quot;&gt;&lt;div class=&quot;fh-h&quot;&gt;&lt;b&gt;&#39;+esc(it.title)+&#39;&lt;/b&gt;&#39;+btn(&#39;閉じる&#39;,&#39;hfold&#39;,&#39;data-k=&quot;&#39;+k+&#39;&quot; data-closed=&quot;0&quot;&#39;,&#39;ghost fh-x&#39;)+&#39;&lt;/div&gt;&lt;ol class=&quot;fh-lines&quot;&gt;&#39;+
  (it.lines||[]).map(function(l){var p=speakerPc(l.speaker),mine=!!v.me&amp;&amp;p===v.me.id;return &#39;&lt;li c…</code></details>

**9**　動的表示

<details class="gt-code"><summary>コード（原文）を開く</summary><pre><code>{{esc(F[0])}} {{btn(&#39;閉じる&#39;,&#39;hfold&#39;,&#39;data-k=&quot;&#39;+k+&#39;&quot; data-closed=&quot;0&quot;&#39;,&#39;ghost fh-x&#39;)}} {{F[1].map(function(t){return &#39; &#39;+esc(t.split(&#39;｛選ぶ｝&#39;).join(T(&#39;sel.choose&#39;)))+&#39; &#39;}).join(&#39;&#39;)}} この説明は、左下の「？ 説明」でも読める。</code></pre></details>

<details class="note meta"><summary>出典</summary><code>src/app.js#firstHelp@578:9</code>　<code>markup</code>　<code>src/app.js</code> 行 578　<code>ui_literal</code>　<code>ui</code>　<code>&#39;&lt;div class=&quot;first-help&quot; data-first=&quot;&#39;+st+&#39;&quot;&gt;&lt;div class=&quot;fh-h&quot;&gt;&lt;b&gt;&#39;+esc(F[0])+&#39;&lt;/b&gt;&#39;+btn(&#39;閉じる&#39;,&#39;hfold&#39;,&#39;data-k=&quot;&#39;+k+&#39;&quot; data-closed=&quot;0&quot;&#39;,&#39;ghost fh-x&#39;)+&#39;&lt;/div&gt;&lt;ol&gt;&#39;+F[1].map(function(t){return &#39;&lt;li&gt;&#39;+esc(t.split(&#39;｛選ぶ｝&#39;).join(T(&#39;sel.choose&#39;)))+&#39;&lt;/li&gt;&#39;}).join(&#39;&#39;)+&#39;&lt;/ol&gt;&lt;small&gt;この説明は、左下の「？ 説明」でも読める。&lt;/smal…</code></details>

**10**　動的表示

<details class="gt-code"><summary>コード（原文）を開く</summary><pre><code>{{grp(&#39;全員で読む（代表者が一人、声に出して読み上げる）&#39;,tab(&#39;intro&#39;,esc(LB_TAB_HEAD.intro))+tab(&#39;commonHO&#39;,esc(LB_TAB_HEAD.commonHO)))}}{{grp(&#39;各自で読む（自分専用）&#39;,tab(&#39;ho&#39;,&#39;あなたのHO&#39;),&#39;own&#39;)}}{{grp(&#39;&#39;,tab(&#39;phaseTable&#39;,esc(LB_TAB_HEAD.phaseTable)))}}</code></pre></details>

<details class="note meta"><summary>出典</summary><code>src/app.js#lbDocTabs@2186:9</code>　<code>markup</code>　<code>src/app.js</code> 行 2186　<code>ui_literal</code>　<code>ui</code>　<code>&#39;&lt;div class=&quot;lb-tabs&quot;&gt;&#39;+
  grp(&#39;全員で読む（代表者が一人、声に出して読み上げる）&#39;,tab(&#39;intro&#39;,esc(LB_TAB_HEAD.intro))+tab(&#39;commonHO&#39;,esc(LB_TAB_HEAD.commonHO)))+
  grp(&#39;各自で読む（自分専用）&#39;,tab(&#39;ho&#39;,&#39;あなたのHO&#39;),&#39;own&#39;)+
  grp(&#39;&#39;,tab(&#39;phaseTable&#39;,esc(LB_TAB_HEAD.phaseTable)))+
 &#39;&lt;/div&gt;&#39;</code></details>

**11**　動的表示

<details class="gt-code"><summary>コード（原文）を開く</summary><pre><code>資料 ／ 全員 {{esc(d.title)}} {{md(d.body)}}</code></pre></details>

<details class="note meta"><summary>出典</summary><code>src/app.js#lbDocHTML@2191:99</code>　<code>markup</code>　<code>src/app.js</code> 行 2191　<code>ui_literal</code>　<code>ui</code>　<code>&#39;&lt;article class=&quot;doc full lb-common&quot; data-doc=&quot;&#39;+k+&#39;&quot;&gt;&lt;small&gt;資料 ／ 全員&lt;/small&gt;&lt;h1&gt;&#39;+esc(d.title)+&#39;&lt;/h1&gt;&#39;+md(d.body)+&#39;&lt;/article&gt;&#39;</code></details>


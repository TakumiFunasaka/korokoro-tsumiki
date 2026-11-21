# cuboro 拡張セット調査（現行ラインナップとエレメント形状）

調査日: 2026-11-21 / 調べたのは web 上で取得できた公開ページのみ。

## 要点（先に結論）

- 現行ラインナップは公式サイトで確定できた（11 セット）。依頼文の候補名のうち multi / plus / profi / metro / sixpack / tricky ways は、現行の公式拡張セット一覧には無い。
- エレメントごとの形状（どの面のどの高さ・左右位置に穴があるか、溝の経路、傾斜）は、今回アクセスできた出典では 1 件も確認できなかった。公式製品ページには番号も個別形状も載っていない。
- したがって「エレメントごとの形状」の節は、確認できた事実が無いため空欄にしてある。形状データを作るには、実物の写真か実物の採寸が別途必要。
- 3D シミュレーターの形状定義データ（GitHub 等）は見つからなかった。

凡例: [確認] = 出典で確認できた。[推測] = 出典に無く、こちらで推測した。[未確認] = 調べたが分からなかった。

## 1. 現行ラインナップ（公式 cuboro.ch の Extra Sets 一覧）

出典: https://www.cuboro.ch/en/collections/extra-sets （価格は CHF・税込、公式サイト取得時点）

| セット | 公式の個数・付属玉 | 対象年齢 | 価格 | 公式の説明（要約） |
|---|---|---|---|---|
| WAVE | 22 エレメント / ガラス玉 3 | 4+ | 169 | 波形の溝。玉が上下に波打って進み、リズムが変わる [確認] |
| JUMP | 12 / 3 | 5+ | 119 | 天然ゴム製のトランポリン要素。玉が隙間や障害物を飛び越える [確認] |
| KICK | 8 / 5 | 8+ | 169 | ステンレス製ハンマーが、重さと動きで玉を上へ蹴り返してスタートへ戻す。1 度に玉 1 個、毎回ハンマー頭を上に戻す [確認] |
| TUNNEL | 16 / 5 | 7+ | 169 | 玉が内部に消え、隠れたトンネルを通って別の場所に出てくる。階層をつなぐ [確認] |
| DUO | 16 / 5 | 8+ | 169 | 平行な 2 本のレーン。2 個の玉を同時に走らせ、1 レーンと 2 レーンを切り替えられる [確認] |
| TRICK | 16 / 5 | 8+ | 169 | 分岐・方向転換・ループ・合流。玉の進路が偶然で変わる [確認] |
| SPEED | 16 / 5 | 6+ | 169 | 特殊な形で玉を加速。より急な接続、速い流れ [確認]（「急な接続」は kindermaxx の説明） |
| SUB | 12 / 3（公式）。販売店は 12 / 5 と書くものもあり不一致 | 7+ | 119 | 半分の高さのエレメント。移行部・橋・アンダーパスを作る。上面と下面に溝があり、組み合わせてトンネルにできる [確認] |
| PRO | 16 / 5 | 10+ | 169 | 上面・下面・内部に機能がある多機能エレメント。段差変更と同一階での 90 度ターン [確認] |
| MAGNET | 12 / 3 | 3+（公式表記。玉は 3 歳未満不可との注記あり、不自然） | 149 | 磁石で塔と塔の間に宙に浮いたような橋をかける [確認] |
| CUBES | 16 / なし | 2+ | 89 | 溝もトンネルも無い中立な立方体。高く積むための土台 [確認] |

補足:
- 全エレメントの標準サイズは 5 cm [確認]（公式各ページ）。1986 年以降のセットと互換 [確認]。
- 素材はスイス産ブナ無垢、無塗装 [確認]。JUMP のトランポリン部は天然ゴム、KICK のハンマーはステンレス [確認]。
- 玉の個数・年齢は販売店間で食い違う箇所がある（WAVE は 22 個+3 玉が多数、16 個+5 玉と書く店もあり。SUB も玉 3 か 5）。このドキュメントでは公式を優先した。
- 公式にあるバンドル（FAMILY / KICK / CLASSIC / JUMP / WAVE / BLACK FRIDAY）は拡張セットではないので省略。
- 基本セット（JUNIOR、STANDARD 16/32/50）は対象外。

### 廃番・現行外の可能性があるもの

- multi、metro、sixpack multi（「Additional box Sixpack Multi」「Additional box Metro」）は galaxus.ch に旧製品として掲載があり、いずれも在庫切れ表示 [確認: 掲載と在庫切れ]。廃番かどうかの公式な記載は見つからなかった [未確認]。現行の公式一覧には載っていない [確認]。
- plus、profi、tricky ways（拡張セット名として）: 販売ページが見つからなかった [未確認]。
- 「cuboro tricky ways」は 2012 年のボードゲーム的なタクティクスゲームで、拡張セットではない [確認: Wikipedia(de)]。Cuboro Babel（2001）も別のゲーム。
- 依頼文の「profi」は現行の「PRO」と同じものかもしれない [推測]。「tunnel」は現行にある。「sixpack」は旧名の箱の名前 [確認: galaxus の商品名のみ]。
- 公式の WAVE ページ・JUMP ページ・KICK ページ・TUNNEL ページに「2026 iF Design Award」等の記載があり、WAVE は 2025 発売らしい [確認: iF Design の Date of Launch 2025]。KICK / TUNNEL / TRICK / CUBES の発売年は [未確認]。

### 商品番号（販売店ページの画像ファイル名由来。公式の明記ではない）

kindermaxx.de の画像ファイル名と thewoodenwagon の SKU から: CUBES 210/221（食い違い）、SPEED 211、TUNNEL 212、KICK 213、DUO 214、TRICK 215、PRO 216、WAVE 217、MAGNET 221、JUMP 222、SUB 223。
CUBES は kindermaxx で 0210、galaxus で (221) と書かれており、どちらが正しいか [未確認]。これは「セット番号」で、個々のエレメント番号ではない。

## 2. セットごとの特徴的な仕掛け（依頼者の理解の検証）

| セット | 依頼者の理解 | 検証結果 |
|---|---|---|
| duo | 溝やトンネルが2本並ぶ | 概ね正しい [確認]。「平行な2本のレーン、1⇔2レーンの切替」。2本の間隔や位置は [未確認] |
| speed | 加速用 | 正しい [確認]。ただし仕組み（傾斜の付け方等）は [未確認] |
| wave | 上下に波打つ | 正しい [確認]。波形の溝。波の周期・振幅・上面か内部かは [未確認] |
| kick | 玉を弾く | 正確には「玉を上方向へ蹴り上げてスタート側に戻す」。ステンレス製ハンマーを重さと動きで動かす [確認]。ハンマーの構造・玉の受け方・飛距離は [未確認] |
| jump | 玉が飛ぶ | 正しい [確認]。天然ゴムのトランポリンで隙間を飛び越える。ゴム部の位置と形、飛距離は [未確認] |
| metro | 地下トンネル中心 | 現行に metro は無い。近い現行セットは SUB（半分の高さ、トンネル）か TUNNEL [推測] |
| profi | 細い溝や立体交差 | 現行は PRO。「上面・下面・内部に機能、段差変更と同一階 90 度ターン」[確認]。「細い溝」は [未確認] |
| tunnel | （候補名） | 玉が内部に消えて別の場所に出る [確認] |
| trick | tricky ways | 分岐・方向転換・ループ・合流 [確認]。販売店 1 件は「13 種類のスタイル」と記載（16 個中 13 種という意味 [推測]）|
| magnet | 磁石 | 磁石で宙に浮く橋。公式レビュー欄に「接続は任意に長くはできない」[確認] |

## 3. エレメントごとの形状

調査結果: 出典で確認できなかった。

- cuboro.ch の各製品ページは、個数・玉数・特徴の文章のみで、エレメント番号、断面、穴の位置は載っていない [確認]。
- 画像の代替テキストはセット名のみ（例: 「CUBORO DUO」）[確認]。
- 販売店ページ（mastersofgames、thewoodenwagon、kindermaxx、galaxus、babipur 等）も同様に個別形状の記載なし [確認]。
- 公式の説明書 PDF・エレメント一覧・cuboro webkit（公式アプリ・設計ソフト）の情報は、検索しても見つからなかった [未確認]。FAQ ページは「建築プランは書籍 CUBORO THE BOOK に載っている」とのみ記載 [確認]。
- 日本の代理店・ファンブログは今回の検索で見つからなかった [未確認]。日本語検索はほぼヒットしなかった。

したがって、依頼者の抽象化（5 cm 立方体、側面 4 面に上半分/真ん中/下辺接地/下半分の穴、内部で接続）が拡張セットで成り立つかは検証できていない [未確認]。確認できた断片は次のみ。

| 確認できた事実 | 出典 |
|---|---|
| 標準エレメントは 1 辺 5 cm の立方体 | Wikipedia(de)、公式各ページ |
| 各立方体に直線・曲線の溝とトンネルがあり、玉は表面と内部を転がる | Wikipedia(de) |
| 1 つのブロックに最大 4 機能が入る（標準セットの販売店記述） | manufactum.com の検索結果要約 |
| 全体で 120 種以上のエレメントがある（Wikipedia）。公式の別ページは「100 種以上」 | Wikipedia(de)、検索要約 |
| SUB は半分の高さ（= 2.5 cm 高さと推測 [推測]）で、上面と下面に溝 | 公式 SUB ページ |
| CUBES は溝もトンネルも無い 5 cm 立方体 | 公式 CUBES ページ |
| MAGNET は塔の間をつなぐ「宙に浮く橋」。橋の長さに上限がある | 公式 MAGNET ページ |
| JUMP はゴム製トランポリン部を持つ | 公式 JUMP ページ |
| KICK はステンレス製ハンマーを持つ。「ハンマー頭を毎回上に戻す」ので回転・揺動する可動部と推測 [推測] | 公式 KICK ページ |

### セット別のモデリング上の見立て（すべて [推測]、出典なし）

以下は確認できた説明文からの論理的な想像で、形状の根拠ではない。実物写真で必ず検証すること。

- DUO: 1 つの面に溝または穴が 2 本、面の中心から左右にずれて並ぶ。1 本⇔2 本の分岐/合流エレメントがある。
- SPEED: 溝やトンネルに傾斜（ブロック内で高さを落とす）が付く。
- WAVE: 溝の底が波形。上面溝か内部トンネルかは不明。
- SUB: 高さ 2.5 cm の板状（半キューブ）。上面と下面の両方に溝。
- TUNNEL: 内部トンネルが主役。立体交差や階層間の接続。
- TRICK: 分岐（Y 字）とループ、合流。
- PRO: 上面溝+内部トンネル+下面溝の組み合わせ。
- MAGNET: 磁石入りの橋渡し部材。形状は不明（立方体でない可能性もある）。
- KICK, JUMP: 可動部（ハンマー）、ゴム面を含む。立方体のグリッドに収まるかは不明。

## 4. シミュレーター・データ関連の出典

- GitHub に cuboro のエレメント定義データ（JSON 等）は見つからなかった [未確認]。
- Nurgak/Endless-Marble-Run（https://github.com/Nurgak/Endless-Marble-Run ）: cuboro に似たブロックで無限のコースを作る p5.js のシミュレーション。MIT ライセンス [確認]。cuboro のエレメントの仕様は定義していない [確認]。アセットは JSCAD の `assets/boxes.js` で生成。形状の参考にはなるが、cuboro 公式エレメントのデータではない。
- SvenFrankson の Marble Run Simulator（marble-fall）: 汎用のコース作成ゲームで cuboro 専用ではない [確認: 検索要約のみ、リポジトリ未読]。
- Wikimedia Commons の Category:Cuboro に エレメント写真（Cuboro Element2〜11.JPG 等）がある [確認: ファイル名のみ。中身とライセンスは未確認]。

## 5. 出典 URL 一覧

公式
- https://www.cuboro.ch/en/ （トップ、基本セット・価格）
- https://www.cuboro.ch/en/collections/extra-sets （拡張セット一覧）
- https://www.cuboro.ch/en/collections/extra-sets/products/cuboro-wave
- https://www.cuboro.ch/en/collections/extra-sets/products/cuboro-jump
- https://www.cuboro.ch/en/collections/extra-sets/products/cuboro-kick
- https://www.cuboro.ch/en/collections/extra-sets/products/cuboro-tunnel
- https://www.cuboro.ch/en/collections/extra-sets/products/cuboro-duo
- https://www.cuboro.ch/en/collections/extra-sets/products/cuboro-trick
- https://www.cuboro.ch/en/collections/extra-sets/products/cuboro-speed
- https://www.cuboro.ch/en/collections/extra-sets/products/cuboro-sub
- https://www.cuboro.ch/en/collections/extra-sets/products/cuboro-pro
- https://www.cuboro.ch/en/collections/extra-sets/products/cuboro-magnet
- https://www.cuboro.ch/en/collections/extra-sets/products/cuboro-cubes
- https://www.cuboro.ch/en/pages/faq-support
- https://cuboro.com/en/products/cuboro-duo

第三者
- https://www.kindermaxx.de/en/toys/open-ended-play/cuboro-marble-run-extra-set-expansion-sets-in-various-versions （番号は画像ファイル名由来）
- https://mastersofgames.com/cat/indoor/cuboro-duo-extra-set.htm
- https://www.thewoodenwagon.com/woodentoy/CCU215.html 、CCU216.html、CCU223.html（同ドメイン）
- https://de.wikipedia.org/wiki/Cuboro
- https://commons.wikimedia.org/wiki/Category:Cuboro
- https://www.galaxus.ch/en/s5/product/cuboro-multi-marble-runs-394194 、https://www.galaxus.ch/en/s5/product/cuboro-additional-box-metro-fsc-marble-runs-394225 、https://www.galaxus.ch/en/s5/product/cuboro-additional-box-sixpack-multi-fsc-marble-runs-394263 （旧製品掲載。URL は検索結果の表示から。ページ本体は未読）
- https://ifdesign.com/en/winner-ranking/project/cuboro-wave/753771 （WAVE の発売年。検索結果のみ、本体未読）
- https://github.com/Nurgak/Endless-Marble-Run

## 6. 確認できなかった点・推測した点（まとめ）

1. エレメントごとの番号・個数・形状（溝の経路、穴の高さ・左右位置、傾斜）。全セットで未確認。
2. DUO の 2 本並びの間隔、SPEED の傾斜、WAVE の波形の寸法、KICK/JUMP の機構の詳細（可動部の寸法、ゴム部の位置）。
3. 依頼者の抽象化モデル（4 面×4 高さ位置の穴）の妥当性。特に MAGNET、KICK、JUMP は立方体グリッドに収まらない可能性。
4. multi / metro / sixpack / plus / profi の廃番の公式確認。
5. 玉の個数・年齢が販売店と公式で食い違う箇所（WAVE、SUB、MAGNET の年齢表記）。
6. 公式アプリ cuboro webkit、説明書 PDF、日本の代理店・ブログ。検索でヒットしなかった。公式サイトの別ドメイン（cuboro.com）やアプリストアは直接確認していない。
7. 使えたのは検索と本文取得（要約付き）のみで、写真は 1 枚も見ていない。形状の確定には実物写真や実物の採寸が必要。

## 7. 次の一手（提案）

- 形状を確定するなら、実物（または販売店ギャラリーの写真）を人が見て、エレメントごとに穴の位置を記録するのが最短。
- 依頼者が cuboro の公式説明書（セットの箱に入っている）を持っているなら、写真を撮って渡してもらえれば番号と図が取れる。
- 公式にエレメントデータの提供を問い合わせる（https://www.cuboro.ch/en/pages/contact ）。

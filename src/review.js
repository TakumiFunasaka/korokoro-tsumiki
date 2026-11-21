// パーツのレビュー画面。公式の図と、シミュレーターの形（道の線つき）を並べて、1つずつ判定してもらう。
import * as THREE from 'three';
import { PARTS, SETS } from './parts/catalog.js';
import { partGeometry } from './view/geometry.js';

// 公式の一覧図での並び（左上から4つずつ）
const CHARTS = [
  ['elements-204-CUBORO-STANDARD-CUBORO-50.png', ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', 'MK']],
  ['elements-201-CUBORO-JUNIOR.png', ['1', '1/2', 'R', 'RO', 'RD', 'A', '3', '23W', '42', '42L', '42R', '91', 'FN', 'K', 'KC', 'KL', 'G', 'GC', 'GL', 'GG', 'X/2', 'M']],
  ['elements-211-CUBORO-SPEED.png', ['1', '14', '15', '16', '21', '22', '22W', '23', '24', '71', 'MK']],
  ['elements-212-CUBORO-TUNNEL.png', ['1', '12Y', '51', '61', '64', '67', '68', '69', '70', '103', 'MK']],
  ['elements-214-CUBORO-DUO.png', ['1', '11', '42', 'D3', 'D5', 'D7', 'D8', 'D9', 'D15', 'D16', 'D22', 'MK']],
  ['elements-215-CUBORO-TRICK.png', ['1', '11T', '13L', '13R', '27', '28', '29', '54', '55', '56', '92', '114', 'MK']],
  ['elements-216-CUBORO-PRO.png', ['1', '11V', '25', '26', '30', '35', '36', '43', '45', '46', '77', '78', 'MK']],
  ['elements-217-CUBORO-WAVE.png', ['1', '1/2', '3', '23W', 'FN', 'K', 'KWL', 'KWR', 'GW', 'GCW', 'GLW', 'M']],
  ['elements-221-CUBORO-MAGNET.png', ['1', '1/2', 'R', 'RO', '11M', '12M', 'GM', 'GCM', 'M']],
  ['elements-222-CUBORO-JUMP.png', ['1', '1/2', 'R', '22', '23W', '81', 'MJ', 'M']],
  ['elements-223-CUBORO-SUB.png', ['1', '1/2', '11T', 'GX', 'GKL', 'GKR', 'GCK', 'GU', 'M']],
];
const chartOf = {};
for (const [file, ids] of CHARTS) ids.forEach((id, i) => { if (!chartOf[id]) chartOf[id] = { file, col: i % 4, row: Math.floor(i / 4) }; });

// こちらが自信のない点（質問）。あるものを先に並べる
const QUESTIONS = {
  '23W': '中央で半分ほど落ちている急な坂にしました。横（東西）の溝は水平ではなく中央へ落ちこむ形です。坂の急さ・横の溝の落ち方は合っていますか？ 手前(S)の出口の高さは「下の穴」と同じ(0.2)にしています。',
  '22W': '23W とまったく同じ形にしています。23W との違いが分かりません（図では 22W のほうが坂が中央寄りから始まるように見えます）。',
  '23': '23W の横の溝がない版として作りました。坂の形は合っていますか？',
  '22': '上の溝の中央に穴があり、斜めのまっすぐなトンネルで手前(S)の下の穴へ出ます。上の溝は穴の先（手前側）にも続いている、としています。',
  '7': 'トンネルは 手前(S)のまんなかの高さ → 右(E)の下の穴へ、曲がりながら下る、と読みました。8・9・10 も同じ考え方です。下の穴の高さ(中心0.2)は合っていますか？',
  '12': '穴から落ちて右(E)の「下の穴」へ出ます。11 は同じ形で「まんなかの高さ」へ出ます。',
  '15': 'トンネルは 右(E)まんなか → 左(W)下の穴 へのまっすぐな下り坂、と読みました（16・24・56 も同じ）。',
  '12Y': 'レビューを受けて直しました: 中のトンネルは 奥・手前・左 のどこから入っても、上の穴から落ちても、右(E)の下の穴へ出ます。',
  '114': '上の穴は底まで突き抜け。十字トンネル（まんなかの高さ）は素通り。下面は十字のうら溝。実物はどうつながっていますか？',
  '13L': 'レビューを受けて直しました: 上面は「奥→右」と「左→手前」の 90°カーブ2本が別々にある形。トンネルは前後(N-S)。',
  '13R': 'レビューを受けて直しました: 上面は 13L と同じ。トンネルは左右(E-W)としています（L / R の違いがこれで合っているか教えてください）。',
  '27': 'レビューを受けて直しました: 上面は「前後にまっすぐ」＋「奥(N)から右(E)へのカーブ」。28 は同じ考えで「奥(N)から左(W)へのカーブ」に直しています。',
  '28': '27 のレビューにあわせて直しました: 上面は「前後にまっすぐ」＋「奥(N)から左(W)へのカーブ」。合っていますか？',
  '29': '上面は前後にまっすぐ。トンネルは 手前(S)まんなか から入り、左(W)と右(E)の下の穴へ分かれます（半々）。',
  '92': 'レビューを受けて直しました: 穴から落ちて、左右それぞれのカーブで下の穴へ半々。左右の下の穴どうしは つながっていません。',
  '77': 'トンネル: 奥(N)まんなか → 手前(S)下の穴 の坂に、左(W)まんなか から合流。上面は 奥→右 のカーブ。78 は左右が逆。',
  '78': '77 の左右逆として作りました。',
  '54': '上面は 手前(S)から中央すこし先までの行き止まり（奥が高い坂）。トンネルは 7 と同じ。55 はトンネルが逆向き。',
  '56': '上面は 右(E)から入る長い行き止まり（奥が高い坂）。トンネルは 右まんなか → 左の下の穴 の坂。',
  'FN': '高さ半分。手前(S)から入る行き止まり（奥が高い坂）。坂の高さは端で 6mm 相当にしています。',
  'D5': '上面は同心の2本カーブ（手前→右）。トンネルは水平のカーブ。',
  'D7': '上面は Uターン（手前の左レーンから入り、右レーンへ戻る）。D8 はトンネルが逆向き。',
  'D9': '手前(S)の2レーンが、奥(N)の中央1本に合流。奥から来た玉は左右のレーンに半々。',
  'D15': '読み取りが不確かです。手前の2レーンのうち、左は左(W)へカーブ、右は奥(N)の中央へ、としています。',
  'D16': '読み取りが不確かです。D15 の左右逆として作りました。',
  'D22': '2レーンそれぞれに穴があり、2本の斜めトンネルで手前の下の穴（2つ）へ。',
  'KC': '1×2 の Uターン。長辺（右側）のとなりあう2マスを半円でつなぐ、と読み直しました。',
  'KL': '1×3。両端は中央で、途中が左右にうねる S字、と読みました。',
  'GU': '1×2。上面はまっすぐ、下面は横向きのうら溝が2本、と読みました。',
  'GCK': '1×2。上面は KC と同じ Uターン、下面は長辺方向のうら溝1本、と読みました。',
  'GW': '高さ半分。奥(N)の上の高さから、手前(S)の深い所（下の穴の高さ）へ下る坂。',
  'GCW': '1×2。両端は普通の高さで、途中で1回しずむ波（深さ 1cm 相当）。',
  'GLW': '1×3。途中で2回しずむ波。回数と深さは推定です。',
  'KWL': '高さ半分。左(W)の上の高さ → 手前(S)の深い所へ、曲がりながら下る。KWR は右から。',
  '42': 'じょうご。上から入れると 右(E)の下の穴へ。42L は手前(S)、42R は奥(N)に溝の入口が付く、と読みました（L / R の意味が不確か）。',
  '42L': 'じょうごに、手前(S)からの溝の入口。出口は右(E)の下の穴。',
  '42R': 'じょうごに、奥(N)からの溝の入口。出口は右(E)の下の穴。',
  '81': 'じょうご。右(E)の「まんなかの高さ」へ出る（42 は下の穴）。',
  '91': '11 とほぼ同じ（十字の溝＋すりばち状の穴 → 右のまんなか）。',
  '103': '上面はカーブ2本（左→手前、奥→右）。トンネルは十字。',
  '3': '上の溝とトンネルは同じ向き（前後）。下面のうら溝は横向き。',
  '11V': '下面は うらカーブ2本（手前→右、奥→右）が右で合わさる形。',
  'MJ': '高さ半分。上面全体がトランポリン（落ちた玉がはねる）。溝はなし。',
  'A': '三角のくさび。飾り・土台として、玉の道はなしにしています（斜面に溝があるように見えます。使い道があれば教えてください）。',
  'RD': 'かまぼこ形。飾り・土台として、玉の道はなし。',
};

const FACE_JA = { N: '奥(N)', S: '手前(S)', E: '右(E)', W: '左(W)', B: '底' };
const hLabel = (y, h) => {
  const tag = Math.abs(y - h) < 0.03 ? '上面' : Math.abs(y - 0.5) < 0.03 ? 'まんなか' : Math.abs(y - 0.2) < 0.03 ? '下の穴' : Math.abs(y) < 0.03 ? '底' : '';
  return `高さ${(y * 5).toFixed(1)}cm${tag ? '・' + tag : ''}`;
};
function describe(def) {
  const face = (p) => {
    const e = 0.02;
    if (Math.abs(p[0] - def.w / 2) < e) return 'E'; if (Math.abs(p[0] + def.w / 2) < e) return 'W';
    if (Math.abs(p[2] - def.d / 2) < e) return 'S'; if (Math.abs(p[2] + def.d / 2) < e) return 'N';
    if (Math.abs(p[1]) < e) return 'B'; return null;
  };
  return def.paths.filter((p) => !p.hidden).map((pa) => {
    const a = pa.pts[0], b = pa.pts[pa.pts.length - 1];
    const end = (p) => {
      const f = face(p);
      const lat = f === 'N' || f === 'S' ? p[0] : p[2];
      const pos = f ? FACE_JA[f] + (Math.abs(lat) > 0.01 && f !== 'B' ? `の${lat > 0 ? (f === 'N' || f === 'S' ? '右' : '手前') : (f === 'N' || f === 'S' ? '左' : '奥')}寄り` : '') : '中';
      return `${pos}（${hLabel(p[1], def.h)}）`;
    };
    const ys = pa.pts.map((p) => p[1]);
    const lo = Math.min(...ys), hi = Math.max(...ys);
    const kind = pa.kind === 'groove' ? '上面の溝' : pa.kind === 'tunnel' ? 'トンネル' : 'うら溝';
    const slope = hi - lo > 0.03 ? `／高さが ${(lo * 5).toFixed(1)}〜${(hi * 5).toFixed(1)}cm で変わる` : '／水平';
    return { cls: 'k-' + pa.kind[0], text: `${kind}: ${end(a)} → ${end(b)}${slope}` };
  });
}

// ---- 描画 ----
const SIZE = 400;
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
renderer.setSize(SIZE, SIZE, false);
renderer.setClearColor(0xffffff, 1);
const MAT = {
  wood: new THREE.MeshLambertMaterial({ color: 0xf0cf9a }),
  cut: new THREE.MeshLambertMaterial({ color: 0xc07f3c, side: THREE.DoubleSide }),
  woodX: new THREE.MeshLambertMaterial({ color: 0xf0cf9a, transparent: true, opacity: 0.2, depthWrite: false }),
  cutX: new THREE.MeshLambertMaterial({ color: 0x9db8dd, side: THREE.DoubleSide, transparent: true, opacity: 0.35, depthWrite: false }),
};
const LINE = { groove: 0xe8452c, tunnel: 0x1f6fd6, under: 0x4f9a22 };
const VIEWS = [
  { name: 'ななめ', see: false, pos: [3.2, 4.2, 5] },
  { name: 'ななめ（中）', see: true, pos: [3.2, 4.2, 5] },
  { name: '真上から（奥が上）', see: true, pos: [0, 8, 0.001] },
  { name: '前から（右が E）', see: true, pos: [0, 0.5, 8], level: true },
  { name: '右から（左が手前）', see: true, pos: [8, 0.5, 0], level: true },
];
function renderPart(id, view) {
  const def = PARTS[id];
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xffffff, 0xf2d9a8, 1.7));
  const l = new THREE.DirectionalLight(0xffffff, 1.4);
  l.position.set(-3, 8, 5);
  scene.add(l);
  scene.add(new THREE.Mesh(partGeometry(id), view.see ? [MAT.woodX, MAT.cutX] : [MAT.wood, MAT.cut]));
  if (view.see) {
    // 外形の線
    const box = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(def.w, def.h, def.d)),
      new THREE.LineBasicMaterial({ color: 0x8a7a5a }),
    );
    box.position.y = def.h / 2;
    if (def.shape === 'box') scene.add(box);
    for (const pa of def.paths) {
      if (pa.hidden) continue;
      const g = new THREE.BufferGeometry().setFromPoints(pa.pts.map((p) => new THREE.Vector3(p[0], p[1], p[2])));
      const line = new THREE.Line(g, new THREE.LineBasicMaterial({ color: LINE[pa.kind], depthTest: false }));
      line.renderOrder = 5;
      scene.add(line);
      // 太く見せるため、少しずらして重ねる
      for (const o of [[0.008, 0, 0], [0, 0.008, 0], [0, 0, 0.008], [-0.008, 0, 0], [0, -0.008, 0]]) {
        const l2 = line.clone();
        l2.position.set(o[0], o[1], o[2]);
        scene.add(l2);
      }
    }
  }
  const k = 0.62 + Math.max(def.w, def.d, def.h) * 0.42;
  const cam = new THREE.OrthographicCamera(-k, k, k, -k, 0.1, 50);
  cam.position.set(view.pos[0], view.pos[1], view.pos[2]);
  if (view.level) cam.position.y = def.h / 2;
  cam.lookAt(0, def.h / 2 - (view.level ? 0 : 0.05), 0);
  renderer.render(scene, cam);
  return renderer.domElement.toDataURL('image/png');
}

// ---- 画面 ----
const setsOf = {};
for (const s of SETS) for (const id of s.parts) (setsOf[id] ||= []).push(s.name);
const ids = Object.keys(PARTS);
// 質問のあるものを、質問を書いた順に先頭へ
// （数字だけの名前はオブジェクトの中で勝手に先頭へ並ぶので、順番は別に持つ）
const FIRST = ['23W', '22W', '23', '22', '12Y', '114', '13L', '13R', '27', '28', '29', '92', '77', '78', 'D15', 'D16', '42L', '42R', 'KC', 'KL', 'GU', 'GCK', 'GLW', 'GCW'];
const rank = (id) => (FIRST.includes(id) ? FIRST.indexOf(id) : QUESTIONS[id] ? 100 : 1000);
ids.sort((a, b) => rank(a) - rank(b));

let data = {};
const list = document.getElementById('list');
const savedEl = document.getElementById('saved');
let saveTimer = 0;
function save() {
  try { localStorage.setItem('korokoro-review', JSON.stringify(data)); } catch { /* 無視 */ }
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    fetch('./review-data', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(data) })
      .then((r) => { savedEl.textContent = r.ok ? '保存しました ' + new Date().toLocaleTimeString() : '保存に失敗（この端末には残っています）'; })
      .catch(() => { savedEl.textContent = '保存に失敗（この端末には残っています）'; });
  }, 500);
  refresh();
}
function refresh() {
  const done = ids.filter((id) => data[id]?.v).length;
  document.getElementById('count').textContent = `判定済み ${done} / ${ids.length}`;
  const onlyOpen = document.getElementById('only-open').checked, onlyQ = document.getElementById('only-q').checked;
  for (const el of list.children) {
    const id = el.dataset.id;
    const v = data[id]?.v || '';
    el.className = 'part ' + v;
    el.hidden = (onlyOpen && !!v) || (onlyQ && !QUESTIONS[id]);
    el.querySelectorAll('.judge button').forEach((b) => b.classList.toggle('on', b.dataset.v === v));
  }
}

function build() {
  const queue = [];
  for (const id of ids) {
    const def = PARTS[id];
    const el = document.createElement('section');
    el.dataset.id = id;
    const head = document.createElement('div');
    head.className = 'head';
    head.innerHTML = `<h2></h2><span class="sets"></span><span class="sets"></span>`;
    head.children[0].textContent = id;
    head.children[1].textContent = (setsOf[id] || []).join('・');
    head.children[2].textContent = `大きさ ${def.w}×${def.d}、高さ ${def.h}`;
    el.appendChild(head);
    if (QUESTIONS[id]) {
      const q = document.createElement('div');
      q.className = 'q';
      q.textContent = '確認したいこと: ' + QUESTIONS[id];
      el.appendChild(q);
    }
    const views = document.createElement('div');
    views.className = 'views';
    const fig0 = document.createElement('figure');
    const box0 = document.createElement('div');
    box0.className = 'box';
    const c = chartOf[id];
    if (c) {
      const ch = document.createElement('div');
      ch.className = 'chart';
      const Z = 1.5; // 図を大きく見せる
      ch.style.backgroundImage = `url(./charts/${c.file})`;
      ch.style.backgroundSize = `${1414 * Z}px auto`;
      ch.style.backgroundPosition = `${-c.col * 225 * Z + 4}px ${-c.row * 224 * Z + 4}px`;
      box0.appendChild(ch);
    } else {
      box0.innerHTML = '<span class="nochart">図なし</span>';
    }
    fig0.append(box0, '公式の図');
    views.appendChild(fig0);
    for (const v of VIEWS) {
      const fig = document.createElement('figure');
      const box = document.createElement('div');
      box.className = 'box';
      const img = document.createElement('img');
      img.alt = `${id} ${v.name}`;
      box.appendChild(img);
      fig.append(box, v.name);
      views.appendChild(fig);
      queue.push([id, v, img]);
    }
    el.appendChild(views);
    const ul = document.createElement('ul');
    ul.className = 'desc';
    const d = describe(def);
    if (!d.length) d.push({ cls: '', text: '玉の道なし' });
    for (const row of d) {
      const li = document.createElement('li');
      li.className = row.cls;
      li.textContent = row.text;
      ul.appendChild(li);
    }
    el.appendChild(ul);
    const judge = document.createElement('div');
    judge.className = 'judge';
    for (const [v, label] of [['ok', '○ 合っている'], ['ng', '× ちがう'], ['unk', '？ 分からない']]) {
      const b = document.createElement('button');
      b.dataset.v = v;
      b.textContent = label;
      b.addEventListener('click', () => {
        data[id] = { ...(data[id] || {}), v: data[id]?.v === v ? '' : v };
        save();
      });
      judge.appendChild(b);
    }
    const ta = document.createElement('textarea');
    ta.placeholder = 'ちがう所・気づいたこと（任意）';
    ta.value = data[id]?.note || '';
    ta.addEventListener('input', () => { data[id] = { ...(data[id] || {}), note: ta.value }; save(); });
    judge.appendChild(ta);
    el.appendChild(judge);
    list.appendChild(el);
  }
  // 絵は順に作る（画面を止めない）
  const next = () => {
    for (let i = 0; i < 3 && queue.length; i++) {
      const [id, v, img] = queue.shift();
      img.src = renderPart(id, v);
    }
    if (queue.length) setTimeout(next, 0);
  };
  next();
  refresh();
}

document.getElementById('only-open').addEventListener('change', refresh);
document.getElementById('only-q').addEventListener('change', refresh);

(async () => {
  try { data = JSON.parse(localStorage.getItem('korokoro-review') || '{}') || {}; } catch { data = {}; }
  try {
    const r = await fetch('./review-data');
    if (r.ok) { const remote = await r.json(); if (remote && Object.keys(remote).length) data = { ...data, ...remote }; }
  } catch { /* サーバーなしでも見られる */ }
  build();
})();

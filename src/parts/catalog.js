// パーツ定義。形の根拠は docs/research/element-notes.md（公式の一覧図の読み取り）。
// 向き: N(z=-0.5 奥) E(x=+0.5 右) S(z=+0.5 手前) W(x=-0.5 左)
import { P, FACE_DIR, line, bezier, arc, sline, resample, join } from './dsl.js';

export const MID = 0.5; // 中のトンネルの高さ
export const LOW = 0.2; // 下の穴の高さ
export const R_CH = 0.2; // みぞ・トンネルの半径
export const R_DUO = 0.18;

const G = (pts, o = {}) => ({ kind: 'groove', pts, r: R_CH, ...o });
const T = (pts, o = {}) => ({ kind: 'tunnel', pts, r: R_CH, ...o });
const U = (pts, o = {}) => ({ kind: 'under', pts, r: R_CH, ...o });

// --- 上面のみぞ ---
const gLine = (a, b, H = 1) => G(line(P(a, H), P(b, H)));
const gArc = (a, b, H = 1) => G(arc(P(a, H), P(b, H)));
const gCross = (H = 1) => [gLine('N', 'S', H), gLine('W', 'E', H)];
const gToCenter = (faces, H = 1) => faces.map((f) => G(line(P(f, H), [0, H, 0])));
// 行き止まりのみぞ（54 / 55 / 56 / FN）。面 f から入り、中心をこえて t だけ進んだ所で止まる。
// 実物どおり、行き止まりに向かって ゆるい上り坂（みぞが浅くなる）。
// 入ってきた玉は坂で折り返して戻り（Iターン）、置いた玉は自分で転がり出す。
const DEAD_RISE = 0.12;
const gDead = (f, t, H = 1) => {
  const d = FACE_DIR[f];
  const a = P(f, H), b = [-d[0] * t, H, -d[2] * t];
  const raw = [];
  for (let i = 0; i <= 30; i++) {
    const s = i / 30;
    raw.push([a[0] + (b[0] - a[0]) * s, H + DEAD_RISE * s * s, a[2] + (b[2] - a[2]) * s]);
  }
  return G(resample(raw), { ramp: true });
};

// --- 中のトンネル ---
const tLine = (a, b, ya = MID, yb = MID) => T(ya === yb ? line(P(a, ya), P(b, yb)) : sline(P(a, ya), P(b, yb)));
const tArc = (a, b, ya = MID, yb = MID) => T(arc(P(a, ya), P(b, yb)));
const dropTo = (f, y, H = 1) =>
  T(bezier([0, H, 0], [0, -1, 0], P(f, y), FACE_DIR[f], (H - y) * 0.75), { hole: true });

// --- うらみぞ（下面）---
const uLine = (a, b) => U(line(P(a, 0), P(b, 0)));
const uArc = (a, b) => U(arc(P(a, 0), P(b, 0)));

// 円弧（中心 c のまわり、半径 r、角度 a0→a1、高さ y0→y1）。角度 0 は +x、π/2 は +z
function arcAround(cx, cz, r, a0, a1, y0, y1 = y0) {
  const raw = [];
  const N = 48;
  for (let i = 0; i <= N; i++) {
    const s = i / N;
    const a = a0 + (a1 - a0) * s;
    raw.push([cx + r * Math.cos(a), y0 + (y1 - y0) * s, cz + r * Math.sin(a)]);
  }
  return resample(raw);
}

const crossHole = (f, y) => [...gToCenter(['N', 'E', 'S', 'W']), dropTo(f, y)];

// ランプ（23 / 23W / 22W）: N の上みぞから S の下(LOW)へ下る、上があいた深いみぞ。
// 下りは早く、まんなか(RAMP_C)ではもう半分ほど落ちている。
// 23W / 22W の横のみぞは水平ではなく、まんなかへ向かって坂に落ちこむ。
const RAMP_C = [0, 0.55, 0];
const RAMP_DIR = [0, -0.75, 0.66];
const rampUpper = () => G(bezier(P('N', 1), [0, 0, 1], RAMP_C, RAMP_DIR, 0.25), { ramp: true });
const rampLower = () => G(bezier(RAMP_C, RAMP_DIR, P('S', LOW), [0, -0.2, 0.98], 0.2), { ramp: true });
const rampSide = (f) => {
  const d = FACE_DIR[f];
  return G(bezier(P(f, 1), [-d[0], 0, -d[2]], RAMP_C, [-d[0] * 0.6, -0.8, -d[2] * 0.6], 0.22), { ramp: true });
};

const parts = {};
function def(id, o) {
  const p = { id, w: 1, d: 1, h: 1, shape: 'box', paths: [], cuts: [], ...o };
  // 半分の高さで みぞのあるパーツは、うらがえして使える（トンネルの屋根にする・うらみぞを上にする）
  if (p.flippable === undefined) {
    p.flippable = p.h === 0.5 && p.shape === 'box' && p.paths.some((q) => q.kind !== 'tunnel') && !p.paths.some((q) => q.sink);
  }
  parts[id] = p;
}

// ============ standard ============
def('1', {});
def('2', { paths: [gLine('W', 'E'), tLine('W', 'E')] });
def('3', { paths: [gLine('N', 'S'), tLine('N', 'S'), uLine('W', 'E')] });
def('4', { paths: [...gCross(), tLine('W', 'E')] });
def('5', { paths: [gArc('S', 'E'), tLine('W', 'E')] });
def('6', { paths: [gArc('N', 'E'), tLine('W', 'E')] });
def('7', { paths: [gArc('W', 'S'), tArc('S', 'E', MID, LOW)] });
def('8', { paths: [gArc('S', 'E'), tArc('S', 'W', MID, LOW)] });
def('9', { paths: [gLine('N', 'S'), tArc('S', 'E', MID, LOW)] });
def('10', { paths: [gLine('N', 'S'), tArc('S', 'W', MID, LOW)] });
def('11', { paths: crossHole('E', MID) });
def('12', { paths: crossHole('E', LOW) });
const sink = (H = 1, depth = 0.75) => T(line([0, H, 0], [0, H - depth, 0]), { sink: true, hidden: true });
def('MK', {
  paths: [...gToCenter(['N', 'E', 'S', 'W']), sink()],
  cuts: [{ type: 'cyl', r: 0.36, y0: 0.12, y1: 1.05 }],
});

// ============ SPEED ============
def('14', { paths: [...gCross(), tLine('W', 'E'), tLine('N', 'S')] });
def('15', { paths: [gArc('S', 'E'), tLine('E', 'W', MID, LOW)] });
def('16', { paths: [gArc('N', 'E'), tLine('E', 'W', MID, LOW)] });
def('21', { paths: [...crossHole('E', MID), uLine('N', 'S')] });
def('22', {
  paths: [
    ...gToCenter(['N', 'S']),
    T(bezier([0, 1, 0], [0, -1, 0.25], P('S', LOW), [0, -0.5, 0.86], 0.2), { hole: true }),
  ],
});
const ramp3 = () => [rampUpper(), rampLower(), rampSide('E'), rampSide('W')];
def('22W', { paths: ramp3() });
def('23', { paths: [G(join(rampUpper().pts, rampLower().pts), { ramp: true })] });
def('23W', { paths: ramp3() });
def('24', { paths: [gLine('N', 'S'), tLine('E', 'W', MID, LOW)] });
def('71', { paths: [...crossHole('E', MID), uLine('W', 'E')] });

// ============ TUNNEL ============
// 12Y: 中のトンネルは 奥・手前・左 のどこから入っても、上の穴から落ちても、右(E)の下の穴へ出る
def('12Y', {
  paths: [
    ...gToCenter(['N', 'E', 'S', 'W']),
    dropTo('E', LOW),
    tLine('W', 'E', MID, LOW),
    tArc('N', 'E', MID, LOW),
    tArc('S', 'E', MID, LOW),
  ],
});
def('51', { paths: [...crossHole('E', MID), uArc('S', 'E')] });
def('61', { paths: [...crossHole('E', MID), uArc('N', 'E')] });
def('64', { paths: [gArc('S', 'E'), tArc('S', 'E')] });
def('67', { paths: [gArc('W', 'S'), tArc('S', 'E')] });
def('68', { paths: [gArc('S', 'E'), tArc('S', 'W')] });
def('69', { paths: [gLine('N', 'S'), tArc('S', 'E')] });
def('70', { paths: [gLine('N', 'S'), tArc('S', 'W')] });
def('103', { paths: [gArc('W', 'S'), gArc('N', 'E'), tLine('W', 'E'), tLine('N', 'S')] });

// ============ DUO ============
const A = 0.25; // レーンのずれ
const D = { r: R_DUO };
const funnel = (y, entries = []) => ({
  paths: [...gToCenter(entries), { ...dropTo('E', y), funnel: 0.4 }],
  cuts: [{ type: 'cone', r0: 0.43, r1: R_CH, y0: 0.72, y1: 1.02 }],
});
def('42', funnel(LOW));
def('D3', {
  paths: [
    G(line([-A, 1, -0.5], [-A, 1, 0.5]), D),
    G(line([A, 1, -0.5], [A, 1, 0.5]), D),
    tLine('N', 'S'),
    uLine('W', 'E'),
  ],
});
def('D5', {
  paths: [
    G(arcAround(0.5, 0.5, 0.25, Math.PI, Math.PI * 1.5, 1), D),
    G(arcAround(0.5, 0.5, 0.75, Math.PI, Math.PI * 1.5, 1), D),
    tArc('S', 'E'),
  ],
});
const uTurn = () =>
  G(
    [
      ...line([-A, 1, 0.5], [-A, 1, -0.05]),
      ...arcAround(0, -0.05, A, Math.PI, Math.PI * 2, 1).slice(1),
      ...line([A, 1, -0.05], [A, 1, 0.5]).slice(1),
    ],
    D,
  );
def('D7', { paths: [uTurn(), tArc('S', 'E', MID, LOW)] });
def('D8', { paths: [uTurn(), tArc('S', 'W', MID, LOW)] });
const lane = (x, to, dir, k = 0.45) => G(bezier([x, 1, 0.5], [0, 0, -1], to, dir, k), D);
def('D9', { paths: [lane(-A, P('N', 1), [0, 0, -1]), lane(A, P('N', 1), [0, 0, -1]), tLine('N', 'S')] });
def('D15', {
  paths: [lane(-A, P('W', 1), [-1, 0, 0], 0.3), lane(A, P('N', 1), [0, 0, -1]), tArc('S', 'W')],
});
def('D16', {
  paths: [lane(A, P('E', 1), [1, 0, 0], 0.3), lane(-A, P('N', 1), [0, 0, -1]), tArc('S', 'E')],
});
const laneHole = (x) => [
  G(line([x, 1, -0.5], [x, 1, 0]), D),
  G(line([x, 1, 0.5], [x, 1, 0]), D),
  T(bezier([x, 1, 0], [0, -1, 0.25], [x, LOW, 0.5], [0, -0.5, 0.86], 0.2), { hole: true, r: R_DUO }),
];
def('D22', { paths: [...laneHole(-A), ...laneHole(A)] });

// ============ TRICK ============
def('11T', { paths: [...crossHole('E', MID), uLine('W', 'E'), uLine('N', 'S')] });
// 13: 上面は 90°カーブが2本、別々にある（奥→右 と 左→手前）
const top13 = () => [gArc('N', 'E'), gArc('W', 'S')];
def('13L', { paths: [...top13(), tLine('N', 'S')] });
def('13R', { paths: [...top13(), tLine('W', 'E')] });
// 27 / 28: まっすぐ＋奥(N)から横へのカーブ（奥から来た玉が 直進とカーブに分かれる）
def('27', { paths: [gLine('N', 'S'), gArc('N', 'E'), tLine('N', 'S')] });
def('28', { paths: [gLine('N', 'S'), gArc('N', 'W'), tLine('N', 'S')] });
def('29', { paths: [gLine('N', 'S'), tArc('S', 'W', MID, LOW), tArc('S', 'E', MID, LOW)] });
def('54', { paths: [gDead('S', 0.05), tArc('S', 'E', MID, LOW)] });
def('55', { paths: [gDead('S', 0.05), tArc('S', 'W', MID, LOW)] });
def('56', { paths: [gDead('E', 0.25), tLine('E', 'W', MID, LOW)] });
def('92', {
  paths: [
    ...gToCenter(['N', 'S']),
    // 落ちた先は 左右それぞれのカーブで下の穴へ。左右の穴どうしは つながっていない
    dropTo('E', LOW),
    dropTo('W', LOW),
  ],
});
def('114', {
  paths: [
    ...gToCenter(['N', 'E', 'S', 'W']),
    T(line([0, 1, 0], [0, 0, 0]), { hole: true }),
    tLine('W', 'E'),
    tLine('N', 'S'),
    uLine('W', 'E'),
    uLine('N', 'S'),
  ],
});

// ============ PRO ============
def('11V', { paths: [...crossHole('E', MID), uArc('S', 'E'), uArc('N', 'E')] });
def('25', { paths: [gArc('S', 'E'), tLine('N', 'S'), uLine('W', 'E')] });
def('26', { paths: [gArc('W', 'S'), tLine('N', 'S'), uLine('W', 'E')] });
def('30', { paths: [gLine('W', 'E'), tLine('W', 'E'), uLine('W', 'E')] });
def('35', { paths: [gLine('W', 'E'), tLine('W', 'E'), uArc('S', 'E')] });
def('36', { paths: [gLine('W', 'E'), tLine('W', 'E'), uArc('N', 'E')] });
def('43', { paths: [gLine('N', 'S'), tArc('S', 'E'), uLine('N', 'S')] });
def('45', { paths: [gArc('S', 'E'), tArc('S', 'E'), uArc('S', 'W')] });
def('46', { paths: [gArc('W', 'S'), tArc('S', 'W'), uArc('S', 'E')] });
const yTunnel = (side) => [
  T(sline(P('N', MID), [0, 0.38, 0])),
  T(sline([0, 0.38, 0], P('S', LOW))),
  T(bezier(P(side, MID), FACE_DIR[side].map((v) => -v), [0, 0.38, 0], [0, -0.3, 1], 0.3)),
];
def('77', { paths: [gArc('N', 'E'), ...yTunnel('W')] });
def('78', { paths: [gArc('W', 'N'), ...yTunnel('E')] });

// ============ 半分の高さ・レール（JUNIOR / WAVE / SUB / MAGNET / JUMP）============
const H2 = 0.5;
const rail = (d) => G(line([0, H2, -d / 2], [0, H2, d / 2]));
def('1/2', { h: H2 });
def('R', { shape: 'cyl' });
def('RO', { shape: 'cyl', h: H2 });
def('RD', { shape: 'dome', h: H2 });
// A: 三角のくさび。斜面のまんなかに、奥行き方向の丸いみぞ（高さ 0.5 = 半分ブロックのみぞと同じ高さ）。
// 実物はいろいろな向きに置いて使うが、ここでは この向き（底を下）だけ。
def('A', { shape: 'wedge', paths: [G(line([0, H2, -0.5], [0, H2, 0.5]), { round: true })] });
def('42L', funnel(LOW, ['S']));
def('42R', funnel(LOW, ['N']));
def('81', funnel(MID));
def('91', {
  paths: crossHole('E', MID),
  cuts: [{ type: 'cone', r0: 0.34, r1: R_CH, y0: 0.86, y1: 1.02 }],
});
def('FN', { h: H2, paths: [gDead('S', 0.15, H2)] });
def('K', { h: H2, paths: [gArc('W', 'S', H2)] });
// KC: 1×2 の Uターン。E 面のとなりあう2マスを 半円でつなぐ
const uCurve = () => G(arcAround(0.5, 0, 0.5, Math.PI / 2, Math.PI * 1.5, H2));
def('KC', { h: H2, d: 2, paths: [uCurve()] });
// KL: 1×3 の S字。両はしは まんなか、とちゅうで 左右にうねる
const snake = () => {
  const raw = [];
  for (let i = 0; i <= 90; i++) {
    const t = i / 90;
    raw.push([0.2 * Math.sin(2 * Math.PI * t) * (1 - Math.cos(2 * Math.PI * t)) * 0.65, H2, 1.5 - 3 * t]);
  }
  return G(resample(raw));
};
def('KL', { h: H2, d: 3, paths: [snake()] });
def('G', { h: H2, paths: [rail(1)] });
def('GC', { h: H2, d: 2, paths: [rail(2)] });
def('GL', { h: H2, d: 3, paths: [rail(3)] });
def('GG', { h: H2, d: 4, paths: [rail(4)] });
def('X/2', { h: H2, paths: gCross(H2) });
def('M', {
  h: H2,
  paths: [...gToCenter(['N', 'E', 'S', 'W'], H2), sink(H2, 0.28)],
  cuts: [{ type: 'cyl', r: 0.36, y0: 0.1, y1: 0.55 }],
});

// WAVE
const wave = (d, n) => {
  const raw = [];
  const N = 80;
  for (let i = 0; i <= N; i++) {
    const s = i / N;
    raw.push([0, H2 - 0.2 * Math.sin(Math.PI * n * s) ** 2, -d / 2 + d * s]);
  }
  return G(resample(raw), { ramp: true });
};
def('KWL', { h: H2, paths: [G(arc(P('W', H2), P('S', LOW)), { ramp: true })] });
def('KWR', { h: H2, paths: [G(arc(P('E', H2), P('S', LOW)), { ramp: true })] });
def('GW', {
  h: H2,
  paths: [G(bezier(P('N', H2), [0, 0, 1], P('S', LOW), [0, -0.2, 0.98], 0.4), { ramp: true })],
});
def('GCW', { h: H2, d: 2, paths: [wave(2, 1)] });
def('GLW', { h: H2, d: 3, paths: [wave(3, 2)] });

// SUB（うらがえして、うらみぞを上にしても使う）
def('GX', { h: H2, paths: [gLine('N', 'S', H2), uLine('W', 'E')] });
def('GKL', { h: H2, paths: [gLine('W', 'E', H2), uArc('S', 'E')] });
def('GKR', { h: H2, paths: [gLine('W', 'E', H2), uArc('N', 'E')] });
def('GCK', { h: H2, d: 2, paths: [uCurve(), U(line([0, 0, -1], [0, 0, 1]))] });
def('GU', { h: H2, d: 2, paths: [rail(2), U(line([-0.5, 0, 0.5], [0.5, 0, 0.5])), U(line([-0.5, 0, -0.5], [0.5, 0, -0.5]))] });

// JUMP
def('MJ', { h: H2, bounce: true });

// MAGNET（形は 11 / 12 / G / GC と同じ）
def('11M', { paths: crossHole('E', MID), magnet: true });
def('12M', { paths: crossHole('E', LOW), magnet: true });
def('GM', { h: H2, paths: [rail(1)], magnet: true });
def('GCM', { h: H2, d: 2, paths: [rail(2)], magnet: true });

export const PARTS = parts;

// セット（パレットのタブ）。色は 公式の箱の色（箱の写真から読み取り）。
// MAGNET は「磁石で宙に浮かせる」が再現できないので、タブから外している（パーツ定義は残してある）
export const SETS = [
  { id: 'standard', name: 'きほん', color: '#F3CC34',
    parts: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', 'MK'] },
  { id: 'junior', name: 'ジュニア', color: '#92D34D',
    parts: ['1', '1/2', 'G', 'GC', 'GL', 'GG', 'K', 'KC', 'KL', 'X/2', 'FN', '3', '23W', '42', '42L', '42R', '91', 'M', 'R', 'RO', 'RD', 'A'] },
  { id: 'speed', name: 'スピード', color: '#31C6E5',
    parts: ['14', '15', '16', '21', '22', '22W', '23', '24', '71'] },
  { id: 'tunnel', name: 'トンネル', color: '#F26452',
    parts: ['12Y', '51', '61', '64', '67', '68', '69', '70', '103'] },
  { id: 'duo', name: 'デュオ', color: '#00D49C',
    parts: ['D3', 'D5', 'D7', 'D8', 'D9', 'D15', 'D16', 'D22', '42'] },
  { id: 'trick', name: 'トリック', color: '#FD7F19',
    parts: ['11T', '13L', '13R', '27', '28', '29', '54', '55', '56', '92', '114'] },
  { id: 'pro', name: 'プロ', color: '#0097E9',
    parts: ['11V', '25', '26', '30', '35', '36', '43', '45', '46', '77', '78'] },
  { id: 'wave', name: 'ウェーブ', color: '#01D0D6',
    parts: ['GW', 'GCW', 'GLW', 'KWL', 'KWR', '23W', 'K', 'FN', '1/2', 'M'] },
  { id: 'sub', name: 'サブ', color: '#F89375',
    parts: ['GX', 'GKL', 'GKR', 'GCK', 'GU', '11T', '1/2', 'M'] },
  { id: 'jump', name: 'ジャンプ', color: '#AB8CD4',
    parts: ['MJ', '81', '22', '23W', 'R', '1/2', 'M'] },
];

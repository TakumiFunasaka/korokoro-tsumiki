import { describe, it, expect } from 'vitest';
import { PARTS } from '../src/parts/catalog.js';
import { makePiece, settle, center } from '../src/sim/world.js';
import { buildTrack } from '../src/sim/track.js';
import { makeMarble, stepMarble } from '../src/sim/marble.js';

// cell 単位で置く（1マス = 半マス2つ）
const put = (list) => {
  const pieces = list.map(([type, cx, cz, rot = 0]) => makePiece(type, cx * 2, cz * 2, rot));
  // 同じ場所は書いた順に積む
  pieces.forEach((p, i) => (p.y = i * 0.001));
  settle(pieces);
  return pieces;
};

function run(pieces, at, toward = null, seed = 1) {
  const track = buildTrack(pieces);
  const m = makeMarble(at, toward);
  let x = (seed * 2654435761) % 2147483647 || 1;
  const rng = () => ((x = (x * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 5; i++) rng();
  for (let i = 0; i < 60 * 120 && m.mode !== 'rest'; i++) stepMarble(m, track, 1 / 60, rng);
  return m;
}

const topOf = (pieces, i) => {
  const c = center(pieces[i]);
  return [c[0], c[1] + PARTS[pieces[i].type].h, c[2]];
};

describe('みちのつながり', () => {
  it('ランプ → みぞ → みぞ → 玉うけ で ゴール', () => {
    const ps = put([['1', 0, 0], ['23', 0, 0], ['2', 0, 1, 1], ['2', 0, 2, 1], ['MK', 0, 3]]);
    const start = topOf(ps, 1);
    start[2] -= 0.4; // ランプの上のはし
    const m = run(ps, start);
    expect(m.reason).toBe('goal');
  });

  it('とちゅうが ぬけていると つくえに おちる', () => {
    const ps = put([['1', 0, 0], ['23', 0, 0], ['2', 0, 1, 1], ['MK', 0, 3]]);
    const start = topOf(ps, 1);
    start[2] -= 0.4;
    const m = run(ps, start);
    expect(['out', 'fell']).toContain(m.reason);
  });

  it('みぞの先が かべ だと つまる', () => {
    const ps = put([['1', 0, 0], ['23', 0, 0], ['2', 0, 1, 1], ['1', 0, 2]]);
    const start = topOf(ps, 1);
    start[2] -= 0.4;
    const m = run(ps, start);
    expect(m.reason).toBe('wall');
  });

  it('みぞの上に ふつうの立方体をのせると ふさがる', () => {
    const ps = put([['1', 0, 0], ['23', 0, 0], ['2', 0, 1, 1], ['2', 0, 2, 1], ['1', 0, 2], ['MK', 0, 3]]);
    const start = topOf(ps, 1);
    start[2] -= 0.4;
    const m = run(ps, start);
    expect(['covered', 'wall']).toContain(m.reason);
  });

  it('うらみぞのある 3 をのせれば 通れる', () => {
    const ps = put([['1', 0, 0], ['23', 0, 0], ['2', 0, 1, 1], ['2', 0, 2, 1], ['3', 0, 2, 1], ['MK', 0, 3]]);
    const start = topOf(ps, 1);
    start[2] -= 0.4;
    const m = run(ps, start);
    expect(m.reason).toBe('goal');
  });

  it('11 の穴に落ちて、となりのトンネルへ出る', () => {
    // 11 は E(MID) に出る。となりの 2 のトンネル(E-W)を通って、その先の 12 … ではなく つくえへ
    const ps = put([['11', 0, 0], ['2', 1, 0]]);
    const start = topOf(ps, 0);
    start[0] -= 0.4;
    const m = run(ps, start, center(ps[0]));
    expect(m.pos[0]).toBeGreaterThan(1.5);
    expect(['out', 'fell']).toContain(m.reason);
  });

  it('平らなみぞだけでは とちゅうで とまる', () => {
    const list = [];
    for (let i = 0; i < 14; i++) list.push(['2', i, 0]);
    const ps = put(list);
    const start = topOf(ps, 0);
    start[0] -= 0.3;
    const m = run(ps, start, [5, 0, 0]);
    expect(m.reason).toBe('stop');
    expect(m.pos[0]).toBeGreaterThan(1);
  });

  it('LOW の穴から出た玉は 1段下のみぞに乗る', () => {
    // 9: トンネル S(MID)→E(LOW)。rot=1 で S→E, E→N になる … そのまま使う
    // 2段目に 9、E のとなりの1段目に 2（みぞ E-W）
    const ps = put([['1', 0, 0], ['2', 0, 1], ['9', 0, 0], ['2', 1, 0], ['MK', 2, 0]]);
    // 9 のトンネルの S 口（MID）へ、手前の 2 … はトンネルが E-W なので使わず、直接トンネルに入れない。
    // かわりに 9 の上みぞ(N-S)は使わず、12 で代用: 穴→E(LOW)
    const ps2 = put([['1', 0, 0], ['12', 0, 0], ['2', 1, 0], ['MK', 2, 0]]);
    const start = topOf(ps2, 1);
    start[0] -= 0.4;
    const m = run(ps2, start, center(ps2[1]));
    expect(m.reason).toBe('goal');
    void ps;
  });
});

describe('全パーツ', () => {
  for (const id of Object.keys(PARTS)) {
    it(`${id} 単体で玉を落としてもこわれない`, () => {
      for (const rot of [0, 1]) {
        const ps = put([[id, 0, 0, rot]]);
        const track = buildTrack(ps);
        for (const path of track.paths) {
          expect(path.len).toBeGreaterThan(0);
          for (const p of path.pts) expect(p.every(Number.isFinite)).toBe(true);
        }
        const starts = track.paths.filter((p) => p.kind === 'groove').map((p) => p.pts[2]);
        starts.push(topOf(ps, 0));
        for (const st of starts) {
          const m = makeMarble(st);
          for (let i = 0; i < 60 * 100 && m.mode !== 'rest'; i++) stepMarble(m, track, 1 / 60);
          expect(m.mode).toBe('rest');
          expect(m.pos.every(Number.isFinite)).toBe(true);
        }
      }
    });
  }
});

import { DEMO, DEMO_START } from '../src/demo.js';
describe('おてほん', () => {
  it('おてほんコースは ゴールする', () => {
    const ps = put(DEMO);
    const top = ps.filter((p) => p.hx === DEMO_START.cell[0] * 2 && p.hz === DEMO_START.cell[1] * 2).pop();
    const c = center(top);
    const o = DEMO_START.offset;
    for (let seed = 1; seed < 6; seed++) {
      const m = run(ps, [c[0] + o[0], c[1] + PARTS[top.type].h + o[1], c[2] + o[2]], c, seed);
      expect(m.reason).toBe('goal');
    }
  });
});

// 半マス単位で直接置く
const putH = (list) => {
  const pieces = list.map(([type, hx, hz, rot = 0]) => makePiece(type, hx, hz, rot));
  pieces.forEach((p, i) => (p.y = i * 0.001));
  settle(pieces);
  return pieces;
};
const seeds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

describe('とくべつなパーツ', () => {
  it('22: みぞの穴に落ちて S の下の穴から出る', () => {
    const ps = put([['1', 0, 0], ['22', 0, 0]]);
    const c = center(ps[1]);
    const m = run(ps, [c[0], c[1] + 1, c[2] - 0.4], c);
    expect(m.pos[2]).toBeGreaterThan(c[2] + 0.5); // S 側へ出た
    expect(['out', 'fell']).toContain(m.reason);
  });

  it('42 じょうご: 上から入れると E の下から出て、となりの1段下のみぞに乗る', () => {
    const ps = put([['1', 0, 0], ['42', 0, 0], ['2', 1, 0], ['MK', 2, 0]]);
    const c = center(ps[1]);
    const m = run(ps, [c[0] + 0.2, c[1] + 1, c[2] + 0.1]);
    expect(m.reason).toBe('goal');
  });

  it('D9: 1本から2本へ、どちらのレーンにも分かれる', () => {
    const lanes = new Set();
    for (const seed of seeds) {
      const ps = put([['2', 0, 0, 1], ['D9', 0, 1]]);
      const c = center(ps[0]);
      const m = run(ps, [c[0], 1, c[2] - 0.4], c, seed);
      lanes.add(Math.sign(m.trail.find((p) => p[2] > 1.9)?.[0] - 0.5));
    }
    expect(lanes.has(1) && lanes.has(-1)).toBe(true);
  });

  it('29: Y字トンネルで 左右どちらにも出る', () => {
    const sides = new Set();
    for (const seed of seeds) {
      // 11 を回して出口を S に向け（rot3: E→S）、S となりの 29 を N 口が受けるように回す（rot2: S→N）
      const ps = put([['11', 0, 0, 3], ['29', 0, 1, 2]]);
      const c = center(ps[0]);
      const m = run(ps, [c[0] - 0.4, 1, c[2]], c, seed);
      sides.add(Math.sign(m.pos[0] - 0.5));
    }
    expect(sides.has(1) && sides.has(-1)).toBe(true);
  });

  it('12 の下の穴 → GW の深いみぞ → レール → 玉うけ', () => {
    const ps = put([['12', 0, 0], ['GW', 1, 0, 3], ['G', 2, 0, 1], ['M', 3, 0]]);
    const c = center(ps[0]);
    const m = run(ps, [c[0] - 0.4, 1, c[2]], c);
    expect(m.reason).toBe('goal');
  });

  it('波のレール GCW / GLW を通りぬける', () => {
    const ps = [];
    // 23 は床に置くと出口が床すれすれ。半分ブロックの深い所とは合わないので、ここでは 23 を使わず GW から
    const ps2 = putH([['1/2', 0, 0], ['GW', 0, 0], ['G', 0, 2], ['GCW', 0, 4], ['GLW', 0, 8], ['M', 0, 14]]);
    const c = center(ps2[1]);
    // GW の高い側(N)から。出口は LOW なので、次の G(高さ0.5) のみぞには上から落ちて乗る
    const m = run(ps2, [c[0], c[1] + 0.5, c[2] - 0.4], c);
    expect(m.reason).toBe('goal');
    void ps;
  });

  it('KC（Uターン）で 折り返して となりのレールへ', () => {
    // 23(半分ブロックの上・西向き) → G → KC で折り返し → G → M
    const ps = putH([['1/2', 4, 0], ['23', 4, 0, 3], ['G', 2, 0, 1], ['KC', 0, 0], ['G', 2, 2, 1], ['M', 4, 2]]);
    const c = center(ps[1]);
    const m = run(ps, [c[0] + 0.4, c[1] + 1, c[2]], c);
    expect(m.reason).toBe('goal');
  });

  it('MJ トランポリンで はねる', () => {
    const ps = put([['MJ', 0, 0]]);
    const track = buildTrack(ps);
    const m = makeMarble([0.5, 2.5, 0.5]);
    let bounces = 0, prevVy = 0;
    for (let i = 0; i < 600 && m.mode !== 'rest'; i++) {
      stepMarble(m, track, 1 / 120);
      if (prevVy < 0 && m.vel[1] > 1) bounces++;
      prevVy = m.vel[1];
    }
    expect(bounces).toBeGreaterThanOrEqual(3);
  });

  it('92: 穴から落ちて 左右どちらにも出る', () => {
    const sides = new Set();
    for (const seed of seeds) {
      const ps = put([['1', 0, 0], ['92', 0, 0]]);
      const c = center(ps[1]);
      const m = run(ps, [c[0], c[1] + 1, c[2] - 0.4], c, seed);
      sides.add(Math.sign(m.pos[0] - 0.5));
    }
    expect(sides.has(1) && sides.has(-1)).toBe(true);
  });

  it('FN の行き止まりは上り坂: 入った玉が折り返して戻る（Iターン）', () => {
    const ps = put([['FN', 0, 0], ['G', 0, 1]]);
    const track = buildTrack(ps);
    const m = makeMarble([0.5, 0.5, 1.85], [0.5, 0, 1.5]);
    let minZ = 9;
    for (let i = 0; i < 6000 && m.mode !== 'rest'; i++) { stepMarble(m, track, 1 / 60); minZ = Math.min(minZ, m.pos[2]); }
    expect(minZ).toBeLessThan(0.7); // FN の奥まで入った
    expect(m.pos[2]).toBeGreaterThan(2); // 戻って反対側へ出た
    expect(m.wallT).toBeLessThan(0); // かべには当たっていない
  });

  it('54 の行き止まりに置いた玉は 自分で転がり出す', () => {
    const ps = put([['54', 0, 0]]);
    const m = run(ps, [0.5, 1.1, 0.5]);
    expect(m.pos[2]).toBeGreaterThan(1);
  });

  it('23W / 22W: 横から入っても 素通りせず 坂へ落ちる', () => {
    for (const id of ['23W', '22W']) {
      for (const seed of [1, 2, 3, 4, 5, 6]) {
        // 西のとなりのみぞから 東向きに入る。坂は S へ下る
        const ps = put([['1', 0, 0], ['1', 1, 0], ['2', 0, 0], [id, 1, 0]]);
        const m = run(ps, [0.15, 2, 0.5], [0.5, 1, 0.5], seed);
        expect(m.pos[2]).toBeGreaterThan(1); // S 側へ出た
        expect(m.pos[0]).toBeLessThan(2.4); // 東へ素通りしていない
      }
    }
  });

  it('玉うけ（M / MK）は 上から落ちてきた玉を 口の広さで受けとめる', () => {
    for (const id of ['M', 'MK']) {
      const ps = put([[id, 0, 0]]);
      const track = buildTrack(ps);
      // まんなかから少しずれた所へ、ななめに落とす
      const m = makeMarble([0.3, 2, 0.62]);
      m.vel = [2, 0, -1];
      for (let i = 0; i < 3000 && m.mode !== 'rest'; i++) stepMarble(m, track, 1 / 120);
      expect(m.reason).toBe('goal');
    }
  });

  it('ジャンプ: 22 から落ちて MJ ではね、その先の M に入る', () => {
    const ps = put([['1', 0, 0], ['22', 0, 0], ['MJ', 0, 1], ['M', 0, 3]]);
    const m = run(ps, [0.5, 3, 0.12], [0.5, 1, 0.5]);
    expect(m.reason).toBe('goal');
  });

  it('GX を うらがえすと、うらみぞ（横向き）が 上のみぞになる', () => {
    // そのまま: 上のみぞは 前後(N-S)。うらがえし: 上のみぞは 左右(E-W)
    const a = put([['GX', 0, 0]]);
    const ta = buildTrack(a);
    expect(ta.paths.length).toBe(1);
    expect(Math.abs(ta.paths[0].pts[0][2] - ta.paths[0].pts.at(-1)[2])).toBeGreaterThan(0.9);
    a[0].flip = true;
    const tb = buildTrack(a);
    expect(tb.paths.length).toBe(1);
    expect(tb.paths[0].kind).toBe('groove');
    expect(Math.abs(tb.paths[0].pts[0][0] - tb.paths[0].pts.at(-1)[0])).toBeGreaterThan(0.9);
    expect(tb.paths[0].pts[0][1]).toBeCloseTo(0.5);
    // 左右のレールとつながって 玉が通る
    const ps = put([['G', 0, 0, 1], ['GX', 1, 0], ['G', 2, 0, 1], ['M', 3, 0]]);
    ps[1].flip = true;
    const m = run(ps, [0.15, 0.5, 0.5], [0.5, 0, 0.5]);
    expect(m.reason).toBe('goal');
  });
});

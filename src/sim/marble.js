// 玉の動き。道の上では「道のり s と速さ v」で進み、道がとぎれたら空中を飛ぶ。
import { sample } from './track.js';

export const MARBLE_R = 0.17;
const G = 196; // 重力（9.8m/s² を 1=5cm に直したもの）
const ROLL = 5 / 7; // ころがる玉は、すべる玉よりゆっくり加速する
const MU = 0.012 * G; // ころがりまさつ
const CURVE_LOSS = 0.22; // カーブで失う速さ（1ラジアンあたり）
const SEAT = 0.03; // みぞの軸から玉の中心までの下がり
const PUSH = 5; // 平らな所に置いたときの最初のひと押し

const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const hyp = (a) => Math.hypot(a[0], a[1], a[2]);

/**
 * 玉を作る。at はワールド座標（その少し上から落とす）。
 * toward があれば、平らなみぞに乗ったときその方向へ押す。
 */
export function makeMarble(at, toward = null) {
  return {
    mode: 'free',
    pos: [at[0], at[1] + 0.3, at[2]],
    vel: [0, 0, 0],
    path: -1, s: 0, v: 0,
    toward, fresh: true,
    ignorePath: -1, ignoreT: 0,
    startY: at[1] + 0.3,
    wallT: -9, wallPos: null,
    t: 0, slowT: 0,
    reason: null, restPos: null,
    trail: [],
  };
}

export function stepMarble(m, track, dt, rng = Math.random) {
  if (m.mode === 'rest') return;
  let left = dt;
  let guard = 0;
  while (left > 1e-6 && m.mode !== 'rest' && guard++ < 400) {
    const speed = m.mode === 'path' ? Math.abs(m.v) : hyp(m.vel);
    const h = Math.min(left, 0.004, 0.03 / Math.max(speed, 1));
    if (m.mode === 'path') stepPath(m, track, h, rng);
    else stepFree(m, track, h);
    left -= h;
    m.t += h;
  }
  if (m.t > 90 && m.mode !== 'rest') rest(m, 'stop');
  const last = m.trail[m.trail.length - 1];
  if (!last || hyp([last[0] - m.pos[0], last[1] - m.pos[1], last[2] - m.pos[2]]) > 0.06) {
    m.trail.push(m.pos.slice());
    if (m.trail.length > 4000) m.trail.shift();
  }
}

function rest(m, reason) {
  // かべ（または行き止まり）に当たった直後に、その近くで止まったなら、原因はそれ
  if (reason === 'stop' && m.t - m.wallT < 4 && m.wallPos &&
      Math.hypot(m.pos[0] - m.wallPos[0], m.pos[1] - m.wallPos[1], m.pos[2] - m.wallPos[2]) < 1.2) reason = m.wallKind || 'wall';
  m.mode = 'rest';
  m.reason = reason;
  m.v = 0;
  m.vel = [0, 0, 0];
  m.restPos = m.pos.slice();
}

function setPosOnPath(m, path) {
  const { p, t } = sample(path, m.s);
  m.pos = [p[0], p[1] - (path.kind === 'groove' ? SEAT : 0), p[2]];
  return t;
}

function stepPath(m, track, h, rng) {
  const path = track.paths[m.path];
  const a0 = sample(path, m.s);
  const t = a0.t;

  // 重力とまさつ
  const ag = -G * ROLL * t[1];
  if (Math.abs(m.v) < 0.12 && Math.abs(ag) <= MU * 1.05) {
    m.slowT += h;
    m.v = 0;
    if (m.slowT > 0.25) { setPosOnPath(m, path); rest(m, 'stop'); return; }
  } else {
    m.slowT = 0;
    const fr = m.v !== 0 ? -Math.sign(m.v) * MU : -Math.sign(ag) * Math.min(MU, Math.abs(ag));
    const v1 = m.v + (ag + fr) * h;
    // まさつだけで向きが変わることはない
    m.v = m.v !== 0 && Math.sign(v1) !== Math.sign(m.v) && Math.abs(ag) <= MU ? 0 : v1;
  }

  let s1 = m.s + m.v * h;

  // ふさがれたみぞ
  if (path.blocked) {
    const b = sample(path, Math.max(0, Math.min(path.len, s1)));
    if (path.blocked[b.i] && !path.blocked[a0.i]) {
      hitWall(m, b.p);
      m.v = -m.v * 0.35;
      if (Math.abs(m.v) < 0.6) { setPosOnPath(m, path); rest(m, 'covered'); }
      return;
    }
  }

  if (s1 < 0 || s1 > path.len) {
    endOfPath(m, track, path, s1 < 0 ? 0 : 1, rng);
    return;
  }
  m.s = s1;
  const t1 = setPosOnPath(m, path);
  // カーブで少し遅くなる
  // （上下のうねりでは遅くならない。水平に向きが変わった分だけ）
  const h0 = Math.hypot(t[0], t[2]), h1 = Math.hypot(t1[0], t1[2]);
  if (h0 > 0.3 && h1 > 0.3) {
    const c = Math.max(-1, Math.min(1, (t[0] * t1[0] + t[2] * t1[2]) / (h0 * h1)));
    const ang = Math.acos(c);
    if (ang > 1e-4) m.v *= Math.exp(-CURVE_LOSS * ang);
  }
}

function hitWall(m, p, kind = 'wall') {
  m.wallT = m.t;
  m.wallPos = p.slice();
  m.wallKind = kind; // 'wall' = 先がふさがっている / 'dead' = パーツの行き止まり
}

function endOfPath(m, track, path, end, rng) {
  const n = path.pts.length;
  const p = end === 0 ? path.pts[0] : path.pts[n - 1];
  const q = end === 0 ? path.pts[1] : path.pts[n - 2];
  const l = hyp([p[0] - q[0], p[1] - q[1], p[2] - q[2]]) || 1;
  const d = [(p[0] - q[0]) / l, (p[1] - q[1]) / l, (p[2] - q[2]) / l]; // 外向き
  const speed = Math.abs(m.v);

  if (path.sink && end === 1) {
    m.s = path.len; setPosOnPath(m, path); rest(m, 'goal'); return;
  }

  // つながっている道から、進む先をえらぶ。
  // 決め手は「今の向きにどれだけ近いか」と「その場の傾き」だけ（先の形は読まない）。
  //  ・向きが大きく変わる道へは行けない。ただし その場で下っている道（穴・坂）には落ちる
  //  ・行ける道が複数あれば、下りが急なほうへ。同じくらいなら どちらかにランダム
  let cands = [];
  for (const L of path.links[end]) {
    const other = track.paths[L.path];
    const align = dot(d, L.t);
    if (align <= 0.25 && L.t[1] > -0.3) continue;
    let score = align - 2 * L.t[1];
    // 穴の出口から上へのぼる向きは選びにくい
    if (other.hole && L.dir < 0 && L.i > 0) score -= 1;
    cands.push({ L, score });
  }
  if (cands.length) {
    cands.sort((a, b) => b.score - a.score);
    const top = cands.filter((c) => cands[0].score - c.score < 0.15);
    const pick = top[Math.floor(rng() * top.length)].L;
    const keep = 0.5 + 0.5 * Math.max(0, Math.min(1, dot(d, pick.t)));
    m.path = pick.path;
    m.s = pick.s;
    m.v = pick.dir * Math.max(speed * keep, 0.3);
    setPosOnPath(m, track.paths[m.path]);
    return;
  }

  const open = path.open[end];
  // はしの先がかべかどうか
  const probe = [p[0] + d[0] * 0.12, p[1] - (path.kind === 'groove' ? SEAT : 0) + d[1] * 0.12, p[2] + d[2] * 0.12];
  const wall = !open || probe[1] < 0.02 || insideSolid(track, probe, null);
  if (wall) {
    m.s = end === 0 ? 0 : path.len;
    setPosOnPath(m, path);
    hitWall(m, p, open ? 'wall' : 'dead');
    if (d[1] < -0.7 || speed < 0.8) { rest(m, open ? 'wall' : 'dead'); return; }
    m.v = -m.v * 0.35;
    return;
  }

  // 道がない → 空中へ
  m.mode = 'free';
  m.pos = [p[0], p[1] - (path.kind === 'groove' ? SEAT : 0), p[2]];
  m.vel = [d[0] * speed, d[1] * speed, d[2] * speed];
  m.ignorePath = path.id;
  m.ignoreT = m.t + 0.12;
  m.startY = m.pos[1];
}

function insideSolid(track, p, except) {
  for (const s of track.solids) {
    if (s.piece === except) continue;
    if (p[0] > s.minx + 0.005 && p[0] < s.maxx - 0.005 && p[2] > s.minz + 0.005 && p[2] < s.maxz - 0.005 &&
        p[1] > s.miny + 0.005 && p[1] < s.maxy - 0.005) return s;
  }
  return null;
}

function stepFree(m, track, h) {
  const prev = m.pos.slice();
  m.vel[1] -= G * h;
  m.pos[0] += m.vel[0] * h;
  m.pos[1] += m.vel[1] * h;
  m.pos[2] += m.vel[2] * h;

  // --- みぞ・じょうごに入る ---
  if (m.vel[1] <= 0.5) {
    let best = null;
    track.near(m.pos, (path, i) => {
      if (path.id === m.ignorePath && m.t < m.ignoreT) return;
      const q = path.pts[i];
      const dx = q[0] - m.pos[0], dz = q[2] - m.pos[2];
      const hd = Math.hypot(dx, dz);
      const dy = m.pos[1] - (q[1] - SEAT);
      if (path.funnel && i === 0) {
        if (hd < path.funnel && dy > -0.12 && dy < 0.2) best = { path, i, hd: -1 };
        return;
      }
      if (path.kind !== 'groove') return;
      if (path.blocked && path.blocked[i]) return;
      if (hd < 0.17 && dy > -0.12 && dy < 0.22 && (!best || hd < best.hd)) best = { path, i, hd };
    });
    if (best) {
      const path = best.path;
      const n = path.pts.length;
      const a = path.pts[Math.max(0, best.i - 1)], b = path.pts[Math.min(n - 1, best.i + 1)];
      const l = hyp([b[0] - a[0], b[1] - a[1], b[2] - a[2]]) || 1;
      const t = [(b[0] - a[0]) / l, (b[1] - a[1]) / l, (b[2] - a[2]) / l];
      m.mode = 'path';
      m.path = path.id;
      m.s = path.cum[best.i];
      m.v = path.funnel && best.i === 0 ? Math.max(1.5, hyp(m.vel) * 0.3) : dot(m.vel, t) * 0.9;
      if (m.fresh) {
        m.fresh = false;
        // 置いた直後で、ほぼ平らなら ひと押し
        if (Math.abs(t[1]) < 0.05 && !path.funnel) {
          let sign = best.i < n / 2 ? 1 : -1; // 遠いほうのはしへ
          if (m.toward) {
            const w = [m.toward[0] - m.pos[0], 0, m.toward[2] - m.pos[2]];
            if (Math.abs(dot(w, t)) > 0.05) sign = Math.sign(dot(w, t));
          }
          m.v = sign * PUSH;
        }
      }
      setPosOnPath(m, path);
      return;
    }
  }

  // --- パーツにぶつかる ---
  const R = MARBLE_R;
  for (const s of track.solids) {
    const p = m.pos;
    if (p[0] <= s.minx || p[0] >= s.maxx || p[2] <= s.minz || p[2] >= s.maxz) continue;
    if (p[1] >= s.maxy + R || p[1] <= s.miny) continue;
    if (prev[1] >= s.maxy + R - 0.03 || (p[1] > s.maxy && m.vel[1] <= 0)) {
      // 上にのった
      p[1] = s.maxy + R;
      if (s.bounce && m.vel[1] < -1) {
        m.vel[1] = -m.vel[1] * 0.86; // トランポリン
      } else {
        m.vel[1] = m.vel[1] < -6 ? -m.vel[1] * 0.25 : 0;
        const k = Math.max(0, 1 - 3 * h);
        m.vel[0] *= k; m.vel[2] *= k;
        if (m.vel[1] === 0 && Math.hypot(m.vel[0], m.vel[2]) < 0.4) { m.fresh = false; rest(m, 'ontop'); return; }
      }
    } else if (p[1] < s.maxy) {
      // 横からぶつかった → 手前にもどして はねかえす
      const dx = Math.min(p[0] - s.minx, s.maxx - p[0]);
      const dz = Math.min(p[2] - s.minz, s.maxz - p[2]);
      if (dx < dz) { p[0] = prev[0]; m.vel[0] = -m.vel[0] * 0.3; }
      else { p[2] = prev[2]; m.vel[2] = -m.vel[2] * 0.3; }
      hitWall(m, p);
    }
  }

  // --- つくえ ---
  if (m.pos[1] <= R) {
    m.pos[1] = R;
    m.fresh = false;
    m.vel[1] = m.vel[1] < -8 ? -m.vel[1] * 0.3 : 0;
    const k = Math.max(0, 1 - 2.5 * h);
    m.vel[0] *= k; m.vel[2] *= k;
    if (m.vel[1] === 0 && Math.hypot(m.vel[0], m.vel[2]) < 0.5) {
      rest(m, m.startY - R > 0.7 ? 'fell' : 'out');
    }
  }
  if (Math.abs(m.pos[0]) > 60 || Math.abs(m.pos[2]) > 60) rest(m, 'out');
}

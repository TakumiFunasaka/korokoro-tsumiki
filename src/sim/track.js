// 置いたパーツから「玉の道」を作る。
// 道どうしは、はしの位置がぴったり合ったときだけつながる（合わなければ詰まる）。
import { PARTS } from '../parts/catalog.js';
import { localToWorld, aabb, footprint } from './world.js';

const EPS = 0.07; // つながったとみなす距離
const CELL = 0.25;

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const len = (a) => Math.hypot(a[0], a[1], a[2]);
const norm = (a) => {
  const l = len(a) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};
const key = (x, y, z) => `${Math.floor(x / CELL)},${Math.floor(y / CELL)},${Math.floor(z / CELL)}`;

export function buildTrack(pieces) {
  const paths = [];
  const unders = []; // うらみぞ（上にかぶさるパーツのすきま）
  const solids = [];

  for (const piece of pieces) {
    const def = PARTS[piece.type];
    const box = aabb(piece);
    solids.push({ ...box, piece, bounce: !!def.bounce });
    def.paths.forEach((pd, idx) => {
      const pts = pd.pts.map((p) => localToWorld(piece, p));
      if (pd.kind === 'under') {
        unders.push({ piece, pts });
        return;
      }
      const cum = [0];
      for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + len(sub(pts[i], pts[i - 1])));
      const path = {
        id: paths.length, piece, idx, kind: pd.kind, r: pd.r, pts, cum, len: cum[cum.length - 1],
        hole: !!pd.hole, sink: !!pd.sink, funnel: pd.funnel || 0, ramp: !!pd.ramp,
        open: [isOpenEnd(pts[0], box), isOpenEnd(pts[pts.length - 1], box)],
        blocked: null,
        links: [[], []],
      };
      paths.push(path);
    });
  }

  // --- 点をますめに入れて、近い点を早く探せるようにする ---
  const grid = new Map();
  for (const path of paths) {
    path.pts.forEach((p, i) => {
      const k = key(p[0], p[1], p[2]);
      let a = grid.get(k);
      if (!a) grid.set(k, (a = []));
      a.push(path.id, i);
    });
  }
  const near = (p, fn) => {
    const cx = Math.floor(p[0] / CELL), cy = Math.floor(p[1] / CELL), cz = Math.floor(p[2] / CELL);
    for (let x = cx - 1; x <= cx + 1; x++)
      for (let y = cy - 1; y <= cy + 1; y++)
        for (let z = cz - 1; z <= cz + 1; z++) {
          const a = grid.get(`${x},${y},${z}`);
          if (!a) continue;
          for (let i = 0; i < a.length; i += 2) fn(paths[a[i]], a[i + 1]);
        }
  };

  // --- はしのつながり ---
  for (const path of paths) {
    for (const end of [0, 1]) {
      const n = path.pts.length;
      const p = end === 0 ? path.pts[0] : path.pts[n - 1];
      const best = new Map(); // 相手の道ごとに、いちばん近い点
      near(p, (other, i) => {
        if (other === path) return;
        const d = len(sub(other.pts[i], p));
        if (d > EPS) return;
        const b = best.get(other.id);
        if (!b || d < b.d) best.set(other.id, { d, i });
      });
      for (const [oid, b] of best) {
        const other = paths[oid];
        const last = other.pts.length - 1;
        // 相手のはしに近ければ、はしどうしのつながり
        const i = b.i <= 1 ? 0 : b.i >= last - 1 ? last : b.i;
        if (i === 0) path.links[end].push(link(other, 0, +1));
        else if (i === last) path.links[end].push(link(other, last, -1));
        else {
          path.links[end].push(link(other, i, +1));
          path.links[end].push(link(other, i, -1));
        }
      }
    }
  }

  // --- 上にパーツがのって、みぞがふさがれた所 ---
  for (const path of paths) {
    if (path.kind !== 'groove') continue;
    let any = false;
    const blocked = path.pts.map((p) => {
      for (const s of solids) {
        if (s.piece === path.piece) continue;
        if (p[0] <= s.minx + 0.02 || p[0] >= s.maxx - 0.02 || p[2] <= s.minz + 0.02 || p[2] >= s.maxz - 0.02) continue;
        if (s.miny < p[1] - 0.02 || s.miny - p[1] > 0.14) continue;
        // かぶさっている。うらみぞが合っていれば通れる
        let ok = false;
        for (const u of unders) {
          if (u.piece !== s.piece) continue;
          for (const q of u.pts) {
            if (Math.hypot(q[0] - p[0], q[2] - p[2]) < 0.09 && Math.abs(q[1] - p[1]) < 0.16) { ok = true; break; }
          }
          if (ok) break;
        }
        if (!ok) { any = true; return true; }
      }
      return false;
    });
    if (any) path.blocked = blocked;
  }

  return { paths, solids, near };
}

function link(other, i, dir) {
  const t = tangentAt(other, i);
  return { path: other.id, i, s: other.cum[i], dir, t: dir > 0 ? t : [-t[0], -t[1], -t[2]] };
}

export function tangentAt(path, i) {
  const n = path.pts.length;
  const a = path.pts[Math.max(0, i - 1)], b = path.pts[Math.min(n - 1, i + 1)];
  return norm(sub(b, a));
}

function isOpenEnd(p, box) {
  const e = 0.02;
  return (
    Math.abs(p[0] - box.minx) < e || Math.abs(p[0] - box.maxx) < e ||
    Math.abs(p[2] - box.minz) < e || Math.abs(p[2] - box.maxz) < e ||
    Math.abs(p[1] - box.miny) < e
  );
}

/** 道のり s の位置・向きを返す */
export function sample(path, s) {
  const { cum, pts } = path;
  let lo = 0, hi = cum.length - 1;
  if (s <= 0) return { p: pts[0].slice(), t: norm(sub(pts[1], pts[0])), i: 0 };
  if (s >= path.len) return { p: pts[hi].slice(), t: norm(sub(pts[hi], pts[hi - 1])), i: hi };
  while (hi - lo > 1) {
    const m = (lo + hi) >> 1;
    if (cum[m] <= s) lo = m; else hi = m;
  }
  const f = (s - cum[lo]) / (cum[hi] - cum[lo] || 1);
  const a = pts[lo], b = pts[hi];
  return {
    p: [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f],
    t: norm(sub(b, a)),
    i: f < 0.5 ? lo : hi,
  };
}

export { footprint };

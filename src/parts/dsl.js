// パーツの「みち」を書くための小さな道具。
// 座標は 1 = 立方体の一辺(5cm)。原点は底面の中心。x,z は -0.5〜0.5、y は 0〜高さ。
// 面: N(z=-0.5) E(x=+0.5) S(z=+0.5) W(x=-0.5)

export const STEP = 0.04; // みちを点にするときの間隔

export const FACE_DIR = {
  N: [0, 0, -1],
  E: [1, 0, 0],
  S: [0, 0, 1],
  W: [-1, 0, 0],
};

/** 面の上の点。lat は面にそった横ずれ（N/S面では x、E/W面では z） */
export function P(face, y, lat = 0) {
  switch (face) {
    case 'N': return [lat, y, -0.5];
    case 'S': return [lat, y, 0.5];
    case 'E': return [0.5, y, lat];
    case 'W': return [-0.5, y, lat];
    default: throw new Error('face? ' + face);
  }
}

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const len = (a) => Math.hypot(a[0], a[1], a[2]);

/** 折れ線を STEP 間隔に打ちなおす */
export function resample(pts, step = STEP) {
  const out = [pts[0].slice()];
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i];
    const d = len(sub(b, a));
    if (d < 1e-9) continue;
    const n = Math.max(1, Math.ceil(d / step));
    for (let k = 1; k <= n; k++) out.push(add(a, mul(sub(b, a), k / n)));
  }
  return out;
}

/** まっすぐ */
export function line(a, b) {
  return resample([a, b]);
}

/** いくつかの点をまっすぐつなぐ */
export function poly(...pts) {
  return resample(pts);
}

/** 3次ベジェ。a から da の向きに出て、b に db の向きで入る。k は曲がりの強さ */
export function bezier(a, da, b, db, k = 0.28) {
  const c1 = add(a, mul(da, k));
  const c2 = sub(b, mul(db, k));
  const raw = [];
  const N = 48;
  for (let i = 0; i <= N; i++) {
    const t = i / N, u = 1 - t;
    raw.push([
      u * u * u * a[0] + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t * t * t * b[0],
      u * u * u * a[1] + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t * t * t * b[1],
      u * u * u * a[2] + 3 * u * u * t * c1[2] + 3 * u * t * t * c2[2] + t * t * t * b[2],
    ]);
  }
  return resample(raw);
}

/**
 * となりあう2面をむすぶ 1/4 円のカーブ（高さは a から b へなめらかに変わる）。
 * a, b は面の上の点。円の中心は2面が交わる角のがわ。
 */
export function arc(a, b) {
  // a, b のどちらかが x=±0.5、もう一方が z=±0.5 の面にある前提
  const onX = (p) => Math.abs(Math.abs(p[0]) - 0.5) < 1e-6;
  const pa = onX(a) ? a : b; // x面の点
  const pb = onX(a) ? b : a; // z面の点
  const cx = pa[0], cz = pb[2]; // 角
  const rx = Math.abs(pb[0] - cx); // z面の点までの x きょり
  const rz = Math.abs(pa[2] - cz); // x面の点までの z きょり
  const raw = [];
  const N = 40;
  for (let i = 0; i <= N; i++) {
    const t = (i / N) * (Math.PI / 2);
    // t=0 で pa、t=π/2 で pb
    const x = cx + (pb[0] - cx) * Math.sin(t) * 1;
    const z = cz + (pa[2] - cz) * Math.cos(t) * 1;
    const s = i / N;
    const y = pa[1] + (pb[1] - pa[1]) * (s * s * (3 - 2 * s));
    raw.push([x, y, z]);
  }
  void rx; void rz;
  const out = resample(raw);
  return onX(a) ? out : out.reverse();
}

/** 高さだけなめらかに変える S字（a から b へ、水平にはまっすぐ） */
export function sline(a, b) {
  const raw = [];
  const N = 40;
  for (let i = 0; i <= N; i++) {
    const s = i / N;
    const e = s * s * (3 - 2 * s);
    raw.push([a[0] + (b[0] - a[0]) * s, a[1] + (b[1] - a[1]) * e, a[2] + (b[2] - a[2]) * s]);
  }
  return resample(raw);
}

/** みちをつなげる（つなぎ目の点はかさねない） */
export function join(...segs) {
  const out = [];
  for (const s of segs) {
    for (let i = 0; i < s.length; i++) {
      if (out.length && i === 0 && len(sub(out[out.length - 1], s[0])) < 1e-6) continue;
      out.push(s[i]);
    }
  }
  return out;
}

/** 上面のみぞ */
export function groove(pts, opt = {}) {
  return { kind: 'groove', pts, open: [true, true], ...opt };
}

/** 中のトンネル */
export function tunnel(pts, opt = {}) {
  return { kind: 'tunnel', pts, open: [true, true], ...opt };
}

/** y 軸まわりに 90°×k 回す（three.js の rotation.y = k*π/2 とおなじ向き） */
export function rotPoint(p, k) {
  let [x, y, z] = p;
  for (let i = 0; i < ((k % 4) + 4) % 4; i++) {
    const nx = z, nz = -x;
    x = nx; z = nz;
  }
  return [x, y, z];
}

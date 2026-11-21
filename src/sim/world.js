// 置いたパーツの集まり。座標は 1 = 立方体の一辺。
// パーツの位置は「半マス」単位の整数 (hx, hz) で持つ（1.5 や 2.5 の長さのレールがあるため）。
import { PARTS } from '../parts/catalog.js';
import { rotPoint } from '../parts/dsl.js';

let nextId = 1;

export function makePiece(type, hx, hz, rot = 0, flip = false) {
  return { id: nextId++, type, hx, hz, rot: ((rot % 4) + 4) % 4, y: 0, flip: !!flip && !!PARTS[type].flippable };
}

/** 回転後の大きさ（半マス単位）*/
export function footprint(piece) {
  const p = PARTS[piece.type];
  const odd = piece.rot % 2 === 1;
  return { fw: Math.round((odd ? p.d : p.w) * 2), fd: Math.round((odd ? p.w : p.d) * 2) };
}

/** 底面の中心（ワールド座標）*/
export function center(piece) {
  const { fw, fd } = footprint(piece);
  return [(piece.hx + fw / 2) / 2, piece.y, (piece.hz + fd / 2) / 2];
}

export function height(piece) {
  return PARTS[piece.type].h;
}

export function localToWorld(piece, p) {
  const c = center(piece);
  // うらがえし: 横の軸まわりに半回転（上下が入れかわり、前後も入れかわる）
  if (piece.flip) p = [p[0], PARTS[piece.type].h - p[1], -p[2]];
  const q = rotPoint(p, piece.rot);
  return [q[0] + c[0], q[1] + c[1], q[2] + c[2]];
}

export function localDirToWorld(piece, d) {
  return rotPoint(d, piece.rot);
}

function overlaps(a, b) {
  const fa = footprint(a), fb = footprint(b);
  return a.hx < b.hx + fb.fw && b.hx < a.hx + fa.fw && a.hz < b.hz + fb.fd && b.hz < a.hz + fa.fd;
}

/** その場所に置いたときに乗る高さ（下にあるパーツのいちばん上）*/
export function restHeight(pieces, probe, maxY = Infinity) {
  let y = 0;
  for (const q of pieces) {
    if (q === probe || q.id === probe.id) continue;
    if (!overlaps(q, probe)) continue;
    const top = q.y + height(q);
    if (top <= maxY + 1e-6 && top > y) y = top;
  }
  return y;
}

/** 全部のパーツを下から順に落として、すきまをなくす */
export function settle(pieces) {
  const order = pieces.slice().sort((a, b) => a.y - b.y || a.id - b.id);
  const done = [];
  for (const p of order) {
    p.y = restHeight(done, p);
    done.push(p);
  }
}

export function aabb(piece) {
  const { fw, fd } = footprint(piece);
  return {
    minx: piece.hx / 2, maxx: (piece.hx + fw) / 2,
    minz: piece.hz / 2, maxz: (piece.hz + fd) / 2,
    miny: piece.y, maxy: piece.y + height(piece),
  };
}

export function serialize(pieces) {
  return pieces.map((p) => (p.flip ? [p.type, p.hx, p.hz, p.rot, p.y, 1] : [p.type, p.hx, p.hz, p.rot, p.y]));
}

export function deserialize(data) {
  const out = [];
  for (const row of data || []) {
    const [type, hx, hz, rot, y, flip] = row;
    if (!PARTS[type]) continue;
    // 横の位置は 1マス単位（昔の保存データに半マスずれがあれば そろえる）
    const p = makePiece(type, 2 * Math.round(hx / 2), 2 * Math.round(hz / 2), rot | 0, !!flip);
    p.y = +y || 0;
    out.push(p);
  }
  settle(out);
  return out;
}

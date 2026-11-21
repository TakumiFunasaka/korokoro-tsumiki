// パーツの形を作る。立方体から、みぞ・トンネルの形を引き算（CSG）する。
import * as THREE from 'three';
import { Brush, Evaluator, SUBTRACTION } from 'three-bvh-csg';
import { PARTS } from '../parts/catalog.js';

const evaluator = new Evaluator();
evaluator.attributes = ['position', 'normal'];
evaluator.useGroups = true;

// CSG 用の仮のマテリアル（どの面が「けずった面」かを見分けるためだけに使う）
const BODY = new THREE.MeshBasicMaterial();
const CUT = new THREE.MeshBasicMaterial();

const cache = new Map();

/** パーツの形（groups: 0=木の面, 1=けずった面）*/
export function partGeometry(type) {
  let g = cache.get(type);
  if (!g) cache.set(type, (g = build(PARTS[type])));
  return g;
}

function baseGeometry(def) {
  const { w, d, h } = def;
  let g;
  if (def.shape === 'cyl') {
    g = new THREE.CylinderGeometry(0.5, 0.5, h, 40);
    g.translate(0, h / 2, 0);
  } else if (def.shape === 'dome') {
    const s = new THREE.Shape();
    s.moveTo(-0.5, 0);
    s.absarc(0, 0, 0.5, Math.PI, 0, true);
    s.lineTo(-0.5, 0);
    g = new THREE.ExtrudeGeometry(s, { depth: 1, bevelEnabled: false, curveSegments: 24 });
    g.translate(0, 0, -0.5);
  } else if (def.shape === 'wedge') {
    const s = new THREE.Shape();
    s.moveTo(-0.5, 0); s.lineTo(0.5, 0); s.lineTo(-0.5, 1); s.lineTo(-0.5, 0);
    g = new THREE.ExtrudeGeometry(s, { depth: 1, bevelEnabled: false });
    g.translate(0, 0, -0.5);
  } else {
    g = new THREE.BoxGeometry(w, h, d);
    g.translate(0, h / 2, 0);
  }
  return g;
}

function build(def) {
  const base = baseGeometry(def);
  const cutters = [];
  for (const p of def.paths) {
    if (p.hidden) continue;
    cutters.push(sweep(p.pts, p.kind === 'groove' ? 'groove' : 'tube', p.r, def));
  }
  for (const c of def.cuts) {
    const g = new THREE.CylinderGeometry(c.r0 ?? c.r, c.r1 ?? c.r, c.y1 - c.y0, 36);
    g.translate(0, (c.y0 + c.y1) / 2, 0);
    cutters.push(g);
  }
  if (!cutters.length) {
    const g = base.toNonIndexed ? base : base;
    g.clearGroups();
    g.addGroup(0, g.index ? g.index.count : g.attributes.position.count, 0);
    return g;
  }
  let result = new Brush(base, BODY);
  result.updateMatrixWorld();
  for (const cg of cutters) {
    const b = new Brush(cg, CUT);
    b.updateMatrixWorld();
    result = evaluator.evaluate(result, b, SUBTRACTION);
    result.updateMatrixWorld();
  }
  const src = result.geometry;
  const mats = Array.isArray(result.material) ? result.material : [result.material];
  // 引き算どうしが重なる所に、外へはみ出た面のかけらが残ることがある。
  // 立方体の外に頂点がある三角形は捨てて、木の面 / けずった面 の2グループに組みなおす。
  const sp = src.attributes.position, sn = src.attributes.normal, si = src.index;
  const hw = def.w / 2 + 1e-3, hd = def.d / 2 + 1e-3, hh = def.h + 1e-3;
  const out = [{ p: [], n: [] }, { p: [], n: [] }];
  for (const grp of src.groups) {
    const o = out[mats[grp.materialIndex] === BODY ? 0 : 1];
    for (let i = grp.start; i < grp.start + grp.count; i += 3) {
      const ids = [0, 1, 2].map((k) => (si ? si.getX(i + k) : i + k));
      if (ids.some((j) => Math.abs(sp.getX(j)) > hw || Math.abs(sp.getZ(j)) > hd || sp.getY(j) > hh || sp.getY(j) < -1e-3)) continue;
      for (const j of ids) {
        o.p.push(sp.getX(j), sp.getY(j), sp.getZ(j));
        o.n.push(sn.getX(j), sn.getY(j), sn.getZ(j));
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(out[0].p.concat(out[1].p), 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(out[0].n.concat(out[1].n), 3));
  g.addGroup(0, out[0].p.length / 3, 0);
  g.addGroup(out[0].p.length / 3, out[1].p.length / 3, 1);
  g.computeBoundingBox();
  g.computeBoundingSphere();
  return g;
}

const UP = new THREE.Vector3(0, 1, 0);

/**
 * 道にそって断面を動かした立体を作る。
 * tube: 丸い断面（トンネル・うらみぞ）。groove: 下が半円で上があいた U 字（上面のみぞ）。
 */
function sweep(ptsIn, kind, r, def) {
  const R = r * 1.0;
  const topY = def.h + 0.1;
  const hw = def.w / 2, hd = def.d / 2;
  const isOpen = (p) =>
    Math.abs(Math.abs(p[0]) - hw) < 0.02 || Math.abs(Math.abs(p[2]) - hd) < 0.02 || Math.abs(p[1]) < 0.02;

  const P = ptsIn.map((p) => new THREE.Vector3(p[0], p[1], p[2]));
  const n = P.length;
  const t0 = P[1].clone().sub(P[0]).normalize();
  const t1 = P[n - 1].clone().sub(P[n - 2]).normalize();

  // 輪っか: {c: 中心, t: 向き, k: ちぢめ率}
  const rings = [];
  const cap = (p, t, sign) => {
    // 行き止まりは丸くとじる
    const out = [];
    for (const a of [80, 55, 28]) {
      const th = (a * Math.PI) / 180;
      out.push({ c: p.clone().addScaledVector(t, sign * R * Math.sin(th)), t, k: Math.cos(th) });
    }
    return sign < 0 ? out : out.reverse();
  };
  // 面にあいた口は、面の少し外までのばす。輪っかが面とぴったり重なると
  // 引き算で面に穴があかないので、はしの点そのものには輪っかを置かない。
  const open0 = isOpen(ptsIn[0]), open1 = isOpen(ptsIn[n - 1]);
  if (open0) rings.push({ c: P[0].clone().addScaledVector(t0, -0.083), t: t0, k: 1 });
  else rings.push(...cap(P[0], t0, -1));
  for (let i = open0 ? 1 : 0; i < (open1 ? n - 1 : n); i++) {
    const a = P[Math.max(0, i - 1)], b = P[Math.min(n - 1, i + 1)];
    rings.push({ c: P[i], t: b.clone().sub(a).normalize(), k: 1 });
  }
  if (open1) rings.push({ c: P[n - 1].clone().addScaledVector(t1, 0.083), t: t1, k: 1 });
  else rings.push(...cap(P[n - 1], t1, 1));

  // 断面
  const prof = [];
  if (kind === 'tube') {
    const M = 18;
    for (let j = 0; j < M; j++) {
      const a = (j / M) * Math.PI * 2;
      prof.push({ a: Math.cos(a) * R, b: Math.sin(a) * R });
    }
  } else {
    const M = 12;
    prof.push({ a: R, top: true });
    prof.push({ a: -R, top: true });
    for (let j = 0; j <= M; j++) {
      const a = Math.PI + (j / M) * Math.PI;
      prof.push({ a: Math.cos(a) * R, b: Math.sin(a) * R });
    }
  }
  const m = prof.length;

  const pos = [];
  let side = null;
  // 最初の横向きを決める（まっすぐ下向きの道では、先の点から借りる）
  for (const ring of rings) {
    const s = new THREE.Vector3().crossVectors(UP, ring.t);
    if (s.lengthSq() > 1e-4) { side = s.normalize(); break; }
  }
  if (!side) side = new THREE.Vector3(1, 0, 0);
  const v = new THREE.Vector3();
  for (const ring of rings) {
    const s = new THREE.Vector3().crossVectors(UP, ring.t);
    if (s.lengthSq() > 0.02) {
      s.normalize();
      if (s.dot(side) < 0) s.negate();
      side = s;
    }
    const nrm = new THREE.Vector3().crossVectors(ring.t, side).normalize();
    if (kind === 'groove' && nrm.y < 0) nrm.negate();
    for (const q of prof) {
      if (q.top) {
        v.copy(ring.c).addScaledVector(side, q.a * ring.k);
        v.y = topY;
      } else {
        v.copy(ring.c).addScaledVector(side, q.a * ring.k).addScaledVector(nrm, q.b * ring.k);
      }
      pos.push(v.x, v.y, v.z);
    }
  }
  const idx = [];
  const nr = rings.length;
  for (let i = 0; i < nr - 1; i++) {
    for (let j = 0; j < m; j++) {
      const a = i * m + j, b = i * m + ((j + 1) % m), c = (i + 1) * m + ((j + 1) % m), d = (i + 1) * m + j;
      idx.push(a, b, c, a, c, d);
    }
  }
  // 側面の向きを外向きにそろえる（全体の体積が正になる向き）
  const volume = (list) => {
    let vol = 0;
    for (let i = 0; i < list.length; i += 3) {
      const a = list[i] * 3, b = list[i + 1] * 3, c = list[i + 2] * 3;
      vol += pos[a] * (pos[b + 1] * pos[c + 2] - pos[b + 2] * pos[c + 1])
           - pos[a + 1] * (pos[b] * pos[c + 2] - pos[b + 2] * pos[c])
           + pos[a + 2] * (pos[b] * pos[c + 1] - pos[b + 1] * pos[c]);
    }
    return vol;
  };
  // ふた: はしの輪っかを扇形にとじる。面の向きは「道の外向き」に合わせる
  const capFan = (ri, outward) => {
    const c = new THREE.Vector3();
    for (let j = 0; j < m; j++) c.add(new THREE.Vector3(pos[(ri * m + j) * 3], pos[(ri * m + j) * 3 + 1], pos[(ri * m + j) * 3 + 2]));
    c.multiplyScalar(1 / m);
    const ci = pos.length / 3;
    pos.push(c.x, c.y, c.z);
    const tri = [];
    for (let j = 0; j < m; j++) tri.push(ci, ri * m + j, ri * m + ((j + 1) % m));
    // 扇形ぜんたいの法線
    const nn = new THREE.Vector3(), A = new THREE.Vector3(), B = new THREE.Vector3(), C = new THREE.Vector3();
    for (let i = 0; i < tri.length; i += 3) {
      A.fromArray(pos, tri[i] * 3); B.fromArray(pos, tri[i + 1] * 3); C.fromArray(pos, tri[i + 2] * 3);
      nn.add(B.sub(A).cross(C.sub(A)));
    }
    if (nn.dot(outward) < 0) for (let i = 0; i < tri.length; i += 3) { const t = tri[i + 1]; tri[i + 1] = tri[i + 2]; tri[i + 2] = t; }
    return tri;
  };
  const cap0 = capFan(0, rings[0].t.clone().negate());
  const cap1 = capFan(nr - 1, rings[nr - 1].t.clone());
  // 側面だけでは閉じていないので、ふたを足した全体で体積の符号を見る
  if (volume(idx.concat(cap0, cap1)) < 0) {
    for (let i = 0; i < idx.length; i += 3) { const tmp = idx[i + 1]; idx[i + 1] = idx[i + 2]; idx[i + 2] = tmp; }
  }
  idx.push(...cap0, ...cap1);

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

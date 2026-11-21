// 3D の画面。パーツ・玉・目印を描く。
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { partGeometry } from './geometry.js';
import { PARTS } from '../parts/catalog.js';
import { center, footprint } from '../sim/world.js';
import { MARBLE_R } from '../sim/marble.js';

export const BOARD = 16; // つくえの広さ（マス）

const COL = {
  bg: 0xfff4dc,
  table: 0xffe3a6,
  grid: 0xf5cd7a,
  wood: 0xf0cf9a,
  cut: 0xc07f3c,
  edge: 0x8a5a2b,
  xrayCut: 0x1f6fd6,
  ghost: 0x2fb5e8,
  select: 0xe8452c,
};
export const MARBLE_COLORS = [0xe8452c, 0x2b5cb8, 0x7ac143, 0xf5a800, 0xd6338a, 0x00a0b0];

export function createScene(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(COL.bg);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 200);
  const HOME = { pos: new THREE.Vector3(9, 11, 13), target: new THREE.Vector3(0, 0.6, 0) };
  camera.position.copy(HOME.pos);

  const controls = new OrbitControls(camera, canvas);
  controls.target.copy(HOME.target);
  controls.enableDamping = true;
  controls.dampingFactor = 0.12;
  controls.maxPolarAngle = Math.PI * 0.47;
  controls.minDistance = 4;
  controls.maxDistance = 40;
  // 画面をなぞる＝いつでもカメラ。2本指で 拡大と平行移動
  controls.mouseButtons = { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.PAN, RIGHT: THREE.MOUSE.PAN };
  controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };
  controls.zoomToCursor = false;

  scene.add(new THREE.HemisphereLight(0xffffff, 0xf2d9a8, 1.6));
  const sun = new THREE.DirectionalLight(0xffffff, 1.5);
  sun.position.set(-4, 10, 6);
  scene.add(sun);

  // --- つくえ ---
  const table = new THREE.Mesh(
    new THREE.BoxGeometry(BOARD + 1, 0.3, BOARD + 1),
    new THREE.MeshLambertMaterial({ color: COL.table }),
  );
  table.position.y = -0.151;
  scene.add(table);
  const gridPts = [];
  for (let i = -BOARD / 2; i <= BOARD / 2; i++) {
    gridPts.push(i, 0.002, -BOARD / 2, i, 0.002, BOARD / 2, -BOARD / 2, 0.002, i, BOARD / 2, 0.002, i);
  }
  const grid = new THREE.LineSegments(
    new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(gridPts, 3)),
    new THREE.LineBasicMaterial({ color: COL.grid }),
  );
  scene.add(grid);

  // --- マテリアル ---
  const mats = {
    wood: new THREE.MeshLambertMaterial({ color: COL.wood }),
    cut: new THREE.MeshLambertMaterial({ color: COL.cut, side: THREE.DoubleSide }),
    edge: new THREE.LineBasicMaterial({ color: COL.edge, transparent: true, opacity: 0.55 }),
    ghost: new THREE.MeshLambertMaterial({ color: COL.ghost, transparent: true, opacity: 0.55, depthWrite: false }),
  };
  let xray = false;
  function setXray(on) {
    xray = on;
    mats.wood.transparent = on;
    mats.wood.opacity = on ? 0.16 : 1;
    mats.wood.depthWrite = !on;
    mats.cut.color.set(on ? COL.xrayCut : COL.cut);
    mats.cut.transparent = on;
    mats.cut.opacity = on ? 0.5 : 1;
    mats.cut.depthWrite = !on;
    mats.wood.needsUpdate = mats.cut.needsUpdate = true;
  }

  const edgeCache = new Map();
  const edgesOf = (type) => {
    let e = edgeCache.get(type);
    if (!e) edgeCache.set(type, (e = new THREE.EdgesGeometry(partGeometry(type), 32)));
    return e;
  };

  function makePartObject(type, ghost = false) {
    const g = new THREE.Group();
    const mesh = new THREE.Mesh(partGeometry(type), ghost ? mats.ghost : [mats.wood, mats.cut]);
    g.add(mesh);
    if (!ghost) {
      if (PARTS[type].bounce) {
        const pad = new THREE.Mesh(
          new THREE.CylinderGeometry(0.4, 0.4, 0.03, 32),
          new THREE.MeshLambertMaterial({ color: 0x333333 }),
        );
        pad.position.y = PARTS[type].h + 0.012;
        g.add(pad);
      }
      if (PARTS[type].magnet) {
        const dot = new THREE.Mesh(
          new THREE.CylinderGeometry(0.07, 0.07, 0.012, 16),
          new THREE.MeshLambertMaterial({ color: 0xc8102e }),
        );
        dot.position.set(-0.36, PARTS[type].h + 0.004, 0.36 * (PARTS[type].d >= 1.5 ? 1.6 : 1));
        g.add(dot);
      }
    }
    g.userData.mesh = mesh;
    return g;
  }

  function placeObject(obj, piece) {
    const c = center(piece);
    obj.position.set(c[0], c[1], c[2]);
    obj.rotation.y = (piece.rot * Math.PI) / 2;
  }

  // --- 置いたパーツ ---
  const pieceObjs = new Map(); // id → Group
  const pieceRoot = new THREE.Group();
  scene.add(pieceRoot);
  function syncPieces(pieces) {
    const seen = new Set();
    for (const p of pieces) {
      seen.add(p.id);
      let o = pieceObjs.get(p.id);
      if (o && o.userData.type !== p.type) { pieceRoot.remove(o); o = null; }
      if (!o) {
        o = makePartObject(p.type);
        o.userData.type = p.type;
        o.userData.mesh.userData.pieceId = p.id;
        pieceObjs.set(p.id, o);
        pieceRoot.add(o);
      }
      placeObject(o, p);
    }
    for (const [id, o] of pieceObjs) {
      if (!seen.has(id)) { pieceRoot.remove(o); pieceObjs.delete(id); }
    }
  }

  // --- えらんだ印・置く場所の見本 ---
  const selBox = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1)),
    new THREE.LineBasicMaterial({ color: COL.select, depthTest: false }),
  );
  selBox.renderOrder = 10;
  selBox.visible = false;
  scene.add(selBox);
  function showSelection(piece) {
    if (!piece) { selBox.visible = false; return; }
    const { fw, fd } = footprint(piece);
    const c = center(piece);
    const h = PARTS[piece.type].h;
    selBox.scale.set(fw / 2 + 0.06, h + 0.06, fd / 2 + 0.06);
    selBox.position.set(c[0], c[1] + h / 2, c[2]);
    selBox.visible = true;
  }

  let ghost = null;
  function showGhost(piece) {
    if (!piece) { if (ghost) ghost.visible = false; return; }
    if (!ghost || ghost.userData.type !== piece.type) {
      if (ghost) scene.remove(ghost);
      ghost = makePartObject(piece.type, true);
      ghost.userData.type = piece.type;
      scene.add(ghost);
    }
    ghost.visible = true;
    placeObject(ghost, piece);
  }

  // 置かれるマス（床の色）
  const pad = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicMaterial({ color: COL.ghost, transparent: true, opacity: 0.55, depthWrite: false, side: THREE.DoubleSide }),
  );
  pad.rotation.x = -Math.PI / 2;
  pad.visible = false;
  pad.renderOrder = 3;
  scene.add(pad);
  function showPad(piece, bad = false) {
    if (!piece) { pad.visible = false; return; }
    const { fw, fd } = footprint(piece);
    const c = center(piece);
    pad.scale.set(fw / 2 + 0.14, fd / 2 + 0.14, 1);
    pad.position.set(c[0], c[1] + 0.012, c[2]);
    pad.material.color.set(bad ? COL.select : COL.ghost);
    pad.visible = true;
  }

  // 玉を置く場所の見本
  const mGhost = new THREE.Mesh(
    new THREE.SphereGeometry(MARBLE_R, 20, 14),
    new THREE.MeshBasicMaterial({ color: 0xe8452c, transparent: true, opacity: 0.9, depthTest: false }),
  );
  mGhost.renderOrder = 30;
  const mRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.34, 0.05, 8, 32),
    new THREE.MeshBasicMaterial({ color: 0x7ac143, depthTest: false, transparent: true }),
  );
  mRing.rotation.x = Math.PI / 2;
  mRing.renderOrder = 29;
  const mLine = new THREE.Line(
    new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(600 * 3), 3)),
    new THREE.LineBasicMaterial({ color: 0x7ac143, depthTest: false, transparent: true, opacity: 0.95 }),
  );
  mLine.frustumCulled = false;
  mLine.renderOrder = 28;
  mGhost.visible = mRing.visible = mLine.visible = false;
  scene.add(mGhost, mRing, mLine);
  /** pos: 見本の玉の位置。snapped: みぞに吸いついたか。pts: 光らせるみぞの点 */
  function showMarbleGhost(pos, snapped = false, pts = null) {
    if (!pos) { mGhost.visible = mRing.visible = mLine.visible = false; return; }
    mGhost.visible = true;
    mGhost.position.set(pos[0], pos[1] + 0.2, pos[2]);
    mGhost.material.opacity = snapped ? 0.95 : 0.4;
    mRing.visible = snapped;
    mRing.position.set(pos[0], pos[1], pos[2]);
    mLine.visible = snapped && !!pts;
    if (mLine.visible) {
      const a = mLine.geometry.attributes.position;
      const n = Math.min(pts.length, 600);
      for (let i = 0; i < n; i++) a.setXYZ(i, pts[i][0], pts[i][1] + 0.02, pts[i][2]);
      a.needsUpdate = true;
      mLine.geometry.setDrawRange(0, n);
    }
  }

  // --- 玉・通ったあと・目印 ---
  const marbleGeo = new THREE.SphereGeometry(MARBLE_R, 24, 16);
  const marbleObjs = [];
  const fxRoot = new THREE.Group();
  scene.add(fxRoot);

  function spriteTex(draw) {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    draw(c.getContext('2d'));
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }
  const badge = (bg, text, fg = '#fff') =>
    spriteTex((x) => {
      x.fillStyle = '#fff';
      x.beginPath(); x.arc(64, 64, 62, 0, 7); x.fill();
      x.fillStyle = bg;
      x.beginPath(); x.arc(64, 64, 54, 0, 7); x.fill();
      x.fillStyle = fg;
      x.font = '900 84px "Hiragino Maru Gothic ProN", "Arial Rounded MT Bold", sans-serif';
      x.textAlign = 'center'; x.textBaseline = 'middle';
      x.fillText(text, 64, 70);
    });
  const TEX = { bad: badge('#E8452C', '!'), goal: badge('#F5A800', '★'), ok: badge('#7AC143', '✓') };

  function syncMarbles(marbles, time) {
    while (marbleObjs.length < marbles.length) {
      const i = marbleObjs.length;
      const color = MARBLE_COLORS[i % MARBLE_COLORS.length];
      const mesh = new THREE.Mesh(
        marbleGeo,
        new THREE.MeshPhongMaterial({ color, shininess: 90, specular: 0xffffff, emissive: color, emissiveIntensity: 0.25 }),
      );
      const trail = new THREE.Line(
        new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(4000 * 3), 3)),
        new THREE.LineBasicMaterial({ color, depthTest: false, transparent: true, opacity: 0.85 }),
      );
      trail.frustumCulled = false;
      trail.renderOrder = 5;
      const mark = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.bad, depthTest: false }));
      mark.renderOrder = 20;
      mark.scale.setScalar(0.9);
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.32, 0.045, 8, 32),
        new THREE.MeshBasicMaterial({ color: COL.select, depthTest: false, transparent: true }),
      );
      ring.rotation.x = Math.PI / 2;
      ring.renderOrder = 19;
      fxRoot.add(mesh, trail, mark, ring);
      marbleObjs.push({ mesh, trail, mark, ring, n: 0 });
    }
    marbleObjs.forEach((o, i) => {
      const m = marbles[i];
      const on = !!m;
      o.mesh.visible = o.trail.visible = on;
      o.mark.visible = o.ring.visible = false;
      if (!on) { o.n = 0; return; }
      o.mesh.position.set(m.pos[0], m.pos[1], m.pos[2]);
      // 通ったあと
      const attr = o.trail.geometry.attributes.position;
      const n = Math.min(m.trail.length, 4000);
      if (n !== o.n || n === 4000) {
        for (let k = Math.max(0, o.n - 1); k < n; k++) attr.setXYZ(k, m.trail[k][0], m.trail[k][1], m.trail[k][2]);
        if (n === 4000) for (let k = 0; k < n; k++) attr.setXYZ(k, m.trail[k][0], m.trail[k][1], m.trail[k][2]);
        attr.needsUpdate = true;
        o.trail.geometry.setDrawRange(0, n);
        o.n = n;
      }
      o.trail.visible = showTrail;
      if (m.mode === 'rest') {
        const kind = m.reason === 'goal' ? 'goal' : m.reason === 'out' || m.reason === 'fell' ? 'ok' : 'bad';
        o.mark.material.map = TEX[kind];
        o.mark.visible = true;
        const bob = Math.sin(time * 5 + i) * 0.08;
        o.mark.position.set(m.pos[0], m.pos[1] + 0.95 + bob, m.pos[2]);
        if (kind === 'bad') {
          o.ring.visible = true;
          o.ring.position.set(m.pos[0], m.pos[1] + 0.02, m.pos[2]);
          const s = 1 + 0.25 * Math.sin(time * 6);
          o.ring.scale.set(s, s, s);
        }
      }
    });
  }
  let showTrail = true;

  // --- タップした場所をしらべる ---
  const ray = new THREE.Raycaster();
  const ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const ndc = new THREE.Vector2();
  function pick(clientX, clientY, excludeId = null) {
    const r = canvas.getBoundingClientRect();
    ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const meshes = [];
    for (const [id, o] of pieceObjs) if (id !== excludeId) meshes.push(o.userData.mesh);
    pieceRoot.updateMatrixWorld(true); // 置いた直後でも正しい位置で当たりをとる
    const hits = ray.intersectObjects(meshes, false);
    if (hits.length) {
      const h = hits[0];
      const n = h.face.normal.clone().transformDirection(h.object.matrixWorld);
      return { pieceId: h.object.userData.pieceId, point: h.point.toArray(), normal: n.toArray() };
    }
    const p = new THREE.Vector3();
    if (ray.ray.intersectPlane(ground, p)) {
      const lim = BOARD / 2 - 0.01;
      if (Math.abs(p.x) <= lim + 2 && Math.abs(p.z) <= lim + 2) return { pieceId: null, point: p.toArray(), normal: [0, 1, 0] };
    }
    return null;
  }

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = w < h ? 44 : 32;
    camera.updateProjectionMatrix();
  }

  function render() {
    controls.update();
    renderer.render(scene, camera);
  }

  // --- カメラをボタンで動かす ---
  function orbit(dAngle, dZoom = 1) {
    const off = camera.position.clone().sub(controls.target);
    off.applyAxisAngle(new THREE.Vector3(0, 1, 0), dAngle);
    off.multiplyScalar(dZoom);
    const l = off.length();
    if (l < controls.minDistance || l > controls.maxDistance) off.setLength(Math.max(controls.minDistance, Math.min(controls.maxDistance, l)));
    camera.position.copy(controls.target).add(off);
  }
  /** スティック用: 横に回す・上下にかたむける（ラジアン）*/
  function spin(dAz, dPolar) {
    const off = camera.position.clone().sub(controls.target);
    const sph = new THREE.Spherical().setFromVector3(off);
    sph.theta += dAz;
    sph.phi = Math.max(0.12, Math.min(controls.maxPolarAngle, sph.phi + dPolar));
    off.setFromSpherical(sph);
    camera.position.copy(controls.target).add(off);
  }
  function home() {
    camera.position.copy(HOME.pos);
    controls.target.copy(HOME.target);
  }
  function tilt(top) {
    const off = camera.position.clone().sub(controls.target);
    const l = off.length();
    if (top) off.set(0.001, 1, 0.02).setLength(l);
    else off.set(off.x, l * 0.6, off.z).setLength(l);
    camera.position.copy(controls.target).add(off);
  }

  // --- パレット用の小さな絵 ---
  let thumbR = null;
  const thumbCache = new Map();
  function thumbnail(type, see = false) {
    const key = see ? type + '|x' : type;
    if (thumbCache.has(key)) return thumbCache.get(key);
    if (!thumbR) {
      thumbR = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
      thumbR.setSize(168, 168, false);
      thumbR.setClearColor(0x000000, 0);
    }
    const def = PARTS[type];
    const s = new THREE.Scene();
    s.add(new THREE.HemisphereLight(0xffffff, 0xf2d9a8, 1.7));
    const l = new THREE.DirectionalLight(0xffffff, 1.4);
    l.position.set(-3, 8, 5);
    s.add(l);
    const g = new THREE.Group();
    g.add(new THREE.Mesh(partGeometry(type), see ? [
      new THREE.MeshLambertMaterial({ color: COL.wood, transparent: true, opacity: 0.28, depthWrite: false }),
      new THREE.MeshLambertMaterial({ color: COL.xrayCut, side: THREE.DoubleSide, transparent: true, opacity: 0.8 }),
    ] : [
      new THREE.MeshLambertMaterial({ color: COL.wood }),
      new THREE.MeshLambertMaterial({ color: 0xc98a45, side: THREE.DoubleSide }),
    ]));
    if (def.bounce) {
      const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.03, 32), new THREE.MeshLambertMaterial({ color: 0x333333 }));
      pad.position.y = def.h + 0.012;
      g.add(pad);
    }
    s.add(g);
    const size = Math.max(def.w, def.d, def.h);
    const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 50);
    const k = 0.62 + size * 0.42;
    cam.left = -k; cam.right = k; cam.top = k; cam.bottom = -k;
    cam.position.set(3.2, 4.2, 5);
    cam.lookAt(0, def.h / 2 - 0.05, 0);
    cam.updateProjectionMatrix();
    thumbR.render(s, cam);
    const url = thumbR.domElement.toDataURL('image/png');
    thumbCache.set(key, url);
    return url;
  }

  return {
    renderer, camera, controls, scene,
    syncPieces, syncMarbles, showSelection, showGhost, setXray, pick, resize, render,
    orbit, home, tilt, thumbnail, spin, showPad, showMarbleGhost,
    setTrail: (on) => { showTrail = on; },
    isXray: () => xray,
  };
}

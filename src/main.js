import { PARTS, SETS } from './parts/catalog.js';
import { makePiece, footprint, center, restHeight, settle, serialize, deserialize, aabb } from './sim/world.js';
import { buildTrack } from './sim/track.js';
import { makeMarble, stepMarble } from './sim/marble.js';
import { createScene, BOARD } from './view/scene.js';
import { DEMO, DEMO_START } from './demo.js';

const $ = (id) => document.getElementById(id);
const canvas = $('view');
const view = createScene(canvas);

const params = new URLSearchParams(location.search);
const debugGrid = params.get('grid'); // 形のたしかめ用: ?grid=standard でそのセットを並べる
const SAVE_KEY = 'korokoro-tsumiki.v1';
const MAX_H = 9;
const MAX_PIECES = 400;
const MAX_MARBLES = 6;

const state = {
  pieces: [],
  track: null,
  marbles: [],
  starts: [], // 玉を置いた場所（もういちど用）
  rot: 0,
  selected: null, // えらんだパーツの id
  set: SETS[0].id,
  slow: true,
  xray: false,
  trail: true,
  undo: [],
  reported: new Set(),
};

// ---------- 保存 ----------
function save() {
  if (debugGrid) return;
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      pieces: serialize(state.pieces), slow: state.slow, xray: state.xray, set: state.set, trail: state.trail,
      starts: state.starts,
    }));
  } catch { /* 保存できなくても あそべる */ }
}
function load() {
  try {
    const d = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
    if (!d) return false;
    state.pieces = deserialize(d.pieces);
    state.slow = d.slow !== false;
    state.xray = !!d.xray;
    state.trail = d.trail !== false;
    if (SETS.some((s) => s.id === d.set)) state.set = d.set;
    if (Array.isArray(d.starts)) {
      state.starts = d.starts.filter((q) => q && Array.isArray(q.at) && q.at.length === 3 && q.at.every(Number.isFinite)).slice(-MAX_MARBLES);
    }
    return true;
  } catch { return false; }
}

function loadDemo() {
  const ps = DEMO.map(([type, cx, cz, rot = 0], i) => {
    const p = makePiece(type, cx * 2, cz * 2, rot);
    p.y = i * 0.001;
    return p;
  });
  settle(ps);
  state.pieces = ps;
  const top = ps.filter((p) => p.hx === DEMO_START.cell[0] * 2 && p.hz === DEMO_START.cell[1] * 2).pop();
  const c = center(top);
  const o = DEMO_START.offset;
  state.starts = [{ at: [c[0] + o[0], c[1] + PARTS[top.type].h + o[1], c[2] + o[2]], toward: [c[0], c[1], c[2]] }];
}

// ---------- かわったら作りなおす ----------
function pushUndo() {
  state.undo.push(JSON.stringify(serialize(state.pieces)));
  if (state.undo.length > 60) state.undo.shift();
}
function changed({ keepMarbles = false } = {}) {
  settle(state.pieces);
  state.track = buildTrack(state.pieces);
  if (!keepMarbles) clearMarbles(false);
  view.syncPieces(state.pieces);
  view.showSelection(pieceById(state.selected));
  updateUi();
  save();
}
const pieceById = (id) => state.pieces.find((p) => p.id === id) || null;

// ---------- 玉 ----------
function clearMarbles(forgetStarts) {
  state.marbles = [];
  state.reported.clear();
  if (forgetStarts) state.starts = [];
  hideToast();
}
function dropMarble(start) {
  if (state.marbles.length >= MAX_MARBLES) state.marbles.shift();
  const m = makeMarble(start.at, start.toward);
  m.start = start;
  state.marbles.push(m);
}
// しらべる用: 玉が止まるたびに、コースと結果を Mac のサーバーへ送る（server.mjs で動かしているときだけ届く）
function report(m) {
  if (debugGrid) return;
  try {
    const step = Math.max(1, Math.floor(m.trail.length / 300));
    fetch('./report', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        at: new Date().toISOString(), reason: m.reason, t: m.t, pos: m.pos, wallPos: m.wallPos, wallT: m.wallT,
        start: m.start, pieces: serialize(state.pieces), trail: m.trail.filter((_, i) => i % step === 0),
      }),
    }).catch(() => {});
  } catch { /* 送れなくても あそべる */ }
}
function replay() {
  if (!state.starts.length) return;
  clearMarbles(false);
  state.starts.forEach((s, i) => setTimeout(() => dropMarble(s), i * 350));
}

const MESSAGES = {
  goal: ['good', '★', 'ゴール！', 'やったね'],
  out: ['ok', '✓', 'つくえに でたよ', 'さいごまで ころがった'],
  fell: ['ok', '✓', 'したに おちたよ', 'みちが とぎれているかも'],
  stop: ['bad', '!', 'とちゅうで とまっちゃった', 'いきおいが たりないよ。さかを つかってみよう'],
  wall: ['bad', '!', 'かべに ぶつかった', 'みちが つながっていないよ'],
  covered: ['bad', '!', 'うえの つみきで ふさがってる', 'うらに みぞがある つみきを のせよう'],
  ontop: ['bad', '!', 'つみきの うえに のっちゃった', 'みぞが ない ばしょだよ'],
  dead: ['bad', '!', 'いきどまり', 'ここで おしまい'],
};
let toastTimer = 0;
function showToast(reason) {
  const m = MESSAGES[reason] || MESSAGES.stop;
  const el = $('toast');
  el.className = 'toast ' + (m[0] === 'bad' ? '' : m[0]);
  $('toast-ic').textContent = m[1];
  $('toast-title').textContent = m[2];
  $('toast-sub').textContent = m[3];
  el.hidden = false;
  // アニメーションをやりなおす
  el.style.animation = 'none'; void el.offsetWidth; el.style.animation = '';
  clearTimeout(toastTimer);
  if (m[0] !== 'bad') toastTimer = setTimeout(hideToast, 4000);
  beep(m[0]);
}
function hideToast() { $('toast').hidden = true; }

// ---------- 音（小さく）----------
let audio = null;
// iPad では、指でさわった時に音の準備をしないと鳴らない
function wakeAudio() {
  try {
    audio = audio || new (window.AudioContext || window.webkitAudioContext)();
    if (audio.state === 'suspended') audio.resume().catch(() => {});
  } catch { /* 音がなくても あそべる */ }
}
document.addEventListener('pointerdown', wakeAudio, { capture: true, passive: true });
function beep(kind) {
  if (!audio || audio.state !== 'running') return;
  try {
    const notes = kind === 'good' ? [660, 880, 1320] : kind === 'ok' ? [520, 660] : [300, 220];
    notes.forEach((f, i) => {
      const o = audio.createOscillator(), g = audio.createGain();
      o.type = 'triangle'; o.frequency.value = f;
      const t = audio.currentTime + i * 0.11;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.12, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
      o.connect(g).connect(audio.destination);
      o.start(t); o.stop(t + 0.25);
    });
  } catch { /* 音がなくても あそべる */ }
}

// ---------- 置く場所を決める ----------
function targetFor(type, rot, hit, excludeId = null) {
  if (!hit) return null;
  const probe = { id: -1, type, rot, hx: 0, hz: 0, y: 0 };
  const { fw, fd } = footprint(probe);
  const [px, , pz] = hit.point;
  const q = hit.pieceId != null ? pieceById(hit.pieceId) : null;
  let hx, hz;
  if (q) {
    const b = aabb(q);
    const n = hit.normal;
    const ax = q.hx + 2 * Math.floor(Math.min(Math.max(px - b.minx, 0), b.maxx - b.minx - 0.01));
    const az = q.hz + 2 * Math.floor(Math.min(Math.max(pz - b.minz, 0), b.maxz - b.minz - 0.01));
    if (Math.abs(n[1]) > 0.5 || (Math.abs(n[0]) < 0.5 && Math.abs(n[2]) < 0.5)) { hx = ax; hz = az; }
    else if (Math.abs(n[0]) >= Math.abs(n[2])) { hx = n[0] > 0 ? q.hx + footprint(q).fw : q.hx - fw; hz = az; }
    else { hz = n[2] > 0 ? q.hz + footprint(q).fd : q.hz - fd; hx = ax; }
  } else {
    hx = 2 * Math.floor(px);
    hz = 2 * Math.floor(pz);
  }
  // 横の位置は いつも 1マス単位（半マスずらしても つながる道はないので、ずらせない）
  hx = 2 * Math.round(hx / 2);
  hz = 2 * Math.round(hz / 2);
  hx = Math.max(-BOARD, Math.min(BOARD - fw, hx));
  hz = Math.max(-BOARD, Math.min(BOARD - fd, hz));
  probe.hx = hx; probe.hz = hz;
  const others = state.pieces.filter((p) => p.id !== excludeId);
  probe.y = restHeight(others, probe);
  if (probe.y + PARTS[type].h > MAX_H) return null;
  return probe;
}

// ---------- 操作 ----------
// モードはない。
//  ・下のパレット / たまボタンから ひっぱりだす → 置く
//  ・えらんだつみきを ひっぱる → 動かす（パレットの上で はなすと かたづける）
//  ・それ以外で画面をなぞる → カメラ（OrbitControls にまかせる）
const LIFT = 64; // 指で見本がかくれないよう、指より上をねらう（px）

function placeAt(probe) {
  if (state.pieces.length >= MAX_PIECES) return;
  pushUndo();
  const p = makePiece(probe.type, probe.hx, probe.hz, probe.rot);
  p.y = probe.y;
  state.pieces.push(p);
  state.selected = p.id;
  changed();
}
function removePiece(id) {
  const i = state.pieces.findIndex((p) => p.id === id);
  if (i < 0) return;
  pushUndo();
  state.pieces.splice(i, 1);
  if (state.selected === id) state.selected = null;
  changed();
}
function rotateSelected() {
  const p = pieceById(state.selected);
  if (!p) return;
  pushUndo();
  const c0 = center(p);
  p.rot = (p.rot + 1) % 4;
  // 長いパーツは まんなかを なるべく動かさずに回す
  const { fw, fd } = footprint(p);
  // （マス目からずれないよう、1マス単位にそろえる）
  p.hx = 2 * Math.round((c0[0] * 2 - fw / 2) / 2);
  p.hz = 2 * Math.round((c0[2] * 2 - fd / 2) / 2);
  p.hx = Math.max(-BOARD, Math.min(BOARD - fw, p.hx));
  p.hz = Math.max(-BOARD, Math.min(BOARD - fd, p.hz));
  p.y = restHeight(state.pieces, p, p.y + 0.01);
  state.rot = p.rot;
  changed();
}

/** 玉を置く場所: ねらった所の近くのみぞ（じょうご）に吸いつける */
function marbleSpot(hit) {
  if (!hit) return null;
  const h = hit.point;
  let best = null;
  for (const path of state.track.paths) {
    if (path.kind !== 'groove' && !path.funnel) continue;
    const n = path.funnel ? 1 : path.pts.length;
    for (let i = 0; i < n; i++) {
      if (path.blocked && path.blocked[i]) continue;
      const q = path.pts[i];
      // 上から見た近さを重く、高さのちがいは軽く見る
      const d = Math.hypot(q[0] - h[0], q[2] - h[2]) + Math.abs(q[1] - h[1]) * 0.35;
      if (d < 1.1 && (!best || d < best.d)) best = { d, path, i };
    }
  }
  if (best) {
    const q = best.path.pts[best.i];
    const c = center(best.path.piece);
    return { at: q.slice(), toward: [c[0], c[1], c[2]], snapped: true, pts: best.path.funnel ? null : best.path.pts };
  }
  if (hit.pieceId == null) return null;
  return { at: h.slice(), toward: null, snapped: false, pts: null };
}

let drag = null; // {kind:'part'|'marble'|'move', pointerId, lift, type, rot, pieceId, target}
const chip = $('chip');
const overPalette = (y) => y > canvas.getBoundingClientRect().bottom;

function beginDrag(d, e) {
  drag = d;
  drag.pointerId = e.pointerId;
  drag.lift = e.pointerType === 'mouse' ? 0 : LIFT;
  view.controls.enabled = false;
  state.selected = d.kind === 'move' ? d.pieceId : null;
  view.showSelection(null);
  hideToast();
  if (d.kind !== 'move') {
    chip.src = d.kind === 'marble' ? MARBLE_CHIP : view.thumbnail(d.type, state.xray);
    chip.hidden = false;
  }
  updateDrag(e);
  updateUi();
}

function updateDrag(e) {
  if (!drag) return;
  const x = e.clientX, y = e.clientY;
  const inPal = overPalette(y);
  chip.style.left = x + 'px';
  chip.style.top = y + 'px';
  $('bin').hidden = !(drag.kind === 'move' && inPal);
  drag.target = null;
  if (inPal) {
    view.showGhost(null); view.showPad(null); view.showMarbleGhost(null);
    if (drag.kind !== 'move') chip.hidden = false;
    return;
  }
  const hit = view.pick(x, y - drag.lift, drag.kind === 'move' ? drag.pieceId : null);
  if (drag.kind === 'marble') {
    const spot = marbleSpot(hit);
    drag.target = spot;
    view.showMarbleGhost(spot ? spot.at : null, spot && spot.snapped, spot && spot.pts);
    chip.hidden = !!spot;
  } else {
    const t = targetFor(drag.type, drag.rot, hit, drag.kind === 'move' ? drag.pieceId : null);
    if (t && drag.kind === 'move') t.flip = !!pieceById(drag.pieceId)?.flip;
    drag.target = t;
    view.showGhost(t);
    view.showPad(t);
    chip.hidden = !!t;
  }
}

function endDrag(e, cancel = false) {
  if (!drag) return;
  const d = drag;
  if (!cancel) updateDrag(e);
  drag = null;
  view.controls.enabled = true;
  view.showGhost(null); view.showPad(null); view.showMarbleGhost(null);
  chip.hidden = true;
  $('bin').hidden = true;
  if (!cancel) {
    if (d.kind === 'part' && d.target) placeAt(d.target);
    else if (d.kind === 'move') {
      const p = pieceById(d.pieceId);
      if (p && overPalette(e.clientY)) removePiece(p.id);
      else if (p && d.target && (d.target.hx !== p.hx || d.target.hz !== p.hz)) {
        pushUndo();
        p.hx = d.target.hx; p.hz = d.target.hz; p.y = d.target.y + 0.0005;
        changed();
      }
    } else if (d.kind === 'marble' && d.target) {
      const start = { at: d.target.at, toward: d.target.toward };
      state.starts.push(start);
      if (state.starts.length > MAX_MARBLES) state.starts.shift();
      dropMarble(start);
      save();
    }
  }
  view.showSelection(pieceById(state.selected));
  updateUi();
}

window.addEventListener('pointermove', (e) => { if (drag && e.pointerId === drag.pointerId) updateDrag(e); });
window.addEventListener('pointerup', (e) => { if (drag && e.pointerId === drag.pointerId) endDrag(e); });
window.addEventListener('pointercancel', (e) => { if (drag && e.pointerId === drag.pointerId) endDrag(e, true); });

/**
 * ひっぱりだせる元（パレットのつみき・たまボタン）にする。
 * scroller があるとき（パレット）: 横になぞるとスクロール、上へ引くか パレットの外へ出ると 取り出す。
 * ななめに引いても取り出せるよう、スクロールはブラウザまかせにせず ここで動かす。
 */
function makeSource(el, make, scroller = null) {
  let st = null;
  el.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (drag) return;
    st = { id: e.pointerId, x: e.clientX, y: e.clientY, scroll0: scroller ? scroller.scrollLeft : 0, scrolling: false };
    try { el.setPointerCapture(e.pointerId); } catch { /* なくても動く */ }
  });
  el.addEventListener('pointermove', (e) => {
    if (!st || e.pointerId !== st.id || drag) return;
    const dx = e.clientX - st.x, dy = e.clientY - st.y;
    let pull;
    if (scroller) {
      pull = dy < -14 || overPalette(e.clientY) === false;
      if (!pull && (st.scrolling || Math.abs(dx) > 8)) {
        st.scrolling = true;
        scroller.scrollLeft = st.scroll0 - dx;
        return;
      }
    } else pull = Math.hypot(dx, dy) > 10;
    if (!pull) return;
    st = null;
    beginDrag(make(), e);
  });
  const up = () => { if (st && st.scrolling) lastDragEnd = performance.now(); st = null; };
  el.addEventListener('pointerup', up);
  el.addEventListener('pointercancel', up);
  el.addEventListener('click', () => {
    if (performance.now() - lastDragEnd < 300) return;
    el.classList.remove('nudge'); void el.offsetWidth; el.classList.add('nudge');
    flashHint(scroller ? 'うえに ひっぱって、おきたい ところで はなしてね' : 'みぞの ところまで ひっぱって、はなしてね');
  });
}
let lastDragEnd = 0;
window.addEventListener('pointerup', () => { if (drag) lastDragEnd = performance.now(); }, { capture: true });

const MARBLE_CHIP = 'data:image/svg+xml,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 84 84"><defs><radialGradient id="g" cx="35%" cy="30%"><stop offset="0" stop-color="#fff"/><stop offset=".35" stop-color="#E8452C"/><stop offset="1" stop-color="#b52a18"/></radialGradient></defs><circle cx="42" cy="42" r="24" fill="url(#g)"/></svg>');
makeSource($('src-marble'), () => ({ kind: 'marble' }));

// --- 3D 画面: えらんだつみきを ひっぱると動く。それ以外はカメラ ---
let tapSt = null;
canvas.addEventListener('pointerdown', (e) => {
  if (drag) return;
  if (e.pointerType === 'mouse' && e.button !== 0) return;
  const hit = view.pick(e.clientX, e.clientY);
  tapSt = { id: e.pointerId, x: e.clientX, y: e.clientY, hit, moved: false };
  // えらんであるつみきの上から始めたら、カメラは止めて「動かす」準備
  if (hit && hit.pieceId != null && hit.pieceId === state.selected) {
    view.controls.enabled = false;
    tapSt.grab = hit.pieceId;
  }
}, { capture: true });
canvas.addEventListener('pointermove', (e) => {
  if (!tapSt || e.pointerId !== tapSt.id || drag) return;
  if (Math.hypot(e.clientX - tapSt.x, e.clientY - tapSt.y) <= 10) return;
  tapSt.moved = true;
  if (tapSt.grab != null) {
    const p = pieceById(tapSt.grab);
    tapSt = null;
    if (p) beginDrag({ kind: 'move', pieceId: p.id, type: p.type, rot: p.rot }, e);
  }
}, { capture: true });
function canvasUp(e) {
  if (!tapSt || e.pointerId !== tapSt.id) return;
  const t = tapSt;
  tapSt = null;
  if (!drag) view.controls.enabled = true;
  if (e.type === 'pointercancel' || t.moved || drag) return;
  // タップ: つみきを えらぶ / えらぶのを やめる
  const id = t.hit ? t.hit.pieceId : null;
  state.selected = id != null && id !== state.selected ? id : null;
  view.showSelection(pieceById(state.selected));
  updateUi();
}
canvas.addEventListener('pointerup', canvasUp, { capture: true });
canvas.addEventListener('pointercancel', canvasUp, { capture: true });
// 2本目の指が来たら（ピンチ）、タップあつかいにしない
canvas.addEventListener('pointerdown', (e) => { if (tapSt && e.pointerId !== tapSt.id) { tapSt.moved = true; if (!drag) view.controls.enabled = true; tapSt.grab = null; } });
canvas.addEventListener('contextmenu', (e) => e.preventDefault());

// --- カメラのスティック ---
const stick = { x: 0, y: 0, id: null };
{
  const el = $('stick'), knob = $('knob');
  const set = (e) => {
    const r = el.getBoundingClientRect();
    const R = r.width / 2;
    let dx = (e.clientX - (r.left + R)) / R, dy = (e.clientY - (r.top + R)) / R;
    const l = Math.hypot(dx, dy);
    if (l > 1) { dx /= l; dy /= l; }
    stick.x = dx; stick.y = dy;
    knob.style.transform = `translate(${dx * R * 0.6}px, ${dy * R * 0.6}px)`;
  };
  const end = (e) => {
    if (e.pointerId !== stick.id) return;
    stick.id = null; stick.x = stick.y = 0;
    knob.style.transform = '';
  };
  el.addEventListener('pointerdown', (e) => {
    stick.id = e.pointerId;
    try { el.setPointerCapture(e.pointerId); } catch { /* なくても動く */ }
    set(e);
  });
  el.addEventListener('pointermove', (e) => { if (e.pointerId === stick.id) set(e); });
  el.addEventListener('pointerup', end);
  el.addEventListener('pointercancel', end);
}

// ---------- 画面のボタン ----------
let hintTimer = 0;
function flashHint(text) {
  $('hint').textContent = text;
  clearTimeout(hintTimer);
  hintTimer = setTimeout(updateHint, 2500);
}
function updateHint() {
  $('hint').textContent = state.pieces.length ? '' : 'したの つみきを うえに ひっぱって おいてね';
}

function updateUi() {
  $('actions').hidden = state.selected == null || !!drag;
  const sel = pieceById(state.selected);
  $('act-flip').hidden = !(sel && PARTS[sel.type].flippable);
  $('btn-go').disabled = !state.starts.length;
  $('btn-xray').setAttribute('aria-pressed', String(state.xray));
  $('speed-ic').textContent = state.slow ? '🐢' : '🐇';
  $('speed-lb').textContent = state.slow ? 'ゆっくり' : 'はやい';
  $('m-trail').textContent = 'とおった みち： ' + (state.trail ? 'みせる' : 'かくす');
  updateHint();
}

function buildPalette() {
  const tabs = $('tabs');
  tabs.innerHTML = '';
  for (const s of SETS) {
    const b = document.createElement('button');
    b.className = 'tab' + (s.id === state.set ? ' on' : '');
    b.style.setProperty('--c', s.color);
    // 明るい色のタブは 文字をこくする
    const [r, g, bl] = [1, 3, 5].map((i) => parseInt(s.color.slice(i, i + 2), 16));
    if (0.299 * r + 0.587 * g + 0.114 * bl > 165) b.style.color = '#3a2a1a';
    b.textContent = s.name;
    b.addEventListener('click', () => { state.set = s.id; buildPalette(); save(); });
    tabs.appendChild(b);
  }
  const items = $('items');
  items.innerHTML = '';
  items.scrollLeft = 0;
  const set = SETS.find((s) => s.id === state.set);
  const queue = [];
  for (const type of set.parts) {
    const b = document.createElement('button');
    b.className = 'item';
    b.dataset.type = type;
    b.style.setProperty('--c', set.color);
    const img = document.createElement('img');
    img.alt = type;
    img.draggable = false;
    const no = document.createElement('span');
    no.className = 'no';
    no.textContent = type;
    b.append(img, no);
    makeSource(b, () => ({ kind: 'part', type, rot: state.rot }), items);
    items.appendChild(b);
    queue.push([type, img]);
  }
  // 小さな絵は 1つずつ順に作る（画面を止めない）
  const token = (buildPalette.token = (buildPalette.token || 0) + 1);
  const next = () => {
    if (token !== buildPalette.token || !queue.length) return;
    const [type, img] = queue.shift();
    img.src = view.thumbnail(type, state.xray);
    setTimeout(next, 0);
  };
  next();
  updateUi();
}

$('act-rot').addEventListener('click', rotateSelected);
$('act-del').addEventListener('click', () => state.selected != null && removePiece(state.selected));
$('act-flip').addEventListener('click', () => {
  const p = pieceById(state.selected);
  if (!p || !PARTS[p.type].flippable) return;
  pushUndo();
  p.flip = !p.flip;
  changed();
});
$('btn-go').addEventListener('click', replay);
$('btn-clear-marbles').addEventListener('click', () => { clearMarbles(true); updateUi(); save(); });
$('btn-xray').addEventListener('click', () => { state.xray = !state.xray; view.setXray(state.xray); buildPalette(); save(); });
$('btn-speed').addEventListener('click', () => { state.slow = !state.slow; updateUi(); save(); });
$('btn-undo').addEventListener('click', () => {
  const s = state.undo.pop();
  if (!s) return;
  state.pieces = deserialize(JSON.parse(s));
  state.selected = null;
  changed();
});
$('btn-menu').addEventListener('click', () => { $('menu').hidden = false; });
$('m-close').addEventListener('click', () => { $('menu').hidden = true; });
$('m-demo').addEventListener('click', () => {
  pushUndo();
  loadDemo();
  state.selected = null;
  $('menu').hidden = true;
  changed();
  view.home();
});
$('m-trail').addEventListener('click', () => { state.trail = !state.trail; view.setTrail(state.trail); updateUi(); save(); });
// コースをリンクにする（別の端末で開く・人に送る用）。中身は URL の # 以降に入るだけで、どこにも送らない
function courseLink() {
  const json = JSON.stringify({ p: serialize(state.pieces), s: state.starts });
  const code = btoa(unescape(encodeURIComponent(json))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return location.origin + location.pathname + '#c=' + code;
}
function loadFromLink() {
  const m = /^#c=([\w-]+)$/.exec(location.hash);
  if (!m) return false;
  try {
    const b64 = m[1].replace(/-/g, '+').replace(/_/g, '/');
    const d = JSON.parse(decodeURIComponent(escape(atob(b64))));
    const ps = deserialize(d.p);
    if (!ps.length) return false;
    state.pieces = ps;
    state.starts = (Array.isArray(d.s) ? d.s : [])
      .filter((q) => q && Array.isArray(q.at) && q.at.length === 3 && q.at.every(Number.isFinite)).slice(-MAX_MARBLES);
    history.replaceState(null, '', location.pathname + location.search);
    return true;
  } catch { return false; }
}
$('m-share').addEventListener('click', async () => {
  const url = courseLink();
  $('menu').hidden = true;
  try {
    if (navigator.share) { await navigator.share({ title: 'ころころ つみき', url }); return; }
  } catch { /* やめた・使えない → コピーへ */ }
  try { await navigator.clipboard.writeText(url); flashHint('リンクを コピーしたよ'); }
  catch { window.prompt('このリンクを コピーしてね', url); }
});
$('m-wipe').addEventListener('click', () => { $('menu').hidden = true; $('confirm').hidden = false; });
$('c-no').addEventListener('click', () => { $('confirm').hidden = true; });
$('c-yes').addEventListener('click', () => {
  pushUndo();
  state.pieces = [];
  state.selected = null;
  state.starts = [];
  $('confirm').hidden = true;
  changed();
});
$('cam-in').addEventListener('click', () => view.orbit(0, 0.8));
$('cam-out').addEventListener('click', () => view.orbit(0, 1.25));
$('cam-home').addEventListener('click', () => view.home());

window.addEventListener('keydown', (e) => {
  if (e.key === 'r' || e.key === 'R') rotateSelected();
  else if (e.key === 'Backspace' || e.key === 'Delete') state.selected != null && removePiece(state.selected);
  else if (e.key === 'z' && (e.metaKey || e.ctrlKey)) $('btn-undo').click();
  else if (e.key === ' ') { e.preventDefault(); replay(); }
});
// iPad でのピンチによるページ拡大を止める
document.addEventListener('gesturestart', (e) => e.preventDefault());

// ---------- まいフレーム ----------
function tick(dt) {
  const scale = state.slow ? 0.4 : 1;
  for (const m of state.marbles) {
    if (m.mode === 'rest') continue;
    stepMarble(m, state.track, dt * scale);
    if (m.mode === 'rest' && !state.reported.has(m)) {
      state.reported.add(m);
      showToast(m.reason);
      report(m);
    }
  }
}
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  tick(dt);
  if (stick.x || stick.y) view.spin(-stick.x * dt * 2.2, -stick.y * dt * 1.3);
  view.syncMarbles(state.marbles, now / 1000);
  view.render();
  requestAnimationFrame(frame);
}

// ---------- はじまり ----------
if (debugGrid) {
  const set = SETS.find((s) => s.id === debugGrid) || SETS[0];
  const cols = +params.get('cols') || 5;
  // &only=A,GX で そのパーツだけ、&flip=1 で うらがえして並べる
  const types = params.get('only') ? params.get('only').split(',').filter((t) => PARTS[t]) : set.parts;
  state.pieces = types.map((type, i) => makePiece(type, Math.round(((i % cols) - (cols - 1) / 2) * 2) * 2, (Math.floor(i / cols) - 1) * 6, +params.get('rot') || 0, params.get('flip') === '1'));
  state.set = set.id;
} else if (loadFromLink()) {
  // リンクのコースを使う（保存してあるコースは読まない）
} else if (params.get('demo') || !load() || !state.pieces.length) loadDemo();
if (params.get('demo') === 'wall') { state.pieces[state.pieces.length - 1].type = '1'; }
if (params.get('xray')) state.xray = params.get('xray') === '1';
view.setXray(state.xray);
view.setTrail(state.trail);
view.resize();
// 3D の画面は、下のパレットをのぞいた高さにする
const palette = document.querySelector('.palette');
const fitPalette = () => document.documentElement.style.setProperty('--pal', palette.offsetHeight + 'px');
new ResizeObserver(fitPalette).observe(palette);
fitPalette();
window.addEventListener('resize', view.resize);
new ResizeObserver(view.resize).observe(canvas);
buildPalette();
changed({ keepMarbles: true });
requestAnimationFrame(frame);
if (params.get('fast') === '1') state.slow = false;
if (params.get('run') === '1') setTimeout(replay, 300);
if (params.get('run') === '2') { state.starts.forEach(dropMarble); for (let i = 0; i < 6000; i++) tick(1 / 60); }
if (params.get('cam') === 'top') view.tilt(true);
if (params.get('zoom')) view.orbit(+params.get('turn') || 0, +params.get('zoom'));

// しらべる用（開発）
window.__app = { state, view, replay, targetFor, placeAt, changed, pieceById, tick, LIFT };
if (params.get('selftest') === '1') import('./dev/selftest.js').then((m) => m.run(window.__app));

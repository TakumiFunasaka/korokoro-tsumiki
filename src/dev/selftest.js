// 開発用: ?selftest=1 で、指の操作をまねして動きをたしかめる。結果は画面左上と title に出す。
import * as THREE from 'three';

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

export async function run(app) {
  const { state, view, LIFT } = app;
  const canvas = view.renderer.domElement;
  const log = [];
  const ok = (name, cond, extra = '') => log.push(`${cond ? 'OK ' : 'NG '} ${name} ${extra}`);
  const toScreen = (x, y, z) => {
    const v = new THREE.Vector3(x, y, z).project(view.camera);
    const r = canvas.getBoundingClientRect();
    return [r.left + ((v.x + 1) / 2) * r.width, r.top + ((1 - v.y) / 2) * r.height];
  };
  // 指は、ねらう所より LIFT だけ下にある
  const finger = (p) => [p[0], p[1] + LIFT];
  const ev = (el, type, [x, y], id = 1) => {
    try {
      el.dispatchEvent(new PointerEvent(type, {
        pointerId: id, clientX: x, clientY: y, button: 0, buttons: type === 'pointerup' ? 0 : 1,
        pointerType: 'touch', isPrimary: true, bubbles: true, cancelable: true,
      }));
    } catch (e) { log.push('ERR ' + e.message); }
  };
  const mid = (el) => { const r = el.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; };
  const drag = async (el, a, b) => {
    ev(el, 'pointerdown', a); await wait(20);
    for (let i = 1; i <= 10; i++) { ev(el, 'pointermove', [a[0] + ((b[0] - a[0]) * i) / 10, a[1] + ((b[1] - a[1]) * i) / 10]); await wait(12); }
    ev(el, 'pointerup', b); await wait(60);
  };
  const tap = async (p) => { ev(canvas, 'pointerdown', p); await wait(30); ev(canvas, 'pointerup', p); await wait(60); };
  const item = (type) => document.querySelector(`.item[data-type="${type}"]`);
  const pull = (type, world) => drag(item(type), mid(item(type)), finger(toScreen(...world)));

  try {
    state.pieces.length = 0; state.starts.length = 0; app.changed();
    view.home(); view.controls.update(); view.render();
    await wait(100);

    // パレットから ひっぱりだして置く
    await pull('2', [0.5, 0, 0.5]);
    ok('ひっぱりだして つくえに 置く', state.pieces.length === 1 && state.pieces[0].hx === 0 && state.pieces[0].hz === 0, JSON.stringify(state.pieces));
    ok('置いた つみきが えらばれて、そうさボタンが出る', state.selected === state.pieces[0]?.id && !document.getElementById('actions').hidden);
    await pull('2', [0.5, 1, 0.5]);
    ok('上に 積む', state.pieces.length === 2 && state.pieces[1].y === 1, JSON.stringify(state.pieces.map((p) => p.y)));
    await pull('2', [2.5, 0, 0.5]);
    ok('はなれた所に 置く', state.pieces.length === 3 && state.pieces[2].hx === 4);

    // パレットの上で はなしたら 置かない
    const n0 = state.pieces.length;
    await drag(item('2'), mid(item('2')), [mid(item('2'))[0] + 5, mid(item('2'))[1] - 20]);
    ok('パレットの上で はなすと 置かない', state.pieces.length === n0);

    // 画面をなぞっても 置かれない・動かない（カメラだけ）
    const before = JSON.stringify(state.pieces);
    state.selected = null; app.changed();
    await drag(canvas, toScreen(-4, 0, 3), toScreen(-1, 0, 4));
    await drag(canvas, toScreen(0.5, 1.5, 0.5), toScreen(3, 0, 3));
    ok('画面をなぞっても 何も置かれず 動かない', JSON.stringify(state.pieces) === before);

    // タップで えらぶ → まわす → もどす
    await tap(toScreen(2.5, 1, 0.5));
    ok('タップで えらぶ', state.selected === state.pieces[2].id);
    const r0 = state.pieces[2].rot;
    document.getElementById('act-rot').click();
    ok('まわす', state.pieces[2].rot === (r0 + 1) % 4);
    document.getElementById('btn-undo').click();
    ok('もどす', state.pieces[2].rot === r0);

    // えらんだ つみきを ひっぱって動かす
    await tap(toScreen(2.5, 1, 0.5));
    const id2 = state.selected;
    ev(canvas, 'pointerdown', toScreen(2.5, 1, 0.5)); await wait(20);
    const dest = finger(toScreen(-2.5, 0, 2.5));
    for (let i = 1; i <= 10; i++) { const a = toScreen(2.5, 1, 0.5); ev(canvas, 'pointermove', [a[0] + ((dest[0] - a[0]) * i) / 10, a[1] + ((dest[1] - a[1]) * i) / 10]); await wait(12); }
    ev(canvas, 'pointerup', dest); await wait(60);
    const moved = app.pieceById(id2);
    ok('えらんだ つみきを ひっぱって うごかす', moved && moved.hx === -6 && moved.hz === 4 && moved.y === 0, JSON.stringify(moved));

    // パレットの上で はなすと かたづける
    const n1 = state.pieces.length;
    const from = toScreen(-2.5, 1, 2.5);
    ev(canvas, 'pointerdown', from); await wait(20);
    const palY = canvas.getBoundingClientRect().bottom + 40;
    for (let i = 1; i <= 10; i++) { ev(canvas, 'pointermove', [from[0], from[1] + ((palY - from[1]) * i) / 10]); await wait(12); }
    ev(canvas, 'pointerup', [from[0], palY]); await wait(60);
    ok('パレットに もどすと かたづく', state.pieces.length === n1 - 1, String(state.pieces.length));

    // けすボタン
    await tap(toScreen(0.5, 2, 0.5));
    document.getElementById('act-del').click();
    ok('けすボタン', state.pieces.length === n1 - 2);

    // 玉: ひっぱりだすと みぞに吸いつく（少しずれた所をねらう）
    const src = document.getElementById('src-marble');
    await drag(src, mid(src), finger(toScreen(0.25, 1, 0.75)));
    ok('たまを ひっぱりだして 置く', state.marbles.length === 1 && state.starts.length === 1);
    const st = state.starts[0];
    ok('みぞに 吸いつく', st && Math.abs(st.at[2] - 0.5) < 0.03 && Math.abs(st.at[1] - 1) < 0.03, st && st.at.map((v) => v.toFixed(2)).join(','));
    state.slow = false;
    for (let i = 0; i < 3000 && state.marbles[0] && state.marbles[0].mode !== 'rest'; i++) app.tick(1 / 60);
    const m = state.marbles[0];
    ok('たまが 止まって 理由が出る', m && m.mode === 'rest' && !document.getElementById('toast').hidden, m && m.reason);
    ok('みぞに そって ころがった', m && Math.abs(m.pos[0] - 0.5) > 0.4, m && m.pos.map((v) => v.toFixed(2)).join(','));

    // 長いレール（2マス）と、そのとなり
    state.pieces.length = 0; state.rot = 0; app.changed();
    document.querySelector('.tab:nth-child(2)').click();
    await wait(50);
    await pull('GC', [0.5, 0, 0.5]);
    const gc = state.pieces[0];
    ok('GC（2マス）を置く', gc && gc.type === 'GC' && gc.hz === 0, JSON.stringify(gc));
    await pull('G', [0.5, 0, 2.4]);
    const g2 = state.pieces[1];
    ok('となりの G が くっつく', g2 && g2.hz === 4 && g2.y === 0, JSON.stringify(g2));
    state.selected = gc.id;
    document.getElementById('act-rot').click();
    ok('長いレールを回しても マスからずれない', gc.hx % 2 === 0 && gc.hz % 2 === 0, JSON.stringify(gc));

    // スティックで カメラが回る
    const stickEl = document.getElementById('stick');
    const p0 = view.camera.position.clone();
    const c = mid(stickEl);
    ev(stickEl, 'pointerdown', [c[0] + 30, c[1]]);
    for (let i = 0; i < 20; i++) { view.spin(-0.05, 0); }
    ev(stickEl, 'pointerup', [c[0] + 30, c[1]]);
    ok('カメラが 回る', view.camera.position.distanceTo(p0) > 1);

    document.getElementById('btn-xray').click();
    ok('なかを みる', state.xray === true);
  } catch (e) {
    log.push('EXCEPTION ' + (e && e.stack || e));
  }
  const pre = document.createElement('pre');
  pre.id = 'selftest';
  pre.style.cssText = 'position:fixed;left:90px;top:80px;background:#fff;padding:8px;font:12px monospace;z-index:99;white-space:pre-wrap;max-width:60vw';
  pre.textContent = log.join('\n');
  document.body.appendChild(pre);
  document.title = log.every((l) => l.startsWith('OK')) ? 'SELFTEST PASS' : 'SELFTEST FAIL';
}

import { W, H, PILOTS, PILOT, UPGRADES, UP_COST, UP_MAX, ITEMS, STAGES } from './data.js?v=1';
import { Game } from './game.js?v=1';
import { draw, drawBackground, drawShip, portrait } from './render.js?v=1';
import { sfx, music } from './audio.js?v=1';
import { t, L, getLang, setLang, NAMES, SHIPS, PILOT_TEXT, STAGE_TEXT, UP_TEXT, ITEM_TEXT, STORY } from './i18n.js?v=1';

const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);
const isTouch = matchMedia('(pointer: coarse)').matches || params.has('touch');
document.body.classList.toggle('touch', isTouch);
document.body.classList.toggle('clean', params.has('clean'));

// ------------------------------------------------------------------ save
const KEY = 'starsquad.save.v1';
const fresh = () => ({ credits: 0, ups: {}, items: {}, cleared: 0, pilot: 'josh', stage: 1, seenPrologue: false, best: {}, sound: true, music: true });
let save = (() => { try { return { ...fresh(), ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch (e) { return fresh(); } })();
const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(save)); } catch (e) { /* private mode */ } };
if (params.has('rich')) { save.credits = 99999; }
if (params.get('unlock')) save.cleared = Math.max(save.cleared, Number(params.get('unlock')));

// ------------------------------------------------------------------ canvas
const cv = $('cv'), c = cv.getContext('2d');
cv.width = W; cv.height = H;
c.imageSmoothingEnabled = false;
function fit() {
  const box = $('stage'), vw = innerWidth, vh = innerHeight;
  const s = Math.min(vw / W, vh / H);
  box.style.width = Math.floor(W * s) + 'px'; box.style.height = Math.floor(H * s) + 'px';
  document.documentElement.style.setProperty('--px', s.toFixed(3));
}
addEventListener('resize', fit); fit();

// ------------------------------------------------------------------ state
const S = { screen: 'title', g: null, paused: false, dialog: null, shake: 0, time: 0, after: null, bossShown: false };
const menuGame = new Game({ stage: 1, pilot: save.pilot });     // only used to draw the backgrounds of the menus

// ------------------------------------------------------------------ input (keys + drag), with guards against lost key / touch releases
const keys = new Set(), keySeen = {};
const drag = { id: null, x: 0, y: 0, dx: 0, dy: 0 };
let edge = { skill: false, bomb: false };
addEventListener('keydown', (e) => {
  if (S.dialog) { if (['Space', 'Enter', 'KeyZ', 'ArrowRight'].includes(e.code)) { advanceDialog(); e.preventDefault(); } if (e.code === 'Escape') endDialog(); return; }
  if (S.screen !== 'play') return;
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
  if (e.code === 'KeyP' || e.code === 'Escape') { togglePause(); return; }
  if (S.paused) return;
  if (!e.repeat) { if (e.code === 'Space' || e.code === 'KeyJ') edge.skill = true; if (e.code === 'KeyB' || e.code === 'KeyK') edge.bomb = true; }
  keys.add(e.code); const k = keySeen[e.code] || (keySeen[e.code] = {}); k.t = performance.now(); if (e.repeat) k.rep = true;
});
addEventListener('keyup', (e) => { keys.delete(e.code); delete keySeen[e.code]; if (e.key === 'Meta') resetInput(); });
function resetInput() { keys.clear(); for (const k in keySeen) delete keySeen[k]; drag.id = null; drag.dx = drag.dy = 0; }
addEventListener('blur', resetInput);
document.addEventListener('visibilitychange', () => { if (document.hidden) { resetInput(); if (S.screen === 'play' && !S.paused && !S.dialog) togglePause(); } });
function pruneKeys() { const now = performance.now(); for (const code of [...keys]) { const k = keySeen[code]; if (k && ((k.rep && now - k.t > 600) || (!k.rep && now - k.t > 1500))) { keys.delete(code); delete keySeen[code]; } } }
const area = $('touchArea');
area.addEventListener('pointerdown', (e) => {
  sfx.unlock();
  if (S.screen !== 'play' || S.paused || S.dialog) return;
  drag.id = e.pointerId; drag.x = e.clientX; drag.y = e.clientY;
  try { area.setPointerCapture(e.pointerId); } catch (er) { /* gone */ }
});
area.addEventListener('pointermove', (e) => {
  if (e.pointerId !== drag.id) return;
  const k = 1.15 / parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--px') || 1);
  drag.dx += (e.clientX - drag.x) * k; drag.dy += (e.clientY - drag.y) * k;
  drag.x = e.clientX; drag.y = e.clientY;
});
const endDrag = (e) => { if (e.pointerId === drag.id) { drag.id = null; } };
for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) area.addEventListener(ev, endDrag);
addEventListener('pointerup', endDrag, true);
for (const ev of ['touchend', 'touchcancel']) addEventListener(ev, (e) => { if (!e.touches || !e.touches.length) drag.id = null; }, true);
$('bSkill').addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); edge.skill = true; });
$('bBomb').addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); edge.bomb = true; });
$('bPause').addEventListener('click', () => togglePause());

function readInput() {
  pruneKeys();
  let ax = 0, ay = 0;
  if (keys.has('ArrowLeft') || keys.has('KeyA')) ax -= 1;
  if (keys.has('ArrowRight') || keys.has('KeyD')) ax += 1;
  if (keys.has('ArrowUp') || keys.has('KeyW')) ay -= 1;
  if (keys.has('ArrowDown') || keys.has('KeyS')) ay += 1;
  const inp = { ax, ay, dx: drag.dx, dy: drag.dy, focus: keys.has('ShiftLeft') || keys.has('ShiftRight'), skill: edge.skill, bomb: edge.bomb };
  drag.dx = drag.dy = 0; edge = { skill: false, bomb: false };
  return inp;
}

// ------------------------------------------------------------------ screens
function show(screen) {
  S.screen = screen;
  for (const id of ['title', 'hangar', 'hud', 'result', 'ending']) $(id).hidden = true;
  if (screen === 'title') { $('title').hidden = false; paintTitle(); music.play('hangar'); }
  if (screen === 'hangar') { $('hangar').hidden = false; paintHangar(); music.play('hangar'); }
  if (screen === 'play') $('hud').hidden = false;
  if (screen === 'result') $('result').hidden = false;
  if (screen === 'ending') { $('ending').hidden = false; document.querySelectorAll('#ending img').forEach((im) => { im.src = portrait(im.dataset.who); }); }
}
function paintTitle() {
  $('tTitle').textContent = t('title'); $('tSub').textContent = t('sub');
  $('tStart').textContent = save.seenPrologue ? t('cont') : t('start');
  $('tNew').hidden = !save.seenPrologue; $('tNew').textContent = t('newGame');
  $('tLang').textContent = t('lang');
  $('tCtl').textContent = isTouch ? t('controlsTouch') : t('controlsPC');
}
$('tStart').onclick = () => {
  sfx.unlock(); sfx.play('click');
  if (!save.seenPrologue) dialog(STORY.prologue, () => { save.seenPrologue = true; persist(); show('hangar'); });
  else show('hangar');
};
$('tNew').onclick = () => { if (!confirm(t('resetQ'))) return; const keep = { sound: save.sound, music: save.music }; save = { ...fresh(), ...keep }; persist(); paintTitle(); };
$('tLang').onclick = () => { setLang(getLang() === 'zh' ? 'en' : 'zh'); paintTitle(); paintStatic(); };

// ------------------------------------------------------------------ hangar
let tab = 'missions';
function paintHangar() {
  $('hCredits').textContent = Math.floor(save.credits);
  $('hTitle').textContent = t('hangar');
  document.querySelectorAll('#tabs button').forEach((b) => { b.textContent = t(b.dataset.tab); b.classList.toggle('sel', b.dataset.tab === tab); b.onclick = () => { tab = b.dataset.tab; sfx.play('click'); paintHangar(); }; });
  $('hLaunch').innerHTML = `${t('launch')}<small>${t('stage', save.stage)} · ${L(STAGE_TEXT[save.stage - 1].name)} · ${L(NAMES[save.pilot])}</small>`;
  const box = $('panel');
  if (tab === 'missions') {
    box.innerHTML = STAGES.map((st, i) => {
      const open = i <= save.cleared, done = i < save.cleared, txt = STAGE_TEXT[i];
      return `<button class="mission ${save.stage === st.id ? 'sel' : ''}" data-s="${st.id}" ${open ? '' : 'disabled'} style="--a:${st.pal.a};--g:${st.pal.glow}">
        <span class="num">${st.id}</span><span class="mt"><b>${L(txt.name)}</b><small>${open ? L(txt.desc) : t('locked')}</small>
        <small class="boss">${t('boss')}: ${open ? L(NAMES[st.boss]) : '???'}</small></span>
        <span class="st">${done ? t('cleared') : ''}${save.best[st.id] ? `<br>${t('best', save.best[st.id])}` : ''}</span></button>`;
    }).join('');
    box.querySelectorAll('.mission').forEach((b) => b.onclick = () => { save.stage = +b.dataset.s; persist(); sfx.play('click'); paintHangar(); });
  }
  if (tab === 'pilots') {
    box.innerHTML = PILOTS.map((p) => {
      const tx = PILOT_TEXT[p.id];
      return `<div class="pilot ${save.pilot === p.id ? 'sel' : ''}" style="--c:${p.color}">
        <div class="ph"><img src="${portrait(p.id)}" alt=""><canvas data-ship="${p.id}" width="72" height="72"></canvas></div>
        <div class="pt"><b>${L(NAMES[p.id])}</b> <small>${L(SHIPS[p.id])} · ${L(tx.role)}</small>
          <p><i>${t('weapon')}</i>${L(tx.weapon)}</p><p><i>${t('active')}</i>${L(tx.active)}</p><p><i>${t('passive')}</i>${L(tx.passive)}</p>
          <button data-p="${p.id}">${save.pilot === p.id ? '✔ ' + t('selected') : t('choose')}</button></div></div>`;
    }).join('');
    box.querySelectorAll('canvas[data-ship]').forEach((cn) => { const x = cn.getContext('2d'); x.imageSmoothingEnabled = false; x.fillStyle = '#0a0e22'; x.fillRect(0, 0, 72, 72); drawShip(x, cn.dataset.ship, 36, 34, 0, { scale: 2.6 }); });
    box.querySelectorAll('button[data-p]').forEach((b) => b.onclick = () => { save.pilot = b.dataset.p; persist(); sfx.play('click'); paintHangar(); });
  }
  if (tab === 'upgrades') {
    box.innerHTML = UPGRADES.map((u) => {
      const lv = save.ups[u.id] || 0, cost = UP_COST[lv], tx = UP_TEXT[u.id];
      return `<div class="row"><span class="ic">${u.icon}</span><span class="rt"><b>${L(tx)}</b><small>${L(tx.d)}</small>
        <span class="pips">${Array.from({ length: UP_MAX }, (_, i) => `<i class="${i < lv ? 'on' : ''}"></i>`).join('')}</span></span>
        ${lv >= UP_MAX ? `<span class="maxed">${t('max')}</span>` : `<button data-u="${u.id}" ${save.credits < cost ? 'class="poor"' : ''}>🪙 ${cost}</button>`}</div>`;
    }).join('');
    box.querySelectorAll('button[data-u]').forEach((b) => b.onclick = () => {
      const id = b.dataset.u, lv = save.ups[id] || 0, cost = UP_COST[lv];
      if (save.credits < cost) { toast(t('notEnough')); sfx.play('click'); return; }
      save.credits -= cost; save.ups[id] = lv + 1; persist(); sfx.play('buy'); paintHangar();
    });
  }
  if (tab === 'shop') {
    box.innerHTML = ITEMS.map((it) => {
      const n = save.items[it.id] || 0, tx = ITEM_TEXT[it.id];
      return `<div class="row"><span class="ic">${it.icon}</span><span class="rt"><b>${L(tx)}</b><small>${L(tx.d)}</small><small class="own">${t('owned', n)} / ${it.max}</small></span>
        ${n >= it.max ? `<span class="maxed">${t('max')}</span>` : `<button data-i="${it.id}" ${save.credits < it.price ? 'class="poor"' : ''}>🪙 ${it.price}</button>`}</div>`;
    }).join('');
    box.querySelectorAll('button[data-i]').forEach((b) => b.onclick = () => {
      const it = ITEMS.find((x) => x.id === b.dataset.i), n = save.items[it.id] || 0;
      if (save.credits < it.price) { toast(t('notEnough')); sfx.play('click'); return; }
      save.credits -= it.price; save.items[it.id] = n + 1; persist(); sfx.play('buy'); paintHangar();
    });
  }
}
$('hLaunch').onclick = () => { sfx.play('click'); launch(save.stage); };
$('hStory').onclick = () => dialog(STORY.prologue, () => {});
$('hHelp').onclick = () => { $('helpBody').innerHTML = t('helpBody').map((p) => `<p>${p}</p>`).join('') + `<p class="ctl">${isTouch ? t('controlsTouch') : t('controlsPC')}</p>`; $('help').hidden = false; };
$('helpClose').onclick = () => { $('help').hidden = true; };
$('hLang').onclick = () => { setLang(getLang() === 'zh' ? 'en' : 'zh'); paintStatic(); paintHangar(); };
$('hSound').onclick = () => { save.sound = !save.sound; save.music = save.sound; persist(); applySound(); };
function applySound() { sfx.on = save.sound; music.on = save.music; $('hSound').textContent = save.sound ? '🔊' : '🔇'; }

// ------------------------------------------------------------------ a mission
function launch(stage) {
  const items = { ...save.items };
  save.items = {}; persist();
  S.g = new Game({ stage, pilot: save.pilot, upgrades: save.ups, items });
  S.stage = stage; S.paused = false; S.bossShown = false; S.hpShown = -1;
  show('play');
  paintHud(true);
  music.play('s' + stage);
  dialog(STORY[`s${stage}_intro`], () => {});
}
function togglePause() {
  if (S.screen !== 'play' || S.dialog) return;
  S.paused = !S.paused; resetInput();
  $('pause').hidden = !S.paused;
  $('pTitle').textContent = t('pause'); $('pResume').textContent = t('resume'); $('pQuit').textContent = t('quit');
}
$('pResume').onclick = () => togglePause();
$('pQuit').onclick = () => { const g = S.g; save.credits += Math.round(g.credits); persist(); S.paused = false; $('pause').hidden = true; S.g = null; show('hangar'); };

function handleEvents(g) {
  for (const e of g.ev) {
    switch (e.type) {
      case 'kill': sfx.play('boom', { big: e.big }); if (e.big) S.shake = 5; break;
      case 'boom': break;
      case 'coin': sfx.play('coin'); break;
      case 'power': sfx.play('power'); toast(t('powerUp'), 900); break;
      case 'heart': sfx.play('heart'); break;
      case 'hit': sfx.play('hit'); S.shake = 8; flash('#ff3a3a'); break;
      case 'shield': sfx.play('shield'); toast(t('shieldHit'), 900); break;
      case 'repair': sfx.play('heart'); toast(t('repaired'), 1200); break;
      case 'revive': sfx.play('revive'); toast(t('hpRevive'), 1600); flash('#ffb03a'); break;
      case 'skill': sfx.play('skill'); flash(PILOT[save.pilot].color); break;
      case 'bomb': sfx.play('bomb'); S.shake = 14; flash('#ffffff'); break;
      case 'elite': toast(t('elite'), 1400); break;
      case 'bossWarn': sfx.play('warn'); warning(); break;
      case 'bossStart': music.play('boss'); setTimeout(() => { if (S.g === g) dialog(STORY[`s${S.stage}_boss`], () => {}); }, 2500); break;
      case 'bossPhase': S.shake = 6; break;
      case 'bossDown': sfx.play('bossDown'); S.shake = 16; break;
      case 'clear': setTimeout(() => missionClear(g), 400); break;
      case 'dead': sfx.play('dead'); setTimeout(() => missionFail(g), 1600); break;
    }
  }
  g.ev.length = 0;
}
function missionClear(g) {
  if (S.g !== g) return;
  sfx.play('clear');
  const r = g.result;
  save.credits += r.total;
  save.cleared = Math.max(save.cleared, S.stage);
  save.best[S.stage] = Math.max(save.best[S.stage] || 0, r.score);
  if (S.stage < STAGES.length && save.stage === S.stage) save.stage = S.stage + 1;
  persist();
  const last = S.stage === STAGES.length;
  dialog(STORY[`s${S.stage}_clear`] || [], () => {
    if (last) { music.play('ending'); dialog(STORY.ending, () => showResult(true, r, true)); }
    else { music.play('hangar'); showResult(true, r); }
  });
}
function missionFail(g) {
  if (S.g !== g) return;
  const got = Math.round(g.credits);
  save.credits += got; persist();
  showResult(false, { credits: got, score: g.score });
}
function showResult(win, r, ending) {
  show('result');
  $('rTitle').textContent = win ? t('clearTitle') : t('failTitle');
  $('rTitle').className = win ? 'win' : 'lose';
  const row = (k, v) => `<div><span>${k}</span><b>${v}</b></div>`;
  $('rBody').innerHTML = win
    ? row(t('gotCredits'), '🪙 ' + r.credits) + row(t('clearBonus'), '🪙 ' + r.clear) + (r.nohit ? row(t('nohitBonus'), '🪙 ' + r.nohit) : '') + row(t('total'), '🪙 ' + r.total) + row(t('score'), r.score)
    : row(t('gotCredits'), '🪙 ' + r.credits) + `<p>${t('keep')}</p>` + row(t('score'), r.score);
  $('rRetry').textContent = t('retry'); $('rRetry').hidden = win;
  $('rHangar').textContent = t('toHangar');
  $('rRetry').onclick = () => launch(S.stage);
  $('rHangar').onclick = () => { S.g = null; if (ending) show('ending'); else show('hangar'); };
  if (ending) $('rHangar').textContent = '▶';
}
$('endBack').onclick = () => show('hangar');

// ------------------------------------------------------------------ HUD
function paintHud(force) {
  const g = S.g, p = g.p;
  const hpKey = `${p.hp}/${p.maxHp}/${p.shield}`;
  if (force || hpKey !== S.hpShown) {
    S.hpShown = hpKey;
    $('hp').innerHTML = Array.from({ length: p.maxHp }, (_, i) => `<i class="${i < p.hp ? 'on' : ''}"></i>`).join('') + (p.shield ? `<span class="sh">🛡️${p.shield}</span>` : '');
  }
  $('pow').textContent = 'P' + p.power;
  $('cr').innerHTML = '<i class="coin"></i>' + Math.floor(g.credits);
  $('sc').textContent = String(g.score).padStart(7, '0');
  $('skillBar').style.width = p.energy + '%';
  $('bSkill').classList.toggle('ready', p.energy >= 100 && p.skill <= 0);
  $('bSkill').classList.toggle('active', p.skill > 0);
  $('bombN').textContent = p.bombs;
  $('bBomb').classList.toggle('none', p.bombs <= 0);
  const b = g.boss;
  $('bossBar').hidden = !(b && b.vulnerable && g.phase === 'boss');
  if (b) { $('bossName').textContent = L(NAMES[b.id]); $('bossHp').style.width = (100 * b.hp) / b.maxHp + '%'; }
}
function paintStatic() {
  document.title = `${t('title')} · ${t('sub')}`;
  $('bSkill').title = t('skill'); $('bBomb').title = t('bomb');
  $('hStory').textContent = '📜 ' + t('story'); $('hLang').textContent = t('lang'); $('hHelp').textContent = '?';
  $('helpTitle').textContent = t('help'); $('endTitle').textContent = t('theEnd'); $('endThanks').textContent = t('thanks'); $('endBack').textContent = t('toHangar');
}
let toastT = 0;
function toast(msg, ms = 1500) { const el = $('toast'); el.textContent = msg; el.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('on'), ms); }
function flash(color) { const el = $('flash'); el.style.background = color; el.classList.remove('on'); void el.offsetWidth; el.classList.add('on'); }
function warning() { const el = $('warn'); el.innerHTML = `<b>${t('warning')}</b><small>${t('bossApproach')}</small>`; el.classList.remove('on'); void el.offsetWidth; el.classList.add('on'); }

// ------------------------------------------------------------------ dialogue
function dialog(lines, done) {
  if (!lines || !lines.length) { done(); return; }
  S.dialog = { lines, i: 0, done, shown: 0, full: '' };
  $('dialog').hidden = false;
  $('dSkip').textContent = t('skip');
  showLine();
}
function lineText(l) { if (l.who === 'pilot') return L(l[save.pilot]); return L(l); }
function showLine() {
  const d = S.dialog, l = d.lines[d.i], who = l.who === 'pilot' ? save.pilot : l.who;
  $('dImg').src = portrait(who);
  $('dName').textContent = L(NAMES[who]);
  $('dialog').className = ['goliath', 'queen', 'hydra', 'titan', 'null'].includes(who) ? 'foe' : '';
  d.full = lineText(l); d.shown = 0; $('dText').textContent = '';
}
function advanceDialog() {
  const d = S.dialog; if (!d) return;
  if (d.shown < d.full.length) { d.shown = d.full.length; $('dText').textContent = d.full; return; }
  d.i++; sfx.play('click');
  if (d.i >= d.lines.length) endDialog(); else showLine();
}
function endDialog() { const d = S.dialog; if (!d) return; S.dialog = null; $('dialog').hidden = true; resetInput(); d.done(); }
$('dialog').addEventListener('pointerdown', (e) => { if (e.target.id === 'dSkip') return; advanceDialog(); });
$('dSkip').addEventListener('pointerdown', (e) => { e.stopPropagation(); endDialog(); });
function typeTick(dt) {
  const d = S.dialog; if (!d || d.shown >= d.full.length) return;
  const before = Math.floor(d.shown);
  d.shown = Math.min(d.full.length, d.shown + dt * (getLang() === 'zh' ? 28 : 55));
  if (Math.floor(d.shown) !== before) { $('dText').textContent = d.full.slice(0, Math.floor(d.shown)); if (Math.floor(d.shown) % 3 === 0) sfx.play('blip'); }
}

// ------------------------------------------------------------------ main loop
let last = performance.now(), acc = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.1, Math.max(0, (now - last) / 1000)); last = now;
  S.time += dt;
  typeTick(dt);
  if (S.screen === 'play' && S.g) {
    const g = S.g;
    if (!S.paused && !S.dialog) {
      acc += dt;
      let n = 0;
      while (acc >= 1 / 60 && n < 4) { acc -= 1 / 60; n++; g.update(1 / 60, readInput()); handleEvents(g); }
    } else acc = 0;
    S.shake = Math.max(0, S.shake - dt * 30);
    draw(c, g, S.time, { shake: S.shake, focus: keys.has('ShiftLeft') || keys.has('ShiftRight') });
    paintHud();
  } else {
    // menus: the selected stage's sky with the chosen ship cruising
    menuGame.st = STAGES[(S.screen === 'title' ? 0 : save.stage - 1)];
    drawBackground(c, menuGame, S.time);
    drawShip(c, save.pilot, W / 2 + Math.sin(S.time * 0.8) * 50, H * 0.72 + Math.sin(S.time * 1.7) * 8, S.time, { scale: 2 });
  }
}
setLang(getLang());
paintStatic(); applySound();
show('title');
if (params.has('hangar')) { save.seenPrologue = true; show('hangar'); if (params.get('tab')) { tab = params.get('tab'); paintHangar(); } }
if (params.get('play')) { save.seenPrologue = true; if (params.get('pilot')) save.pilot = params.get('pilot'); launch(Number(params.get('play'))); if (params.has('nodialog')) endDialog(); }
requestAnimationFrame(frame);
window.SS = { S, save, launch, dialog, advanceDialog, endDialog, show, step: (n = 1) => { for (let i = 0; i < n; i++) { S.g.update(1 / 60, readInput()); handleEvents(S.g); } }, readInput, keys, edge: () => edge };

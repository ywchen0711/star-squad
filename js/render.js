// Draws a Game in game units (360x640); main.js scales the context to the screen's real resolution so everything stays sharp.
import { W, H, PILOT } from './data.js?v=2';

const TAU = Math.PI * 2;
let lastT = null, fdt = 1 / 60;                 // time since the previous frame (scrolling and fades are time-based)
const trail = [];
const nebula = {};
// soft, slowly drifting nebula clouds per stage, drawn once into an offscreen canvas
function nebulaFor(st) {
  if (nebula[st.id]) return nebula[st.id];
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H * 2;
  const x = cv.getContext('2d');
  const cols = [st.pal.glow, st.pal.a, st.pal.b];
  for (let i = 0; i < 9; i++) {
    const cx = Math.random() * W, cy = Math.random() * H * 2, r = 60 + Math.random() * 140;
    const g = x.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, hexA(cols[i % 3], 0.22)); g.addColorStop(1, hexA(cols[i % 3], 0));
    x.fillStyle = g; x.fillRect(0, 0, W, H * 2);
    // wrap vertically so the loop is seamless
    if (cy < r) { x.save(); x.translate(0, H * 2); x.fillRect(0, -r * 2, W, r * 2); x.restore(); }
  }
  return (nebula[st.id] = cv);
}
function hexA(hex, a) { const n = parseInt(hex.slice(1), 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`; }
let stars = null;
function makeStars() {
  stars = [];
  for (let l = 0; l < 3; l++) for (let i = 0; i < 40 + l * 20; i++) stars.push({ x: Math.random() * W, y: Math.random() * H, l, tw: Math.random() * TAU });
}
const decor = [];
function makeDecor(bg) {
  decor.length = 0;
  for (let i = 0; i < 9; i++) decor.push({ x: Math.random() * W, y: Math.random() * H * 1.4 - H * 0.2, s: 0.5 + Math.random(), r: Math.random() * TAU, k: Math.random() });
  decor.bg = bg;
}

export function drawBackground(c, g, time) {
  const st = g.st, pal = st.pal;
  fdt = lastT === null ? 1 / 60 : Math.min(0.05, Math.max(0, time - lastT)); lastT = time;
  const f60 = fdt * 60;
  if (!stars) makeStars();
  if (decor.bg !== st.bg) makeDecor(st.bg);
  const gr = c.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, pal.sky[0]); gr.addColorStop(1, pal.sky[1]);
  c.fillStyle = gr; c.fillRect(0, 0, W, H);
  // nebula clouds
  const nb = nebulaFor(st), off = (time * 10) % (H * 2);
  c.drawImage(nb, 0, off - H * 2); c.drawImage(nb, 0, off);
  // stage scenery behind the stars
  const scroll = time * 30;
  if (st.bg === 'forge') {
    const sun = c.createRadialGradient(W / 2, -40, 10, W / 2, -40, 230);
    sun.addColorStop(0, 'rgba(255,240,150,.95)'); sun.addColorStop(0.35, 'rgba(255,140,40,.55)'); sun.addColorStop(1, 'rgba(255,60,0,0)');
    c.fillStyle = sun; c.fillRect(0, 0, W, H);
  }
  if (st.bg === 'neon') {
    c.strokeStyle = 'rgba(255,74,176,.18)'; c.lineWidth = 1;
    for (let y = (scroll * 2) % 32; y < H; y += 32) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }
    for (let x = 0; x < W; x += 36) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, H); c.stroke(); }
    for (const s of [0, 1]) for (let i = 0; i < 6; i++) {           // station towers along the sides
      const y = ((i * 110 + scroll * 1.4) % 660) - 80, x = s ? W - 26 : 0;
      c.fillStyle = '#1a0a2e'; c.fillRect(x, y, 26, 80);
      c.fillStyle = i % 2 ? '#4af0ff' : '#ff4ab0';
      for (let k = 0; k < 4; k++) c.fillRect(x + 6 + (k % 2) * 10, y + 10 + k * 16, 5, 3);
    }
  }
  if (st.bg === 'core') {
    for (let i = 0; i < 9; i++) {
      const y = ((i * 64 + scroll * 1.5) % 576) - 64;
      c.fillStyle = i % 2 ? '#1a1d26' : '#20242e'; c.fillRect(0, y, W, 64);
      c.fillStyle = '#2c313e'; for (let x = 8; x < W; x += 48) c.fillRect(x, y + 6, 36, 4);
      c.fillStyle = Math.sin(time * 4 + i) > 0.6 ? '#ff3a4a' : '#5a1a22'; c.fillRect(6, y + 30, 4, 4); c.fillRect(W - 10, y + 30, 4, 4);
    }
  }
  // stars
  for (const s of stars) {
    s.y += (0.2 + s.l * 0.5) * (st.bg === 'core' ? 0.3 : 1) * f60; if (s.y > H) { s.y = 0; s.x = Math.random() * W; }
    const a = 0.4 + 0.3 * s.l + 0.2 * Math.sin(time * 3 + s.tw);
    c.fillStyle = `rgba(255,255,255,${a})`;
    c.fillRect(s.x, s.y, s.l === 2 ? 2 : 1, s.l === 2 ? 2 : 1);
  }
  // drifting scenery in front of the stars
  for (const d of decor) {
    d.y += (0.6 + d.s * 0.5) * f60; if (d.y > H + 60) { d.y = -60; d.x = Math.random() * W; }
    c.save(); c.translate(d.x, d.y); c.rotate(d.r + time * 0.2 * (d.k - 0.5));
    if (st.bg === 'asteroids') { c.fillStyle = 'rgba(90,70,55,.55)'; blob(c, 18 * d.s); c.fillStyle = 'rgba(60,46,36,.6)'; c.fillRect(-4 * d.s, -3 * d.s, 6 * d.s, 5 * d.s); }
    if (st.bg === 'crystal') { c.fillStyle = d.k > 0.5 ? 'rgba(106,232,255,.35)' : 'rgba(200,160,255,.35)'; crystal(c, 14 * d.s); }
    if (st.bg === 'forge') { c.fillStyle = 'rgba(255,120,40,.25)'; c.fillRect(-1, -20 * d.s, 2, 40 * d.s); }
    if (st.bg === 'neon' && d.k > 0.6) { c.fillStyle = 'rgba(74,240,255,.2)'; c.fillRect(-12, -2, 24, 4); }
    c.restore();
  }
}
function blob(c, r) { c.beginPath(); for (let i = 0; i < 9; i++) { const a = (i / 9) * TAU, rr = r * (0.75 + ((i * 7) % 5) * 0.08); i ? c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : c.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); } c.closePath(); c.fill(); }
function crystal(c, r) { c.beginPath(); c.moveTo(0, -r); c.lineTo(r * 0.45, -r * 0.2); c.lineTo(r * 0.3, r); c.lineTo(-r * 0.3, r); c.lineTo(-r * 0.45, -r * 0.2); c.closePath(); c.fill(); }
const poly = (c, pts) => { c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath(); c.fill(); };
const circ = (c, x, y, r) => { c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); };

// ------------------------------------------------------------------ the player's ship
export function drawShip(c, id, x, y, time, opt = {}) {
  const P = PILOT[id];
  c.save(); c.translate(x, y);
  if (opt.scale) c.scale(opt.scale, opt.scale);
  // engine glow + flame
  const fl = 6 + Math.sin(time * 40) * 2 + (opt.boost ? 7 : 0);
  const glow = c.createRadialGradient(0, 10, 0, 0, 10, 12 + fl);
  glow.addColorStop(0, 'rgba(255,220,120,.85)'); glow.addColorStop(0.4, 'rgba(255,140,40,.35)'); glow.addColorStop(1, 'rgba(255,90,0,0)');
  c.fillStyle = glow; c.fillRect(-20, -4, 40, 36);
  c.fillStyle = '#ffe88a'; poly(c, [[-3, 8], [3, 8], [0, 9 + fl]]);
  c.fillStyle = '#ffffff'; poly(c, [[-1.4, 8], [1.4, 8], [0, 8 + fl * 0.55]]);
  // body: shaded from dark on the left to light on the right, with a dark outline
  const shade = c.createLinearGradient(-15, 0, 15, 0);
  shade.addColorStop(0, P.dark); shade.addColorStop(0.45, P.color); shade.addColorStop(0.7, P.light); shade.addColorStop(1, P.color);
  const body = {
    josh: [[0, -14], [3, -6], [5, -2], [14, 7], [13, 9], [5, 6.5], [3, 9], [-3, 9], [-5, 6.5], [-13, 9], [-14, 7], [-5, -2], [-3, -6]],
    jasper: [[0, -12], [4, -5], [7, -2], [15, 1], [15, 8], [7, 7], [4, 9.5], [-4, 9.5], [-7, 7], [-15, 8], [-15, 1], [-7, -2], [-4, -5]],
    jeff: [[0, -13], [5, -9], [8, -4], [13, -1], [13, 9], [6, 10], [-6, 10], [-13, 9], [-13, -1], [-8, -4], [-5, -9]],
    erin: [[0, -13], [3, -5], [9, -7], [16, -10], [13, 0], [8, 5], [3, 9.5], [-3, 9.5], [-8, 5], [-13, 0], [-16, -10], [-9, -7], [-3, -5]],
  }[id];
  c.fillStyle = shade; poly(c, body);
  c.strokeStyle = 'rgba(5,8,20,.85)'; c.lineWidth = 0.9; c.lineJoin = 'round';
  c.beginPath(); body.forEach(([px, py], i) => (i ? c.lineTo(px, py) : c.moveTo(px, py))); c.closePath(); c.stroke();
  // details per ship
  c.fillStyle = P.dark;
  if (id === 'josh') { c.fillRect(-11, 5.2, 4, 1.4); c.fillRect(7, 5.2, 4, 1.4); c.fillStyle = '#ffffff'; c.fillRect(-0.6, -12, 1.2, 4); }
  if (id === 'jasper') { c.fillStyle = '#e8f4ec'; c.fillRect(-15, 1.5, 3, 6); c.fillRect(12, 1.5, 3, 6); c.fillStyle = '#e8322c'; c.fillRect(-15, 1.5, 3, 1.5); c.fillRect(12, 1.5, 3, 1.5); }
  if (id === 'jeff') { c.fillRect(-11, 1, 5, 5); c.fillRect(6, 1, 5, 5); c.fillStyle = 'rgba(255,255,255,.35)'; c.fillRect(-11, 1, 5, 1); c.fillRect(6, 1, 5, 1); }
  if (id === 'erin') { c.fillStyle = '#ffd0f0'; for (const s of [-1, 1]) { poly(c, [[s * 14.5, -9.5], [s * 11, -6], [s * 12, -4]]); } }
  // canopy with a highlight
  const glass = c.createLinearGradient(0, -9, 0, 1);
  glass.addColorStop(0, '#ffffff'); glass.addColorStop(0.35, P.light); glass.addColorStop(1, P.dark);
  c.fillStyle = glass; poly(c, [[0, -9], [2.6, -3], [1.6, 1], [-1.6, 1], [-2.6, -3]]);
  c.fillStyle = 'rgba(255,255,255,.9)'; c.fillRect(-1.2, -7, 1, 3);
  c.restore();
}

// ------------------------------------------------------------------ the whole frame
export function draw(c, g, time, view = {}) {
  c.save();
  if (view.shake) c.translate(((Math.random() - 0.5) * view.shake), ((Math.random() - 0.5) * view.shake));
  drawBackground(c, g, time);
  const pal = g.st.pal;
  // pickups
  for (const k of g.pk) {
    if (k.kind === 'C') { const w = Math.abs(Math.cos(time * 6 + k.x)) * (k.v >= 25 ? 5 : k.v >= 5 ? 4 : 3) + 1; c.fillStyle = k.v >= 25 ? '#fff07a' : '#ffc83a'; c.fillRect((k.x - w / 2), (k.y - 3), Math.ceil(w), k.v >= 5 ? 7 : 5); c.fillStyle = '#b07a10'; c.fillRect((k.x - w / 2), (k.y + (k.v >= 5 ? 3 : 1)), Math.ceil(w), 1); }
    if (k.kind === 'P') { c.fillStyle = '#e8322c'; c.fillRect((k.x - 6), (k.y - 5), 12, 10); c.fillStyle = '#fff'; c.font = 'bold 9px monospace'; c.textAlign = 'center'; c.fillText('P', k.x, (k.y + 3)); }
    if (k.kind === 'H') { c.fillStyle = '#ff4a7a'; circ(c, k.x - 3, k.y - 1, 3.5); circ(c, k.x + 3, k.y - 1, 3.5); poly(c, [[k.x - 6.5, k.y], [k.x + 6.5, k.y], [k.x, k.y + 7]]); }
  }
  // enemies
  for (const e of g.en) if (!e.dead && e.t >= 0) drawEnemy(c, e, pal, time);
  if (g.boss) drawBoss(c, g, g.boss, time);
  // enemy lasers
  for (const b of g.beams) {
    c.save(); c.translate(b.x, b.y); c.rotate(b.ang - Math.PI / 2);
    if (b.warn > 0) { c.globalAlpha = 0.35 + 0.35 * Math.sin(time * 30); c.fillStyle = b.color; c.fillRect(-1, 0, 2, b.len); c.globalAlpha = 0.15; c.fillRect(-b.w / 2, 0, b.w, b.len); }
    else { c.fillStyle = b.color; c.globalAlpha = 0.85; c.fillRect(-b.w / 2, 0, b.w, b.len); c.globalAlpha = 1; c.fillStyle = '#ffffff'; c.fillRect(-b.w / 5, 0, (b.w * 2) / 5, b.len); }
    c.restore(); c.globalAlpha = 1;
  }
  // player's bullets
  for (const b of g.pb) {
    if (b.kind === 'missile') { c.fillStyle = '#c4ffd4'; c.save(); c.translate(b.x, b.y); c.rotate(Math.atan2(b.vy, b.vx)); c.fillRect(-4, -1.5, 8, 3); c.fillStyle = '#ffb03a'; c.fillRect(-7, -1, 3, 2); c.restore(); }
    else if (b.kind === 'wave') { c.fillStyle = '#ecd4ff'; circ(c, b.x, b.y, 3.5); }
    else if (b.kind === 'reflect') { c.fillStyle = '#ffd0c0'; c.fillRect((b.x - 2), (b.y - 4), 4, 8); }
    else {
      c.fillStyle = b.kind === 'drone' ? 'rgba(255,140,230,.22)' : 'rgba(255,220,90,.22)'; c.beginPath(); c.ellipse(b.x, b.y, 3.6, 8, 0, 0, TAU); c.fill();
      c.fillStyle = b.kind === 'drone' ? '#ffd0f0' : '#fff6a0'; c.fillRect(b.x - 1.5, b.y - 5, 3, 9);
      c.fillStyle = '#ffffff'; c.fillRect(b.x - 0.6, b.y - 4, 1.2, 6);
    }
  }
  // Jeff's laser
  if (g.beam && g.pilot.weapon === 'laser' && g.phase !== 'dead') {
    const bm = g.beam, h = bm.y0 - bm.y1, fl = Math.sin(time * 50) * 1;
    c.fillStyle = 'rgba(255,90,60,.55)'; c.fillRect((bm.x - bm.w / 2 - 2 - fl), bm.y1, (bm.w + 4 + fl * 2), h);
    c.fillStyle = '#ffe0d0'; c.fillRect((bm.x - bm.w / 4), bm.y1, Math.max(2, bm.w / 2), h);
    c.fillStyle = '#ffffff'; circ(c, bm.x, bm.y1, bm.w / 2 + 2 + fl);
  }
  // player
  const p = g.p;
  if (g.phase !== 'dead') {
    if (g.pilot.weapon === 'wave') for (const d of g.dronePos()) { c.fillStyle = '#4a1a7a'; circ(c, d.x, d.y, 4); c.fillStyle = '#ecd4ff'; circ(c, d.x, d.y, 2.5); }
    trail.push({ x: p.x + (Math.random() - 0.5) * 3, y: p.y + 11, life: 0.32 });
    for (const t2 of trail) { t2.life -= fdt; t2.y += 70 * fdt; }
    while (trail.length && trail[0].life <= 0) trail.shift();
    for (const t2 of trail) { const a = t2.life / 0.32; c.fillStyle = `rgba(255,${150 + 90 * a},${60 + 120 * a},${0.5 * a})`; circ(c, t2.x, t2.y, 0.6 + 2.2 * a); }
    const dash = p.skill > 0 && g.pilot.active === 'dash';
    if (dash) for (let k = 3; k > 0; k--) { c.globalAlpha = 0.15 * k; drawShip(c, g.pilot.id, p.x, p.y + k * 7, time); }
    c.globalAlpha = p.inv > 0 && !dash && Math.sin(time * 40) > 0 ? 0.35 : 1;
    drawShip(c, g.pilot.id, p.x, p.y, time, { boost: dash });
    c.globalAlpha = 1;
    if (p.shield > 0) { c.strokeStyle = 'rgba(120,200,255,.7)'; c.lineWidth = 1; c.beginPath(); c.arc(p.x, p.y, 15, 0, TAU); c.stroke(); }
    if (p.skill > 0 && g.pilot.active === 'mirror') { c.strokeStyle = `rgba(255,220,200,${0.6 + 0.3 * Math.sin(time * 20)})`; c.lineWidth = 2; c.beginPath(); c.arc(p.x, p.y, 34, 0, TAU); c.stroke(); c.fillStyle = 'rgba(255,200,180,.12)'; circ(c, p.x, p.y, 34); }
    if (view.focus || (p.skill > 0 && g.pilot.active === 'warp')) { c.fillStyle = '#ffffff'; circ(c, p.x, p.y, 2.5); c.fillStyle = '#ff3a6a'; circ(c, p.x, p.y, 1.5); }
  }
  // enemy bullets on top
  for (const b of g.eb) {
    if (b.kind === 'rock') { c.fillStyle = b.color; c.save(); c.translate(b.x, b.y); c.rotate(b.t * 3); blob(c, b.r + 1); c.restore(); continue; }
    c.globalAlpha = 0.3; c.fillStyle = b.color; circ(c, b.x, b.y, b.r + 3.5); c.globalAlpha = 1;
    c.fillStyle = b.color; circ(c, b.x, b.y, b.r + 1);
    c.fillStyle = '#ffffff'; circ(c, b.x, b.y, Math.max(1, b.r - 1));
  }
  // particles
  for (const f of g.fx) {
    if (f.ring) { c.globalAlpha = Math.max(0, f.life / f.max) * 0.8; c.strokeStyle = f.color; c.lineWidth = 2.2 * (f.life / f.max) + 0.5; c.beginPath(); c.arc(f.x, f.y, f.r, 0, TAU); c.stroke(); continue; }
    c.globalAlpha = Math.max(0, f.life / f.max); c.fillStyle = f.color; circ(c, f.x, f.y, f.size * 0.6);
  }
  c.globalAlpha = 1;
  if (g.warp < 1) { c.fillStyle = 'rgba(140,90,255,.12)'; c.fillRect(0, 0, W, H); }
  c.restore();
}

function drawEnemy(c, e, pal, time) {
  c.save(); c.translate(e.x, e.y);
  const hit = e.flash > 0 && Math.floor(time * 30) % 2 === 0; if (e.flash > 0) e.flash -= fdt;   // flicker white when hit
  const A = hit ? '#ffffff' : pal.a, B = hit ? '#ffffff' : pal.b, G = pal.glow;
  switch (e.type) {
    case 'drone': c.fillStyle = B; poly(c, [[0, 9], [9, -2], [5, -8], [-5, -8], [-9, -2]]); c.fillStyle = A; poly(c, [[0, 6], [6, -2], [0, -6], [-6, -2]]); c.fillStyle = G; c.fillRect(-1, -1, 3, 3); break;
    case 'dart': c.fillStyle = A; poly(c, [[0, 10], [7, -6], [0, -2], [-7, -6]]); c.fillStyle = G; c.fillRect(-1, 0, 2, 3); break;
    case 'gunner': c.fillStyle = B; c.fillRect(-11, -8, 22, 14); c.fillStyle = A; c.fillRect(-9, -6, 18, 10); c.fillStyle = G; c.fillRect(-2, 4, 4, 7); c.fillRect(-8, -3, 3, 3); c.fillRect(5, -3, 3, 3); break;
    case 'spinner': c.rotate(time * 3); c.fillStyle = B; for (let k = 0; k < 4; k++) { c.rotate(Math.PI / 2); c.fillRect(-3, 4, 6, 9); } c.fillStyle = A; circ(c, 0, 0, 8); c.fillStyle = G; circ(c, 0, 0, 3); break;
    case 'tank': c.fillStyle = B; c.fillRect(-16, -14, 32, 26); c.fillStyle = A; c.fillRect(-13, -11, 26, 20); c.fillStyle = G; c.fillRect(-3, 6, 6, 9); c.fillStyle = B; c.fillRect(-16, -16, 6, 6); c.fillRect(10, -16, 6, 6); hpBar(c, e, 20); break;
    case 'mine': c.fillStyle = B; circ(c, 0, 0, 8); c.fillStyle = Math.sin(time * 10 + e.x) > 0 ? '#ff5a3a' : A; for (let k = 0; k < 6; k++) { const a = (k / 6) * TAU + time; c.fillRect(Math.cos(a) * 9 - 1, Math.sin(a) * 9 - 1, 3, 3); } c.fillStyle = G; c.fillRect(-1, -1, 3, 3); break;
    case 'rock': case 'pebble': c.rotate(e.rot || 0); c.fillStyle = hit ? '#fff' : '#7a6248'; blob(c, e.r); c.fillStyle = hit ? '#fff' : '#9a7e5e'; blob(c, e.r * 0.6); break;
    case 'elite': c.fillStyle = B; poly(c, [[0, 22], [24, 2], [18, -16], [-18, -16], [-24, 2]]); c.fillStyle = A; poly(c, [[0, 16], [18, 0], [12, -12], [-12, -12], [-18, 0]]); c.fillStyle = G; circ(c, 0, 0, 5); c.fillRect(-20, -4, 4, 8); c.fillRect(16, -4, 4, 8); hpBar(c, e, 26); break;
    case 'clone': c.globalAlpha = 0.55 + 0.2 * Math.sin(time * 8); drawQueen(c, '#c86aff', time); c.globalAlpha = 1; break;
    default: c.fillStyle = A; circ(c, 0, 0, e.r);
  }
  c.restore();
}
function hpBar(c, e, y) { if (e.hp >= e.maxHp) return; c.fillStyle = '#300'; c.fillRect(-12, y, 24, 2); c.fillStyle = '#ff5a5a'; c.fillRect(-12, y, (24 * e.hp) / e.maxHp, 2); }

function drawQueen(c, col, time) {
  c.fillStyle = '#2a0a3a'; poly(c, [[0, 26], [20, 6], [16, -18], [0, -24], [-16, -18], [-20, 6]]);
  c.fillStyle = col; poly(c, [[0, 20], [14, 4], [11, -14], [0, -18], [-11, -14], [-14, 4]]);
  c.fillStyle = '#ffe0ff'; poly(c, [[-8, -6], [8, -6], [5, 2], [-5, 2]]);
  c.fillStyle = '#ff2a8a'; c.fillRect(-5, -4, 3, 2); c.fillRect(2, -4, 3, 2);
  c.fillStyle = '#ffd23a'; for (let k = -2; k <= 2; k++) poly(c, [[k * 5 - 2, -18], [k * 5 + 2, -18], [k * 5, -26 + Math.abs(k) * 2]]);
  void time;
}

function drawBoss(c, g, b, time) {
  c.save(); c.translate(b.x, b.y);
  const hit = b.flash > 0 && Math.floor(time * 30) % 3 === 0, pal = g.st.pal;
  const A = hit ? '#ffffff' : pal.a, B = hit ? '#ffffff' : pal.b, G = pal.glow;
  if (g.phase === 'bossDown') c.translate((Math.random() - 0.5) * 4, (Math.random() - 0.5) * 4);
  switch (b.id) {
    case 'goliath': {
      c.fillStyle = B; c.fillRect(-40, -30, 80, 56); c.fillStyle = A; c.fillRect(-34, -26, 68, 46);
      for (const s of [-1, 1]) { c.fillStyle = B; c.fillRect(s * 46 - 10, -6, 20, 26); c.fillStyle = '#c8c8d0'; poly(c, [[s * 46 - 8, 20], [s * 46 + 8, 20], [s * 46, 36 + Math.sin(time * 20) * 2]]); }
      c.fillStyle = '#20202a'; c.fillRect(-22, -14, 44, 14); c.fillStyle = b.ph ? '#ff3a2a' : G; c.fillRect(-16, -10, 10, 6); c.fillRect(6, -10, 10, 6);
      c.fillStyle = B; for (let k = -2; k <= 2; k++) c.fillRect(k * 12 - 3, 8, 6, 8);
      break;
    }
    case 'queen': c.globalAlpha = b.alpha; drawQueen(c, hit ? '#ffffff' : '#ff6ad8', time); c.globalAlpha = 1; break;
    case 'hydra': {
      c.fillStyle = B; blob(c, 30); c.fillStyle = A; crystal(c, 26);
      for (const [dx, dy] of [[-62, 14], [0, 18], [62, 14]]) {
        c.fillStyle = B; c.fillRect(dx * 0.5 - 3, 0, 6, dy); c.save(); c.translate(dx, dy);
        c.fillStyle = A; poly(c, [[0, 16], [12, 2], [8, -12], [-8, -12], [-12, 2]]); c.fillStyle = G; c.fillRect(-6, -4, 4, 3); c.fillRect(2, -4, 4, 3);
        c.fillStyle = '#ffffff'; poly(c, [[-4, 10], [4, 10], [0, 16]]); c.restore();
      }
      break;
    }
    case 'titan': {
      c.fillStyle = B; circ(c, 0, 0, 38); c.fillStyle = A; circ(c, 0, 0, 32);
      c.fillStyle = '#ffe04a'; for (let k = 0; k < 8; k++) { const a = (k / 8) * TAU + time; c.fillRect(Math.cos(a) * 30 - 2, Math.sin(a) * 30 - 2, 4, 4); }
      c.fillStyle = '#3a0a00'; c.fillRect(-16, -10, 10, 7); c.fillRect(6, -10, 10, 7); c.fillRect(-12, 8, 24, 5);
      c.fillStyle = G; c.fillRect(-14, -9, 6, 4); c.fillRect(8, -9, 6, 4);
      for (const s of [-1, 1]) { c.fillStyle = B; circ(c, s * 58, 20, 17); c.fillStyle = A; circ(c, s * 58, 20, 12); }
      break;
    }
    case 'destroyer': {
      c.fillStyle = B; poly(c, [[0, -70], [60, -40], [96, 4], [80, 30], [30, 26], [0, 40], [-30, 26], [-80, 30], [-96, 4], [-60, -40]]);
      c.fillStyle = A; poly(c, [[0, -60], [50, -34], [84, 4], [70, 22], [26, 18], [0, 30], [-26, 18], [-70, 22], [-84, 4], [-50, -34]]);
      for (const s of [-1, 1]) { c.fillStyle = b.ph === 0 ? '#ff5a5a' : '#5a2a2a'; circ(c, s * 76, 16, 12); c.fillStyle = '#20242e'; c.fillRect(s * 76 - 2, 18, 4, 12); }
      const open = b.ph >= 1;
      c.fillStyle = '#14161e'; circ(c, 0, 0, 24);
      c.fillStyle = open ? '#ff3a4a' : '#5a2a30'; circ(c, 0, 0, open ? 14 + Math.sin(time * 10) * 2 : 10);
      c.fillStyle = '#ffffff'; if (open) circ(c, 0, 0, 5);
      if (b.ph === 2) { c.strokeStyle = 'rgba(255,58,74,.6)'; c.lineWidth = 2; c.beginPath(); c.arc(0, 0, 30 + Math.sin(time * 6) * 4, 0, TAU); c.stroke(); }
      break;
    }
  }
  c.restore();
}

// ------------------------------------------------------------------ pixel portraits for the dialogue box (48x48, shown scaled up)
const SKIN = '#f2c9a0';
const PORTRAIT = {
  josh: { hair: '#2a1a10', shirt: '#2f6fe0' }, jasper: { hair: '#5a3a1a', shirt: '#2ec85a', cap: '#d83a3a' },
  jeff: { hair: '#141414', shirt: '#e8452c', glasses: true }, erin: { hair: '#6a3a1a', shirt: '#9a4ad8', long: true },
  mira: { hair: '#c8d0e0', shirt: '#1a3a6a', hat: true, long: true },
};
const portraitCache = {};
export function portrait(who) {
  if (portraitCache[who]) return portraitCache[who];
  const cv = document.createElement('canvas');
  cv.width = cv.height = 48; const c = cv.getContext('2d');
  c.fillStyle = '#10142a'; c.fillRect(0, 0, 48, 48);
  const pp = PORTRAIT[who];
  if (pp) {
    c.fillStyle = pp.shirt; c.fillRect(8, 38, 32, 10);
    if (pp.long) { c.fillStyle = pp.hair; c.fillRect(10, 14, 28, 26); }
    c.fillStyle = SKIN; c.fillRect(13, 13, 22, 24); c.fillRect(11, 20, 26, 12);
    c.fillStyle = pp.hair; c.fillRect(12, 9, 24, 8); c.fillRect(11, 12, 4, 10); c.fillRect(33, 12, 4, 10);
    if (pp.cap) { c.fillStyle = pp.cap; c.fillRect(11, 7, 26, 7); c.fillRect(30, 12, 10, 3); }
    if (pp.hat) { c.fillStyle = '#1a3a6a'; c.fillRect(10, 5, 28, 7); c.fillStyle = '#ffd23a'; c.fillRect(22, 7, 4, 3); }
    c.fillStyle = '#1a1a1a'; c.fillRect(17, 22, 3, 4); c.fillRect(28, 22, 3, 4);
    if (pp.glasses) { c.strokeStyle = '#222'; c.lineWidth = 1; c.strokeRect(15.5, 20.5, 7, 7); c.strokeRect(26.5, 20.5, 7, 7); c.fillStyle = '#222'; c.fillRect(22, 23, 5, 1); }
    c.fillStyle = '#ff9a9a'; c.fillRect(14, 28, 3, 2); c.fillRect(31, 28, 3, 2);
    c.fillStyle = '#a0402a'; c.fillRect(21, 31, 6, 2);
  } else if (who === 'goliath') {
    c.fillStyle = '#5a4a3a'; c.fillRect(6, 8, 36, 34); c.fillStyle = '#9a7a5a'; c.fillRect(9, 11, 30, 28);
    c.fillStyle = '#20202a'; c.fillRect(12, 18, 24, 9); c.fillStyle = '#ffb05a'; c.fillRect(14, 20, 7, 5); c.fillRect(27, 20, 7, 5);
    c.fillStyle = '#5a4a3a'; for (let k = 0; k < 5; k++) c.fillRect(12 + k * 5, 32, 3, 5);
  } else if (who === 'queen') {
    c.fillStyle = '#2a0a3a'; c.fillRect(8, 10, 32, 38); c.fillStyle = '#ff6ad8'; c.fillRect(12, 14, 24, 30);
    c.fillStyle = '#ffe0ff'; c.fillRect(15, 20, 18, 9); c.fillStyle = '#ff2a8a'; c.fillRect(17, 23, 4, 2); c.fillRect(27, 23, 4, 2);
    c.fillStyle = '#ffd23a'; for (let k = 0; k < 5; k++) c.fillRect(12 + k * 6, 6 + (k % 2) * 3, 3, 8);
    c.fillStyle = '#c0306a'; c.fillRect(21, 33, 6, 2);
  } else if (who === 'hydra') {
    c.fillStyle = '#1a4a6a'; c.fillRect(4, 14, 40, 30); c.fillStyle = '#6ae8ff';
    for (const x of [8, 20, 32]) { c.fillRect(x, 10, 8, 20); c.fillStyle = '#c8a0ff'; c.fillRect(x + 1, 16, 2, 2); c.fillRect(x + 5, 16, 2, 2); c.fillStyle = '#6ae8ff'; }
    c.fillStyle = '#ffffff'; c.fillRect(10, 26, 4, 3); c.fillRect(22, 26, 4, 3); c.fillRect(34, 26, 4, 3);
  } else if (who === 'titan') {
    c.fillStyle = '#5a1a0a'; c.fillRect(4, 6, 40, 40); c.fillStyle = '#ff7a2a'; c.fillRect(8, 10, 32, 32);
    c.fillStyle = '#ffe04a'; for (let k = 0; k < 6; k++) c.fillRect(6 + k * 7, 4, 3, 4);
    c.fillStyle = '#3a0a00'; c.fillRect(13, 19, 8, 6); c.fillRect(27, 19, 8, 6); c.fillRect(16, 32, 16, 4);
    c.fillStyle = '#ffe04a'; c.fillRect(15, 20, 4, 3); c.fillRect(29, 20, 4, 3);
  } else if (who === 'null') {
    c.fillStyle = '#05060a'; c.fillRect(0, 0, 48, 48); c.fillStyle = '#2a2e3a'; c.fillRect(8, 6, 32, 40);
    c.fillStyle = '#14161e'; c.fillRect(11, 16, 26, 12); c.fillStyle = '#ff3a4a'; c.fillRect(21, 19, 6, 5);
    c.fillStyle = '#8a94a8'; c.fillRect(8, 6, 32, 4); c.fillRect(22, 30, 4, 14);
  }
  return (portraitCache[who] = cv.toDataURL());
}

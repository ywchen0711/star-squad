// The game itself: player, weapons, skills, enemies, bosses, bullets, pickups. No DOM: render.js draws it, tools/sim.mjs runs it in Node.
import { W, H, PILOT, UPGRADES, ENEMIES, STAGES, CLEAR_BONUS, NOHIT_BONUS } from './data.js?v=1';

const TAU = Math.PI * 2;
const rnd = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const up = (ups, id) => (ups && ups[id]) || 0;
const per = (id) => UPGRADES.find((u) => u.id === id).per;

export class Game {
  // opts: { stage: 1..5, pilot: 'josh'|..., upgrades: {dmg: 2, ...}, items: {bomb: 2, ...} }
  constructor(opts) {
    this.st = STAGES[opts.stage - 1];
    this.pilot = PILOT[opts.pilot];
    const ups = opts.upgrades || {}, it = opts.items || {};
    const pa = this.pilot.passive;
    this.mod = {
      dmg: 1 + per('dmg') * up(ups, 'dmg'),
      rate: 1 + per('rate') * up(ups, 'rate'),
      speed: 150 * this.pilot.speed * (1 + per('engine') * up(ups, 'engine')) * (pa === 'afterburner' ? 1.15 : 1),
      magnet: 44 * (1 + per('magnet') * up(ups, 'magnet')) * (pa === 'afterburner' ? 1.6 : 1),
      charge: 1 + per('charge') * up(ups, 'charge'),
      credit: (pa === 'lucky' ? 1.25 : 1) * (it.booster ? 1.5 : 1),
      luck: pa === 'lucky' ? 0.08 : 0,
      inv: pa === 'armor' ? 1.5 : 1.0,
    };
    const maxHp = this.pilot.hp + up(ups, 'hull') * per('hull') + (pa === 'armor' ? 2 : 0);
    this.p = {
      x: W / 2, y: H - 70, hp: maxHp, maxHp, inv: 2, power: it.power ? 3 : 1, energy: it.charge ? 100 : 0, skill: 0,
      bombs: it.bomb || 0, shield: it.shield ? 3 : 0, repair: !!it.repair, revive: pa === 'phoenix', fire: 0, fire2: 0, fire3: 0, drones: 0, storm: 0, wob: 0,
    };
    this.t = 0; this.idx = 0; this.phase = 'play'; this.phaseT = 0;
    this.pb = []; this.eb = []; this.en = []; this.pk = []; this.fx = []; this.beams = []; this.ev = [];
    this.boss = null; this.credits = 0; this.score = 0; this.hits = 0; this.kills = 0; this.beam = null;
    this.warp = 1; this.result = null; this.god = !!opts.god;
  }
  emit(type, o = {}) { this.ev.push({ type, ...o }); }

  // ------------------------------------------------------------------ main step
  // input: { ax, ay (-1..1 keys), dx, dy (drag pixels this frame), focus, skill, bomb }
  update(dt, input = {}) {
    if (this.phase === 'dead' || this.phase === 'done') return;
    this.t += dt; this.phaseT += dt;
    const p = this.p;
    this.warp = p.skill > 0 && this.pilot.active === 'warp' ? 0.35 : 1;
    const edt = dt * this.warp;               // enemies and their bullets run slower in Time Warp
    this.player(dt, input);
    if (this.phase === 'play') this.timeline();
    if (this.phase === 'bossWarn' && this.phaseT > 2.6) this.startBoss();
    for (const e of this.en) this.enemy(e, edt);
    if (this.boss) this.bossStep(edt);
    this.bullets(dt, edt);
    this.pickups(dt);
    this.collide(dt);
    this.en = this.en.filter((e) => !e.dead && e.y < H + 40 && e.y > -120 && e.x > -80 && e.x < W + 80);
    for (const f of this.fx) { f.x += f.vx * dt; f.y += f.vy * dt; f.life -= dt; }
    this.fx = this.fx.filter((f) => f.life > 0);
    if (this.phase === 'bossDown') {
      if (Math.random() < 0.5) this.boom(this.boss.x + rnd(-50, 50), this.boss.y + rnd(-30, 30), 10);
      if (this.phaseT > 2.6) this.finish();
    }
  }

  // ------------------------------------------------------------------ player
  player(dt, inp) {
    const p = this.p, pil = this.pilot;
    const sp = this.mod.speed * (inp.focus ? 0.5 : 1) * (p.skill > 0 && pil.active === 'dash' ? 1.6 : 1);
    let ax = inp.ax || 0, ay = inp.ay || 0; const m = Math.hypot(ax, ay); if (m > 1) { ax /= m; ay /= m; }
    p.x = clamp(p.x + ax * sp * dt + (inp.dx || 0), 10, W - 10);
    p.y = clamp(p.y + ay * sp * dt + (inp.dy || 0), 40, H - 16);
    p.inv = Math.max(0, p.inv - dt);
    p.energy = Math.min(100, p.energy + 1.5 * this.mod.charge * dt);
    if (p.skill > 0) { p.skill -= dt; if (p.skill <= 0) { p.skill = 0; this.emit('skillEnd'); } }
    if (inp.skill && p.energy >= 100 && p.skill <= 0 && this.phase !== 'bossDown') this.useSkill();
    if (inp.bomb && p.bombs > 0 && this.phase !== 'bossDown') this.useBomb();
    if (p.storm > 0) {                                   // Missile Storm in progress
      p.stormT = (p.stormT || 0) - dt;
      while (p.stormT <= 0 && p.storm > 0) { p.storm--; p.stormT += 0.05; this.missile(p.x + rnd(-14, 14), p.y - 4, rnd(-2.6, -0.5), 20, 260); }
    }
    if (this.phase !== 'bossDown') this.shoot(dt);
  }
  dmg(base) { return base * this.mod.dmg * (this.warp < 1 ? 1.25 : 1); }
  shoot(dt) {
    const p = this.p, L = p.power, rate = this.mod.rate * (p.skill > 0 && this.pilot.active === 'dash' ? 2 : 1);
    const bullet = (x, y, ang, spd, dmg, o = {}) => this.pb.push({ x, y, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd, dmg: this.dmg(dmg), r: o.r || 3, kind: o.kind || 'shot', ...o });
    const upA = -Math.PI / 2;
    p.fire -= dt; p.fire2 -= dt; p.fire3 -= dt;
    switch (this.pilot.weapon) {
      case 'spread': {
        if (p.fire <= 0) {
          p.fire += 0.1 / rate;
          // a tight core that hits big targets from far away, plus wide wing shots for crowds at higher levels
          const sets = [[-0.06, 0, 0.06], [-0.1, -0.035, 0.035, 0.1], [-0.12, -0.06, 0, 0.06, 0.12], [-0.34, -0.06, -0.02, 0.02, 0.06, 0.34], [-0.4, -0.24, -0.05, 0, 0.05, 0.24, 0.4]][L - 1];
          for (const a of sets) bullet(p.x + a * 40, p.y - 8, upA + a, 440, 8);
        }
        break;
      }
      case 'homing': {
        if (p.fire <= 0) { p.fire += 0.1 / rate; for (const dx of [-5, 5]) bullet(p.x + dx, p.y - 8, upA, 440, 6); }
        if (p.fire2 <= 0) {
          p.fire2 += (L >= 5 ? 0.34 : 0.45) / rate;
          const n = Math.min(L, 4);
          for (let i = 0; i < n; i++) this.missile(p.x + (i % 2 ? 9 : -9), p.y, upA + (i % 2 ? 0.7 : -0.7) * (1 + (i >> 1) * 0.5), 15, 220);
        }
        break;
      }
      case 'laser': {
        // a beam straight up that stops at the first thing it hits
        const w = 4 + 2 * L, dps = this.dmg(105 + 38 * L) * rate;
        let best = null, by = -40;
        const consider = (o, x, y, r) => { if (Math.abs(x - p.x) < r + w / 2 && y < p.y && y > by) { by = y; best = o; } };
        for (const e of this.en) if (!e.dead && !e.decoy) consider(e, e.x, e.y, e.r);
        if (this.boss && this.boss.vulnerable) for (const pt of this.bossParts()) consider(this.boss, pt.x, pt.y, pt.r);
        this.beam = { x: p.x, y0: p.y - 10, y1: best ? by : -10, w };
        if (best) { if (best === this.boss) this.hurtBoss(dps * dt, p.x, by); else this.hurt(best, dps * dt); }
        if (L >= 3 && p.fire <= 0) { p.fire += 0.16 / rate; for (const dx of [-11, 11]) bullet(p.x + dx, p.y - 4, upA + dx * 0.012, 420, 5); }
        break;
      }
      case 'wave': {
        if (p.fire <= 0) { p.fire += 0.1 / rate; for (const dx of [-5, 5]) bullet(p.x + dx, p.y - 8, upA, 440, 7); }
        p.drones = [1, 2, 2, 3, 4][L - 1];
        if (p.fire2 <= 0) {
          p.fire2 += 0.15 / rate;
          for (const d of this.dronePos()) bullet(d.x, d.y - 4, Math.atan2(-260, p.x - d.x), 400, 7, { kind: 'drone' });   // drones converge ahead of Erin
        }
        if (L >= 3 && p.fire3 <= 0) {
          p.fire3 += 0.22 / rate;
          for (const s of [-1, 1]) bullet(p.x, p.y - 8, upA, 320, 11, { kind: 'wave', r: 4, wave: s, x0: p.x, t: 0 });
        }
        break;
      }
    }
  }
  dronePos() {
    const p = this.p, n = p.drones, out = [];
    const slots = [[-22, 8], [22, 8], [-34, 18], [34, 18]];
    for (let i = 0; i < n; i++) out.push({ x: p.x + slots[i][0], y: p.y + slots[i][1] + Math.sin(this.t * 4 + i) * 2 });
    return out;
  }
  missile(x, y, ang, dmg, spd) { this.pb.push({ x, y, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd, dmg: this.dmg(dmg), r: 3, kind: 'missile', homing: true, spd }); }
  useSkill() {
    const p = this.p, a = this.pilot.active;
    p.energy = 0;
    if (a === 'dash') { p.skill = 4; }
    if (a === 'storm') { p.storm = 30; p.stormT = 0; p.skill = 1.6; }
    if (a === 'mirror') { p.skill = 5; }
    if (a === 'warp') { p.skill = 6; }
    this.emit('skill', { id: a });
  }
  useBomb() {
    const p = this.p;
    p.bombs--; p.inv = Math.max(p.inv, 2);
    for (const b of this.eb) this.spark(b.x, b.y, '#ffffff', 1);
    this.eb = []; this.beams = [];
    for (const e of this.en) if (!e.dead && !e.decoy) this.hurt(e, 500 * this.st.scale);
    if (this.boss && this.boss.vulnerable) this.hurtBoss(this.boss.maxHp * 0.05, this.boss.x, this.boss.y);
    this.emit('bomb');
  }
  hitPlayer() {
    const p = this.p;
    if (p.inv > 0 || (p.skill > 0 && this.pilot.active === 'dash') || this.phase === 'bossDown') return;
    if (this.god) { this.hits++; p.inv = this.mod.inv; return; }   // simulator: count the hit only
    if (p.shield > 0) { p.shield--; p.inv = 0.8; this.emit('shield'); return; }
    p.hp--; this.hits++;
    p.power = Math.max(1, p.power - 1);
    p.inv = this.mod.inv;
    this.eb = this.eb.filter((b) => Math.hypot(b.x - p.x, b.y - p.y) > 70);
    this.emit('hit');
    this.boom(p.x, p.y, 8, this.pilot.color);
    if (p.hp === 1 && p.repair) { p.repair = false; p.hp += 2; this.emit('repair'); }
    if (p.hp <= 0) {
      if (p.revive) { p.revive = false; p.hp = 3; p.inv = 3; this.eb = []; this.beams = []; this.emit('revive'); return; }
      this.phase = 'dead'; this.boom(p.x, p.y, 30, this.pilot.color); this.emit('dead');
    }
  }

  // ------------------------------------------------------------------ waves
  timeline() {
    const tl = this.st.timeline;
    while (this.idx < tl.length && tl[this.idx][0] <= this.t) {
      const [, form, type, o = {}] = tl[this.idx++];
      if (form === 'boss') { this.bossPending = true; continue; }
      this.formation(form, type, o);
    }
    if (this.bossPending && !this.en.some((e) => !e.dead && e.type !== 'pebble') ) { this.bossPending = false; this.phase = 'bossWarn'; this.phaseT = 0; this.emit('bossWarn'); }
    if (this.bossPending && this.t > (tl[tl.length - 1][0] + 12)) { this.bossPending = false; this.phase = 'bossWarn'; this.phaseT = 0; this.emit('bossWarn'); }
  }
  spawn(type, x, y, path, o = {}) {
    const d = ENEMIES[type];
    const e = { type, x, y, hp: d.hp * this.st.scale, r: d.r, t: 0, path, fire: rnd(0.6, 1.4), ...o };
    e.maxHp = e.hp; e.x0 = x;
    this.en.push(e);
    return e;
  }
  formation(form, type, o) {
    const n = o.n || 1;
    switch (form) {
      case 'line': for (let i = 0; i < n; i++) this.spawn(type, (W * (i + 1)) / (n + 1), -20 - (i % 2) * 14, o.sine ? 'sine' : 'down', { phase: i }); break;
      case 'column': for (let i = 0; i < n; i++) this.spawn(type, o.x * W, -20 - i * 34, 'down', { speed: 130 }); break;
      case 'v': for (let i = 0; i < n; i++) { const k = i - (n - 1) / 2; this.spawn(type, W / 2 + k * 26, -20 - Math.abs(k) * 22, 'down'); } break;
      case 'sweep': for (let i = 0; i < n; i++) this.spawn(type, o.side === 'L' ? -16 : W + 16, -20, 'swoop', { side: o.side, delay: i * 0.32, t: -i * 0.32 }); break;
      case 'drop': for (const x of o.xs) this.spawn(type, x * W, -24, 'stop', { ty: rnd(90, 170), hold: type === 'spinner' ? 5 : 4.5 }); break;
      case 'single': this.spawn(type, o.x * W, -30, 'down', { speed: 38 }); break;
      case 'rocks': for (let i = 0; i < n; i++) this.spawn(type, rnd(20, W - 20), -20 - rnd(0, 160), 'drift', { vx: rnd(-25, 25), vy: rnd(45, 80), spin: rnd(-2, 2) }); break;
      case 'mines': for (let i = 0; i < n; i++) this.spawn(type, rnd(20, W - 20), -20 - rnd(0, 200), 'drift', { vx: rnd(-12, 12), vy: rnd(35, 55) }); break;
      case 'elite': this.spawn('elite', W / 2, -40, 'elite', { ty: 120 }); this.emit('elite'); break;
    }
  }
  enemy(e, dt) {
    if (e.dead) return;
    e.t += dt;
    if (e.t < 0) { e.y = -40; return; }
    const shot = this.st.shot, st = this.st.id;
    switch (e.path) {
      case 'down': e.y += (e.speed || 80) * dt; break;
      case 'sine': e.y += 70 * dt; e.x = e.x0 + Math.sin(e.t * 2.2 + (e.phase || 0)) * 34; break;
      case 'swoop': {
        const u = e.t / 3.4, L = e.side === 'L';
        const P = [[L ? -16 : W + 16, -20], [L ? 40 : W - 40, H * 0.62], [L ? W - 40 : 40, H * 0.62], [L ? W + 20 : -20, -30]];
        const q = 1 - u;
        e.x = q * q * q * P[0][0] + 3 * q * q * u * P[1][0] + 3 * q * u * u * P[2][0] + u * u * u * P[3][0];
        e.y = q * q * q * P[0][1] + 3 * q * q * u * P[1][1] + 3 * q * u * u * P[2][1] + u * u * u * P[3][1];
        if (u >= 1) e.dead = true;
        break;
      }
      case 'stop': {
        if (e.t < 1.3) e.y = -24 + (e.ty + 24) * Math.sin((e.t / 1.3) * Math.PI / 2);
        else if (e.t > 1.3 + e.hold) e.y -= 90 * dt;
        break;
      }
      case 'drift': e.x += e.vx * dt; e.y += e.vy * dt; e.rot = (e.rot || 0) + (e.spin || 0) * dt; break;
      case 'elite': {
        if (e.t < 2) e.y = -40 + (e.ty + 40) * Math.sin((e.t / 2) * Math.PI / 2);
        else if (e.t < 18) e.x = W / 2 + Math.sin((e.t - 2) * 0.8) * 90;
        else e.y -= 60 * dt;
        break;
      }
    }
    // firing
    e.fire -= dt;
    const aim = this.aim(e.x, e.y);
    switch (e.type) {
      case 'drone': if (st >= 2 && e.fire <= 0 && !e.fired && e.y > 30) { e.fired = true; if (Math.random() < 0.35) this.shot(e.x, e.y, aim, 110 * shot); } break;
      case 'dart': if (st >= 4 && e.fire <= 0 && !e.fired && e.y > 40) { e.fired = true; if (Math.random() < 0.4) this.shot(e.x, e.y, aim, 120 * shot); } break;
      case 'gunner': if (e.t > 1.3 && e.t < 1.3 + e.hold && e.fire <= 0) { e.fire = 1.3; this.fan(e.x, e.y, aim, 3, 0.3, 115 * shot); } break;
      case 'spinner': if (e.t > 1.3 && e.t < 1.3 + e.hold && e.fire <= 0) { e.fire = 0.22; e.rot = (e.rot || 0) + 0.45; for (const k of [0, Math.PI]) this.shot(e.x, e.y, e.rot + k, 85 * shot, { color: '#ffd23a' }); } break;
      case 'tank': if (e.y > 20 && e.fire <= 0) { e.fire = 1.8; this.fan(e.x, e.y + 10, aim, 5, 0.9, 100 * shot, { r: 4 }); } break;
      case 'elite':
        if (e.t > 2 && e.t < 18) {
          if (e.fire <= 0) { e.fire = 1.15; this.fan(e.x, e.y + 10, aim, 5, 0.8, 105 * shot); }
          e.fire2 = (e.fire2 ?? 2) - dt;
          if (e.fire2 <= 0) { e.fire2 = 2.3; this.ring(e.x, e.y, 12 + st * 2, 80 * shot, rnd(0, 1), { color: '#ff7aff' }); }
        }
        break;
      case 'clone':
        if (e.fire <= 0) { e.fire = 1.5; this.fan(e.x, e.y, aim, 3, 0.4, 115 * shot, { color: '#ff8ae8' }); }
        break;
    }
  }

  // ------------------------------------------------------------------ enemy bullet helpers
  aim(x, y) { return Math.atan2(this.p.y - y, this.p.x - x); }
  shot(x, y, ang, spd, o = {}) { this.eb.push({ x, y, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd, r: o.r || 3, t: 0, color: o.color || '#ff5a5a', ...o }); }
  fan(x, y, ang, n, spread, spd, o) { for (let i = 0; i < n; i++) this.shot(x, y, ang + (n > 1 ? (i / (n - 1) - 0.5) * spread : 0), spd, o); }
  ring(x, y, n, spd, off, o) { for (let i = 0; i < n; i++) this.shot(x, y, off + (i / n) * TAU, spd, o); }
  laser(x, y, ang, o = {}) { const b = { x, y, ang, w: o.w || 14, warn: o.warn ?? 1, on: o.on ?? 1.2, len: o.len || 900, color: o.color || '#ff3a6a', spin: o.spin || 0, follow: o.follow || null }; this.beams.push(b); return b; }

  bullets(dt, edt) {
    const p = this.p;
    for (const b of this.pb) {
      if (b.homing) {
        const tg = this.nearestTarget(b.x, b.y);
        if (tg) {
          const want = Math.atan2(tg.y - b.y, tg.x - b.x), cur = Math.atan2(b.vy, b.vx);
          let d = want - cur; d = Math.atan2(Math.sin(d), Math.cos(d));
          const na = cur + clamp(d, -6 * dt, 6 * dt);
          b.spd = Math.min(420, b.spd + 260 * dt);
          b.vx = Math.cos(na) * b.spd; b.vy = Math.sin(na) * b.spd;
        }
      }
      if (b.wave) { b.t += dt; b.x = b.x0 + Math.sin(b.t * 14) * 16 * b.wave; b.y += b.vy * dt; }
      else { b.x += b.vx * dt; b.y += b.vy * dt; }
    }
    this.pb = this.pb.filter((b) => !b.dead && b.y > -20 && b.y < H + 20 && b.x > -20 && b.x < W + 20);
    const mirror = p.skill > 0 && this.pilot.active === 'mirror';
    const add = [];
    for (const b of this.eb) {
      b.t += edt;
      if (b.home && b.t < b.home) {
        const want = this.aim(b.x, b.y), cur = Math.atan2(b.vy, b.vx), s = Math.hypot(b.vx, b.vy);
        let d = want - cur; d = Math.atan2(Math.sin(d), Math.cos(d));
        const na = cur + clamp(d, -1.8 * edt, 1.8 * edt);
        b.vx = Math.cos(na) * s; b.vy = Math.sin(na) * s;
      }
      if (b.acc) { b.vx *= 1 + b.acc * edt; b.vy *= 1 + b.acc * edt; }
      b.x += b.vx * edt; b.y += b.vy * edt;
      if (b.bounce && (b.x < 4 || b.x > W - 4)) { b.vx = -b.vx; b.bounce--; b.x = clamp(b.x, 4, W - 4); }
      if (b.split && b.t >= b.split.at) { b.dead = true; this.ring(b.x, b.y, b.split.n, b.split.spd, rnd(0, 1), { color: b.split.color || b.color }); }
      if (mirror && Math.hypot(b.x - p.x, b.y - p.y) < 36) {        // Jeff's Mirror Shield sends bullets back as his own
        b.dead = true; add.push({ x: b.x, y: b.y, vx: -b.vx * 1.6, vy: -Math.abs(b.vy) * 1.6 - 60, dmg: this.dmg(12), r: 3, kind: 'reflect' });
      }
    }
    this.pb.push(...add);
    this.eb = this.eb.filter((b) => !b.dead && b.y > -30 && b.y < H + 30 && b.x > -30 && b.x < W + 30);
    for (const bm of this.beams) {
      if (bm.follow) bm.follow(bm, edt);
      bm.ang += bm.spin * edt;
      if (bm.warn > 0) bm.warn -= edt; else bm.on -= edt;
    }
    this.beams = this.beams.filter((bm) => bm.on > 0);
  }
  nearestTarget(x, y) {
    let best = null, bd = 1e9;
    for (const e of this.en) { if (e.dead || e.decoy || e.t < 0) continue; const d = Math.hypot(e.x - x, e.y - y); if (d < bd) { bd = d; best = e; } }
    if (this.boss && this.boss.vulnerable) { const d = Math.hypot(this.boss.x - x, this.boss.y - y); if (d < bd) best = this.boss; }
    return best;
  }

  // ------------------------------------------------------------------ collisions, damage, drops
  collide(dt) {
    const p = this.p;
    for (const b of this.pb) {
      if (b.dead) continue;
      for (const e of this.en) {
        if (e.dead || e.t < 0) continue;
        if ((b.x - e.x) ** 2 + (b.y - e.y) ** 2 < (b.r + e.r) ** 2) { b.dead = true; if (!e.decoy) this.hurt(e, b.dmg); else this.spark(b.x, b.y, '#ff8ae8', 2); break; }
      }
      if (!b.dead && this.boss && this.boss.vulnerable) {
        for (const pt of this.bossParts()) if ((b.x - pt.x) ** 2 + (b.y - pt.y) ** 2 < (b.r + pt.r) ** 2) { b.dead = true; this.hurtBoss(b.dmg, b.x, b.y); break; }
      }
    }
    // the player: hitbox radius 3, enemies' bodies radius 6
    const dash = p.skill > 0 && this.pilot.active === 'dash';
    for (const b of this.eb) if ((b.x - p.x) ** 2 + (b.y - p.y) ** 2 < (b.r + 2.5) ** 2) { b.dead = true; this.hitPlayer(); break; }
    for (const e of this.en) {
      if (e.dead || e.t < 0) continue;
      if ((e.x - p.x) ** 2 + (e.y - p.y) ** 2 < (e.r + 5) ** 2) {
        if (dash) this.hurt(e, 160 * dt * 10);
        else if (!e.decoy) { this.hitPlayer(); this.hurt(e, 30); }
      }
    }
    if (this.boss && this.boss.vulnerable) for (const pt of this.bossParts()) if ((pt.x - p.x) ** 2 + (pt.y - p.y) ** 2 < (pt.r + 4) ** 2) { if (dash) this.hurtBoss(160 * dt, p.x, p.y); else this.hitPlayer(); }
    for (const bm of this.beams) {
      if (bm.warn > 0) continue;
      const dx = Math.cos(bm.ang), dy = Math.sin(bm.ang), rx = p.x - bm.x, ry = p.y - bm.y;
      const along = rx * dx + ry * dy, perp = Math.abs(rx * dy - ry * dx);
      if (along > 0 && along < bm.len && perp < bm.w / 2 + 1.5) this.hitPlayer();
    }
  }
  hurt(e, d) {
    if (e.dead) return;
    e.hp -= d; e.flash = 0.06;
    if (e.hp <= 0) this.kill(e);
  }
  kill(e) {
    e.dead = true;
    const d = ENEMIES[e.type] || { coins: 0, energy: 0, score: 0 };
    this.kills++; this.score += d.score;
    this.p.energy = Math.min(100, this.p.energy + d.energy * this.mod.charge);
    this.boom(e.x, e.y, e.type === 'elite' ? 40 : e.type === 'tank' ? 18 : 8);
    this.coins(e.x, e.y, d.coins);
    const dropP = (d.drop || 0.04) + this.mod.luck;
    if (Math.random() < dropP) this.pk.push({ x: e.x, y: e.y, vx: rnd(-20, 20), vy: 40, kind: 'P' });
    if (e.type === 'elite') { this.pk.push({ x: e.x + 10, y: e.y, vx: 10, vy: 40, kind: 'H' }); this.emit('eliteDown'); }
    else if (Math.random() < 0.012 + this.st.id * 0.003) this.pk.push({ x: e.x, y: e.y, vx: 0, vy: 40, kind: 'H' });
    if (e.type === 'rock') for (const s of [-1, 1]) this.spawn('pebble', e.x + s * 6, e.y, 'drift', { vx: s * rnd(30, 55), vy: rnd(50, 80), spin: rnd(-3, 3) });
    if (e.type === 'mine' && this.st.id >= 2) this.ring(e.x, e.y, 8, 75 * this.st.shot, rnd(0, 1), { color: '#ffa03a' });
    this.emit('kill', { big: e.type === 'tank' || e.type === 'elite' });
  }
  coins(x, y, n) {
    let left = n;
    while (left > 0) {
      const v = left >= 25 ? 25 : left >= 5 ? 5 : 1;
      left -= v;
      this.pk.push({ x: x + rnd(-8, 8), y: y + rnd(-8, 8), vx: rnd(-50, 50), vy: rnd(-70, -10), kind: 'C', v });
    }
  }
  pickups(dt) {
    const p = this.p, all = this.phase === 'bossDown' || this.phase === 'clear';
    for (const k of this.pk) {
      const dx = p.x - k.x, dy = p.y - k.y, d = Math.hypot(dx, dy);
      if (all || d < this.mod.magnet || k.pull) { k.pull = true; const s = 330; k.vx = (dx / (d || 1)) * s; k.vy = (dy / (d || 1)) * s; }
      else { k.vy = Math.min(70, k.vy + 120 * dt); k.vx *= 0.97; }
      k.x += k.vx * dt; k.y += k.vy * dt;
      if (d < 12) {
        k.dead = true;
        if (k.kind === 'C') { const v = k.v * this.mod.credit; this.credits += v; this.emit('coin', { v }); }
        if (k.kind === 'P') { if (p.power < 5) p.power++; else this.score += 1000; this.emit('power'); }
        if (k.kind === 'H') { p.hp = Math.min(p.maxHp, p.hp + 1); this.emit('heart'); }
      }
    }
    this.pk = this.pk.filter((k) => !k.dead && k.y < H + 20);
  }
  boom(x, y, n, color) {
    for (let i = 0; i < n; i++) {
      const a = rnd(0, TAU), s = rnd(30, 160);
      this.fx.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rnd(0.25, 0.7), max: 0.7, color: color || ['#fff3a0', '#ffb03a', '#ff5a2a'][i % 3], size: rnd(1.5, 3.5) });
    }
    this.emit('boom', { n });
  }
  spark(x, y, color, n = 3) { for (let i = 0; i < n; i++) this.fx.push({ x, y, vx: rnd(-60, 60), vy: rnd(-60, 60), life: 0.25, max: 0.25, color, size: 1.5 }); }

  // ------------------------------------------------------------------ bosses
  startBoss() {
    const id = this.st.boss, B = BOSSES[id];
    this.phase = 'boss'; this.phaseT = 0;
    this.boss = { id, x: W / 2, y: -80, hp: this.st.bossHp, maxHp: this.st.bossHp, t: 0, ph: 0, vulnerable: false, timers: {}, alpha: 1, ...B.init() };
    this.emit('bossStart', { id });
  }
  bossParts() { const b = this.boss; return BOSSES[b.id].parts(b).map(([dx, dy, r]) => ({ x: b.x + dx, y: b.y + dy, r })); }
  hurtBoss(d, x, y) {
    const b = this.boss;
    if (!b || !b.vulnerable || this.phase !== 'boss') return;
    b.hp -= d; b.flash = 0.05;
    this.p.energy = Math.min(100, this.p.energy + (d / 260) * this.mod.charge);
    if (Math.random() < 0.15) this.spark(x, y, '#ffffff', 1);
    const ratio = b.hp / b.maxHp, th = BOSSES[b.id].phases;
    while (b.ph < th.length && ratio < th[b.ph]) { b.ph++; b.timers = {}; this.eb = this.eb.filter(() => Math.random() < 0.5); this.emit('bossPhase', { ph: b.ph }); }
    if (b.hp <= 0) {
      b.hp = 0; b.vulnerable = false;
      this.phase = 'bossDown'; this.phaseT = 0; this.eb = []; this.beams = [];
      for (const e of this.en) if (!e.dead) { e.dead = true; this.boom(e.x, e.y, 6); }
      this.coins(b.x, b.y, 60 + this.st.id * 30);
      this.score += 20000 * this.st.id;
      this.emit('bossDown', { id: b.id });
    }
  }
  bossStep(dt) {
    const b = this.boss;
    b.t += dt; b.flash = Math.max(0, (b.flash || 0) - dt);
    if (this.phase === 'bossDown') return;
    if (!b.vulnerable) {                          // entrance
      b.y = -80 + (110 + 80) * Math.min(1, b.t / 2.4);
      if (b.t >= 2.4) { b.vulnerable = true; b.t = 0; }
      return;
    }
    const tm = b.timers;
    const every = (k, s) => { tm[k] = (tm[k] ?? s * 0.5) - dt; if (tm[k] <= 0) { tm[k] += s; return true; } return false; };
    BOSSES[b.id].step(this, b, dt, every);
  }

  finish() {
    const p = this.p, st = this.st.id;
    // sweep up every coin still on screen
    for (const k of this.pk) if (k.kind === 'C') this.credits += k.v * this.mod.credit;
    this.pk = [];
    const clear = CLEAR_BONUS(st), nohit = this.hits === 0 ? NOHIT_BONUS : 0;
    this.result = { credits: Math.round(this.credits), clear, nohit, total: Math.round(this.credits) + clear + nohit, score: this.score, hits: this.hits, kills: this.kills, time: this.t, hp: p.hp };
    this.phase = 'done';
    this.emit('clear', this.result);
  }
}

// ------------------------------------------------------------------ the five bosses
// phases: HP ratios where the next phase starts. parts: hit circles [dx, dy, r].
export const BOSSES = {
  goliath: {
    phases: [0.55],
    init: () => ({}),
    parts: (b) => [[0, 0, 34], [-46, 16, 15], [46, 16, 15]],
    step(g, b, dt, every) {
      b.x = W / 2 + Math.sin(b.t * 0.5) * 70;
      const sh = g.st.shot;
      if (b.ph === 0) {
        if (every('fan', 1.6)) g.fan(b.x, b.y + 20, g.aim(b.x, b.y), 5, 0.55, 110 * sh);
        if (every('rock', 3.0)) for (const s of [-1, 1]) g.shot(b.x + s * 46, b.y + 24, g.aim(b.x + s * 46, b.y) + s * 0.2, 70 * sh, { r: 8, kind: 'rock', color: '#b08a5a', split: { at: 1.3, n: 8, spd: 90 * sh, color: '#d8b07a' } });
      } else {
        if (every('beam', 5.2)) { const side = (b.drill = -(b.drill || 1)); const bm = g.laser(b.x + side * 46, b.y + 28, Math.PI / 2, { w: 18, warn: 1.1, on: 1.3, color: '#ffb03a' }); bm.follow = (m) => { m.x = b.x + side * 46; m.y = b.y + 28; }; }
        if (every('ring', 1.6)) { b.off = (b.off || 0) + 0.2; g.ring(b.x, b.y, 14, 85 * sh, b.off, { color: '#ffd23a' }); }
        if (every('fan', 1.3)) g.fan(b.x, b.y + 20, g.aim(b.x, b.y), 3, 0.3, 125 * sh);
      }
    },
  },
  queen: {
    phases: [0.66, 0.33],
    init: () => ({ tp: 4.5 }),
    parts: (b) => (b.alpha > 0.5 ? [[0, 0, 26]] : []),
    step(g, b, dt, every) {
      const sh = g.st.shot;
      // teleport: fade out, jump, fade in (the clones jump too)
      b.tp -= dt;
      if (b.tp < 0.4 && b.tp > 0) b.alpha = b.tp / 0.4;
      if (b.tp <= 0) {
        b.tp = 4.5; b.x = rnd(60, W - 60); b.y = rnd(90, 150); b.alpha = 0.01;
        if (b.ph >= 1) { for (const e of g.en) if (e.type === 'clone') e.dead = true; for (const s of [-1, 1]) g.spawn('clone', clamp(W - b.x + s * 40, 30, W - 30), rnd(80, 160), 'still', { decoy: true, r: 18 }).t = 0; }
      }
      if (b.alpha < 1 && b.tp > 0.4) b.alpha = Math.min(1, b.alpha + dt * 2.5);
      if (b.ph === 0 && every('spiral', 0.09)) { b.a = (b.a || 0) + 0.23; for (const k of [0, Math.PI]) g.shot(b.x, b.y, b.a + k, 95 * sh, { color: '#ff6ad8' }); }
      if (b.ph === 1 && every('spiral', 0.13)) { b.a = (b.a || 0) - 0.27; for (const k of [0, TAU / 3, (2 * TAU) / 3]) g.shot(b.x, b.y, b.a + k, 90 * sh, { color: '#c86aff' }); }
      if (b.ph === 2) {
        if (every('flower', 0.8)) { b.a = (b.a || 0) + 0.17; g.ring(b.x, b.y, 18, 80 * sh, b.a * (b.flip = -(b.flip || 1)), { color: '#ff6ad8' }); }
        if (every('fan', 1.6)) g.fan(b.x, b.y, g.aim(b.x, b.y), 5, 0.6, 130 * sh, { color: '#ffffff' });
      }
    },
  },
  hydra: {
    phases: [0.5],
    init: () => ({}),
    parts: (b) => [[0, -12, 26], [-62, 14, 16], [0, 18, 16], [62, 14, 16]],
    step(g, b, dt, every) {
      const sh = g.st.shot;
      b.x = W / 2 + Math.sin(b.t * 0.35) * 30;
      if (b.ph === 0) {
        if (every('sweep', 5.2)) for (const s of [-1, 1]) {
          const bm = g.laser(b.x + s * 62, b.y + 22, Math.PI / 2 + s * 0.65, { w: 12, warn: 0.9, on: 2.4, color: '#7ae8ff', spin: -s * 0.55 });
          bm.follow = (m) => { m.x = b.x + s * 62; m.y = b.y + 22; };
        }
        if (every('shard', 1.25)) g.fan(b.x, b.y + 26, g.aim(b.x, b.y), 3, 0.5, 120 * sh, { r: 5, color: '#c8a0ff', bounce: 1 });
      } else {
        if (every('split', 0.9)) { b.head = ((b.head || 0) + 1) % 3; const hx = b.x + [-62, 0, 62][b.head]; g.shot(hx, b.y + 20, g.aim(hx, b.y), 110 * sh, { r: 6, color: '#7ae8ff', split: { at: 0.75, n: 6, spd: 85 * sh, color: '#c8f4ff' } }); }
        if (every('sweep', 6.5)) { const s = (b.side = -(b.side || 1)); const bm = g.laser(b.x, b.y + 26, Math.PI / 2 + s * 0.9, { w: 14, warn: 1.0, on: 3.0, color: '#c8a0ff', spin: -s * 0.6 }); bm.follow = (m) => { m.x = b.x; m.y = b.y + 26; }; }
      }
    },
  },
  titan: {
    phases: [0.66, 0.33],
    init: () => ({}),
    parts: (b) => [[0, 0, 36], [-58, 20, 16], [58, 20, 16]],
    step(g, b, dt, every) {
      const sh = g.st.shot;
      b.x = W / 2 + Math.sin(b.t * 0.4) * 50;
      const wall = (spd) => { const gap = Math.floor(rnd(2, 15)); for (let i = 0; i < 18; i++) if (Math.abs(i - gap) > 1) g.shot(8 + i * 16, b.y + 40, Math.PI / 2, spd * sh, { r: 4, color: '#ff8a2a' }); };
      const meteors = () => { const xs = [g.p.x, rnd(20, W - 20), rnd(20, W - 20), rnd(20, W - 20)]; xs.forEach((x, i) => g.laser(x, -10, Math.PI / 2, { w: 20, warn: 0.9 + i * 0.25, on: 0.3, color: '#ffe04a' })); };
      if (b.ph === 0) { if (every('wall', 2.4)) wall(75); if (every('fire', 1.1)) g.shot(b.x, b.y + 30, g.aim(b.x, b.y), 130 * sh, { r: 6, color: '#ffd23a' }); }
      if (b.ph === 1) { if (every('met', 3.0)) meteors(); if (every('wall', 3.4)) wall(70); }
      if (b.ph === 2) {
        if (every('flare', 1.15)) { b.a = (b.a || 0) + 0.11; g.ring(b.x, b.y, 28, 82 * sh, b.a, { color: '#ffb03a' }); }
        if (every('fan', 1.4)) g.fan(b.x, b.y, g.aim(b.x, b.y), 3, 0.35, 135 * sh, { r: 5, color: '#ffffff' });
        if (every('met', 4.2)) meteors();
      }
    },
  },
  destroyer: {
    phases: [0.66, 0.33],
    init: () => ({}),
    parts: (b) => [[0, 0, 26], [-76, 16, 17], [76, 16, 17], [0, -34, 30]],
    step(g, b, dt, every) {
      const sh = g.st.shot;
      b.x = W / 2 + Math.sin(b.t * 0.3) * 30;
      if (b.ph === 0) {
        if (every('tur', 0.9)) { const s = (b.side = -(b.side || 1)); const tx = b.x + s * 76; g.fan(tx, b.y + 20, g.aim(tx, b.y + 20), 3, 0.18, 140 * sh, { color: '#ff5a5a' }); }
        if (every('fan', 2.2)) g.fan(b.x, b.y + 20, Math.PI / 2, 7, 1.1, 95 * sh, { r: 4, color: '#ffd23a' });
      }
      if (b.ph === 1) {
        if (every('cross', 7)) { const s = (b.side = -(b.side || 1)); for (let k = 0; k < 4; k++) { const bm = g.laser(b.x, b.y, Math.PI / 4 + (k * Math.PI) / 2, { w: 12, warn: 1.2, on: 4, color: '#ff3a4a', spin: s * 0.35 }); bm.follow = (m) => { m.x = b.x; m.y = b.y; }; } }
        if (every('spiral', 0.12)) { b.a = (b.a || 0) + 0.21; for (const k of [0, Math.PI]) g.shot(b.x, b.y, b.a + k, 85 * sh, { color: '#ff8a8a' }); }
      }
      if (b.ph === 2) {
        if (every('spiral', 0.075)) { b.a = (b.a || 0) + 0.19; b.c = (b.c || 0) - 0.23; g.shot(b.x, b.y, b.a, 88 * sh, { color: '#ff5a5a' }); g.shot(b.x, b.y, b.c + Math.PI, 88 * sh, { color: '#ffb05a' }); }
        if (every('orbs', 2.6)) for (const s of [-1, 0, 1]) g.shot(b.x + s * 30, b.y + 20, Math.PI / 2 + s * 0.6, 70 * sh, { r: 6, color: '#c84aff', home: 1.8 });
        if (every('ring', 2.0)) g.ring(b.x, b.y, 20, 75 * sh, rnd(0, 1), { color: '#ffffff' });
      }
    },
  },
};

// node tools/trace.mjs stage pilot [upgradeLevel] : boss HP every 5 s with the same bot as sim.mjs
import { Game } from '../js/game.js';
import { UPGRADES, W, H } from '../js/data.js';

const [stage, pilot, lvl = 0] = process.argv.slice(2);
const g = new Game({ stage: +stage, pilot, upgrades: Object.fromEntries(UPGRADES.map((u) => [u.id, +lvl])), items: {}, god: true });
let next = 0;
for (let i = 0; i < 60 * 400 && g.phase !== 'done'; i++) {
  let tx = W / 2;
  if (g.boss && g.boss.vulnerable) tx = g.boss.x;
  else { const e = g.en.filter((x) => !x.dead && x.y > 0 && !x.decoy).sort((a, b) => b.y - a.y)[0]; if (e) tx = e.x; }
  g.update(1 / 60, { ax: Math.max(-1, Math.min(1, (tx - g.p.x) / 20)), ay: Math.max(-1, Math.min(1, (H - 90 - g.p.y) / 20)), skill: g.p.energy >= 100 });
  g.ev.length = 0;
  if (g.boss && g.t >= next) {
    next = g.t + 5;
    const b = g.boss;
    console.log(`t ${g.t.toFixed(0)}  hp ${Math.round(b.hp)}  ph ${b.ph}  vuln ${b.vulnerable}  alpha ${(b.alpha ?? 1).toFixed(2)}  boss x ${b.x.toFixed(0)} player x ${g.p.x.toFixed(0)} power ${g.p.power} clones ${g.en.filter((e) => e.type === 'clone' && !e.dead).length}`);
  }
}

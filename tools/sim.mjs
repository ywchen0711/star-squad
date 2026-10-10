// node tools/sim.mjs [upgradeLevel] : run every stage with every pilot (invincible bot that lines up under targets)
// and report time, boss fight length, credits and how often a bot that never dodges would have been hit.
import { Game, BOSSES } from '../js/game.js';
import { PILOTS, STAGES, UPGRADES, W, H } from '../js/data.js';

const lvl = Number(process.argv[2] || 0);
const ups = Object.fromEntries(UPGRADES.map((u) => [u.id, lvl]));
let bad = 0;
const rows = [];
for (const st of STAGES) {
  for (const pl of PILOTS) {
    const g = new Game({ stage: st.id, pilot: pl.id, upgrades: ups, items: {}, god: true });
    const dt = 1 / 60;
    let bossT0 = null, skills = 0;
    for (let i = 0; i < 60 * 400 && g.phase !== 'done'; i++) {
      // bot: chase the boss or the lowest enemy horizontally, stay near the bottom
      let tx = W / 2;
      if (g.boss && g.boss.vulnerable) tx = g.boss.x;
      else { const e = g.en.filter((x) => !x.dead && x.y > 0 && !x.decoy).sort((a, b) => b.y - a.y)[0]; if (e) tx = e.x; }
      const ax = Math.max(-1, Math.min(1, (tx - g.p.x) / 20)), ay = Math.max(-1, Math.min(1, (H - 90 - g.p.y) / 20));
      const skill = g.p.energy >= 100;
      if (skill) skills++;
      g.update(dt, { ax, ay, skill });
      if (g.phase === 'boss' && bossT0 === null && g.boss.vulnerable) bossT0 = g.t;
      g.ev.length = 0;
    }
    const r = g.result;
    if (!r) { bad++; rows.push(`${st.id} ${pl.id.padEnd(6)} DID NOT FINISH (phase ${g.phase}, boss hp ${g.boss && Math.round(g.boss.hp)})`); continue; }
    rows.push(`${st.id} ${pl.id.padEnd(6)} stage ${r.time.toFixed(0).padStart(3)}s  boss ${(r.time - 2.6 - bossT0).toFixed(0).padStart(3)}s  credits ${String(r.credits).padStart(4)} (+${r.clear} clear)  kills ${r.kills}  hits-if-no-dodge ${r.hits}  skills ${skills}`);
  }
}
console.log(`upgrades at level ${lvl}`);
console.log(rows.join('\n'));
console.log(bad ? `${bad} runs did not finish` : 'all runs finished');
process.exit(bad ? 1 : 0);

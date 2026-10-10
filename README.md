# Star Squad 星際小隊

A vertical-scrolling pixel shoot-'em-up with a full story, in Chinese and English. (Vanilla JS + canvas, no build step)

**Play:** https://ywchen0711.github.io/star-squad/

## Story
The Void Armada and Admiral Null have stolen the Star Heart, the crystal that powers every colony. Captain Mira
sends the four pilots of Star Squad after it, through five stages, each with its own boss and dialogue: prologue,
stage intros, boss entrances, victories and an ending. The pilot you fly answers in their own words.

| Stage | Boss |
|---|---|
| 1 The Asteroid Belt 廢棄礦石帶 | Goliath-X 巨岩破壞者 (drill lasers, splitting rocks) |
| 2 Neon Orbital Station 霓虹星港 | Phantom Queen 幻影女王 (teleports, decoy clones, spirals) |
| 3 The Crystal Nebula 水晶星雲 | Prism Hydra 稜鏡九頭蛇 (sweeping beams, bouncing and splitting crystals) |
| 4 The Solar Forge 太陽熔爐 | Inferno Titan 熔岩巨神 (fire walls with gaps, meteor rain, solar flares) |
| 5 The Dreadnought Core 核心母艦 | The Destroyer 毀滅者 (turrets, rotating cross lasers, berserk core) |

## Pilots
| Pilot | Weapon | Active skill | Passive skill |
|---|---|---|---|
| Josh · Blue Comet | spread shot | Hyper Dash: 4 s invincible, faster, ramming | Afterburner: +15% speed, +60% pickup range |
| Jasper · Green Viper | twin cannon + homing missiles | Missile Storm: 30 homing missiles | Lucky Star: +25% credits, more power-ups |
| Jeff · Red Fortress | laser beam (+ side guns) | Mirror Shield: reflects bullets for 5 s | Heavy Armor: +2 HP, longer recovery |
| Erin · Violet Phoenix | twin shot + up to 4 drones + wave shots | Time Warp: enemies 65% slower for 6 s, +25% damage | Phoenix Rebirth: revive once per mission |

## Credits
Credits from enemies, plus clear and no-hit bonuses, buy **permanent upgrades** (firepower, fire rate, hull, engine,
magnet, skill charge; 5 levels each) and **supplies** for the next mission (Nova Bomb, Repair Drone, Energy Shield,
Power Core, Credit Booster, Full Battery). A failed mission keeps the credits collected.

## Controls
Arrows / WASD move, Shift for precise moves, Space skill, B bomb, P pause; the ship fires by itself.
Touch: drag anywhere to fly, buttons for skill and bomb.

## Code
- `js/data.js` pilots, upgrades, supplies, enemies, stage timelines · `js/i18n.js` all text and the story
- `js/game.js` the game (no DOM): weapons, skills, enemies, bosses, bullets, pickups · `js/render.js` pixel drawing and portraits
- `js/main.js` screens, hangar, dialogue, HUD, input · `js/audio.js` chiptune sounds and music
- `node tools/sim.mjs [upgradeLevel]` plays every stage with every pilot (invincible bot) and reports boss times and credits

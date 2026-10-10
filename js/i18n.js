// Chinese / English: UI text and the whole story. The lobby opens games with ?lang=zh|en: that choice wins and is remembered.
const KEY = 'starsquad.lang';
let lang = 'zh';
try {
  const q = (location.search.match(/[?&]lang=(zh|en)(?![a-z])/) || [])[1];
  if (q) { lang = q; localStorage.setItem(KEY, q); }
  else { const s = localStorage.getItem(KEY); lang = s === 'en' || s === 'zh' ? s : /^zh/i.test(navigator.language || 'zh') ? 'zh' : 'en'; }
} catch (e) { /* private mode / Node */ }
export const getLang = () => lang;
export function setLang(l) { lang = l; try { localStorage.setItem(KEY, l); } catch (e) { /* ignore */ } if (typeof document !== 'undefined') document.documentElement.lang = l === 'zh' ? 'zh-Hant' : 'en'; }
export const L = (o) => (o ? o[lang] ?? o.en : '');
export const t = (k, ...a) => { const v = UI[lang][k] ?? UI.en[k] ?? k; return typeof v === 'function' ? v(...a) : v; };

// ------------------------------------------------------------------ names
export const NAMES = {
  mira: { zh: '米拉艦長', en: 'Captain Mira' },
  josh: { zh: 'Josh', en: 'Josh' }, jasper: { zh: 'Jasper', en: 'Jasper' }, jeff: { zh: 'Jeff', en: 'Jeff' }, erin: { zh: 'Erin', en: 'Erin' },
  goliath: { zh: '巨岩破壞者 Goliath-X', en: 'Goliath-X' }, queen: { zh: '幻影女王', en: 'Phantom Queen' }, hydra: { zh: '稜鏡九頭蛇', en: 'Prism Hydra' },
  titan: { zh: '熔岩巨神', en: 'Inferno Titan' }, null: { zh: '零號將軍', en: 'Admiral Null' }, destroyer: { zh: '終極星艦「毀滅者」', en: 'The Destroyer' },
};
export const SHIPS = {
  josh: { zh: '藍彗星', en: 'Blue Comet' }, jasper: { zh: '綠蝮蛇', en: 'Green Viper' }, jeff: { zh: '紅色堡壘', en: 'Red Fortress' }, erin: { zh: '紫鳳凰', en: 'Violet Phoenix' },
};
export const PILOT_TEXT = {
  josh: {
    role: { zh: '速度型 · 散射', en: 'Speed · Spread shot' },
    weapon: { zh: '彗星散射：扇形連射，等級越高越寬。近距離火力最強。', en: 'Comet Spread: a fan of rapid shots that widens as it levels up. Deadliest up close.' },
    active: { zh: '【超光速衝刺】4 秒無敵，移動和射速大幅提升，撞到敵人也會造成傷害。', en: '[Hyper Dash] 4 s of invincibility with much faster movement and fire; ramming hurts enemies.' },
    passive: { zh: '【後燃器】移動速度 +15%，吸取能量幣的範圍 +60%。', en: '[Afterburner] +15% speed and +60% pickup range.' },
  },
  jasper: {
    role: { zh: '追蹤型 · 飛彈', en: 'Homing · Missiles' },
    weapon: { zh: '蝮蛇飛彈：雙發主砲加上會自己追敵人的飛彈。', en: 'Viper Missiles: a twin cannon plus missiles that hunt enemies down.' },
    active: { zh: '【飛彈風暴】一口氣射出 30 枚追蹤飛彈。', en: '[Missile Storm] Unleashes 30 homing missiles at once.' },
    passive: { zh: '【幸運星】能量幣 +25%，敵人更容易掉出強化道具。', en: '[Lucky Star] +25% credits and more power-up drops.' },
  },
  jeff: {
    role: { zh: '防禦型 · 雷射', en: 'Defense · Laser' },
    weapon: { zh: '堡壘雷射：一直射的光束，打中最前面的敵人。3 級起多兩門側砲。', en: 'Fortress Laser: a constant beam that hits the first enemy in line. Side guns from level 3.' },
    active: { zh: '【鏡面護盾】5 秒護盾，把碰到的子彈全部反彈回去。', en: '[Mirror Shield] A 5 s shield that bounces enemy bullets back at them.' },
    passive: { zh: '【重裝甲】最大生命 +2，被打中後的無敵時間更長。', en: '[Heavy Armor] +2 max HP and longer recovery after a hit.' },
  },
  erin: {
    role: { zh: '技巧型 · 僚機', en: 'Technique · Drones' },
    weapon: { zh: '鳳凰之翼：雙發加上最多 4 架僚機，3 級起多了波動彈。', en: 'Phoenix Wings: twin shots plus up to 4 drones; wave shots from level 3.' },
    active: { zh: '【時間減速】6 秒內敵人和子彈變慢 65%，Erin 的傷害 +25%。', en: '[Time Warp] For 6 s enemies and bullets slow by 65% and Erin deals +25% damage.' },
    passive: { zh: '【浴火重生】每關一次，被擊倒時以 3 點生命復活。', en: '[Phoenix Rebirth] Once per mission, revive with 3 HP when shot down.' },
  },
};
export const STAGE_TEXT = [
  { name: { zh: '廢棄礦石帶', en: 'The Asteroid Belt' }, desc: { zh: '虛空艦隊的採礦無人機正在拆光小行星。小心落石！', en: 'Armada mining drones are tearing the asteroids apart. Mind the rocks!' } },
  { name: { zh: '霓虹星港', en: 'Neon Orbital Station' }, desc: { zh: '被佔領的太空港，到處都是全像投影的陷阱。', en: 'A captured space port full of hologram tricks.' } },
  { name: { zh: '水晶星雲', en: 'The Crystal Nebula' }, desc: { zh: '星之心外洩的能量在這裡長出會動的水晶。', en: "The Star Heart's leaking energy grows living crystals here." } },
  { name: { zh: '太陽熔爐', en: 'The Solar Forge' }, desc: { zh: '艦隊在吸取一顆恆星的能量，建造終極兵器。', en: 'The Armada drains a star to build its ultimate weapon.' } },
  { name: { zh: '核心母艦', en: 'The Dreadnought Core' }, desc: { zh: '零號將軍的旗艦。星之心就在最深處。', en: "Admiral Null's flagship. The Star Heart is deep inside." } },
];
export const UP_TEXT = {
  dmg: { zh: '火力', en: 'Firepower', d: { zh: '傷害 +12%/級', en: '+12% damage per level' } },
  rate: { zh: '射速', en: 'Fire rate', d: { zh: '射速 +8%/級', en: '+8% fire rate per level' } },
  hull: { zh: '機體裝甲', en: 'Hull', d: { zh: '最大生命 +1/級', en: '+1 max HP per level' } },
  engine: { zh: '引擎', en: 'Engine', d: { zh: '移動速度 +6%/級', en: '+6% speed per level' } },
  magnet: { zh: '磁力', en: 'Magnet', d: { zh: '吸取範圍 +30%/級', en: '+30% pickup range per level' } },
  charge: { zh: '技能充能', en: 'Skill charge', d: { zh: '技能充能 +15%/級', en: '+15% skill charge per level' } },
};
export const ITEM_TEXT = {
  bomb: { zh: '新星炸彈', en: 'Nova Bomb', d: { zh: '清除全畫面子彈並重創敵人（B 鍵）。最多帶 3 顆。', en: 'Clears every bullet and blasts all enemies (B). Carry up to 3.' } },
  repair: { zh: '修理無人機', en: 'Repair Drone', d: { zh: '生命剩 1 時自動修復 2 點。', en: 'Restores 2 HP when you drop to 1 HP.' } },
  shield: { zh: '能量護盾', en: 'Energy Shield', d: { zh: '抵擋前 3 次攻擊。', en: 'Blocks the first 3 hits.' } },
  power: { zh: '動力核心', en: 'Power Core', d: { zh: '開場武器就是 3 級。', en: 'Start the mission at weapon level 3.' } },
  booster: { zh: '能量幣加倍器', en: 'Credit Booster', d: { zh: '這一關能量幣 +50%。', en: '+50% credits this mission.' } },
  charge: { zh: '滿電池', en: 'Full Battery', d: { zh: '開場技能就充滿。', en: 'Start with a full skill meter.' } },
};

// ------------------------------------------------------------------ UI
const UI = {
  zh: {
    title: '星際小隊', sub: 'STAR SQUAD', start: '開始任務', cont: '繼續', newGame: '重新開始', lang: 'EN',
    hangar: '機庫', pilots: '駕駛員', upgrades: '升級', shop: '補給', missions: '任務', launch: '🚀 出擊！',
    credits: '能量幣', level: '等級', max: '已滿', buy: '購買', owned: (n) => `已帶 ${n}`, have: '持有',
    weapon: '武器', active: '主動技能', passive: '被動技能', selected: '出擊中', choose: '選擇',
    locked: '🔒 尚未解鎖', cleared: '✅ 已通關', boss: 'Boss', stage: (n) => `第 ${n} 關`, best: (s) => `最高分 ${s}`,
    skip: '跳過 ▸▸', next: '▼', warning: 'WARNING', bossApproach: '強大的敵人接近中！',
    clearTitle: '任務完成！', failTitle: '任務失敗……', gotCredits: '收集的能量幣', clearBonus: '通關獎勵', nohitBonus: '無傷獎勵', total: '合計',
    score: '分數', retry: '↻ 再試一次', toHangar: '回到機庫', keep: '收集到的能量幣保留下來了。',
    skill: '技能', bomb: '炸彈', pause: '暫停', resume: '繼續', quit: '撤退回機庫',
    hpRevive: '🔥 浴火重生！', shieldHit: '🛡️ 護盾擋下了！', repaired: '🔧 修理完成 +2', powerUp: '武器強化！', elite: '精英敵機！',
    controlsPC: '方向鍵 / WASD 移動 · Shift 精準移動 · 空白鍵 技能 · B 炸彈 · P 暫停（自動射擊）',
    controlsTouch: '拖曳畫面移動戰機 · 右下按鈕：技能、炸彈（自動射擊）',
    story: '劇情', replayStory: '重看序章', ending: '結局', theEnd: '— 完 —', thanks: '謝謝你遊玩《星際小隊》！',
    resetQ: '確定要清除所有進度嗎？', notEnough: '能量幣不夠', bought: '已購買', help: '說明',
    helpBody: [
      '選一位駕駛員，在機庫用能量幣升級機體、購買補給，然後出擊！戰機會自動射擊。',
      '打倒敵人會掉出能量幣（金色）、P（武器升級，最高 5 級）和愛心（回復生命）。被打中會損失 1 點生命，武器降 1 級。',
      '技能條充滿後按「技能」發動主動技能。炸彈要在補給商店先買。',
      '每關最後都有 Boss，Boss 血量越低攻擊越兇。通關會得到能量幣獎勵，不被打中還有額外獎勵！',
    ],
  },
  en: {
    title: 'Star Squad', sub: '星際小隊', start: 'Start mission', cont: 'Continue', newGame: 'New game', lang: '中文',
    hangar: 'Hangar', pilots: 'Pilots', upgrades: 'Upgrades', shop: 'Supplies', missions: 'Missions', launch: '🚀 Launch!',
    credits: 'Credits', level: 'Lv', max: 'MAX', buy: 'Buy', owned: (n) => `Packed ${n}`, have: 'Owned',
    weapon: 'Weapon', active: 'Active skill', passive: 'Passive skill', selected: 'Selected', choose: 'Choose',
    locked: '🔒 Locked', cleared: '✅ Cleared', boss: 'Boss', stage: (n) => `Stage ${n}`, best: (s) => `Best ${s}`,
    skip: 'Skip ▸▸', next: '▼', warning: 'WARNING', bossApproach: 'A powerful enemy approaches!',
    clearTitle: 'Mission complete!', failTitle: 'Mission failed...', gotCredits: 'Credits collected', clearBonus: 'Clear bonus', nohitBonus: 'No-hit bonus', total: 'Total',
    score: 'Score', retry: '↻ Try again', toHangar: 'Back to hangar', keep: 'You keep the credits you collected.',
    skill: 'Skill', bomb: 'Bomb', pause: 'Paused', resume: 'Resume', quit: 'Retreat to hangar',
    hpRevive: '🔥 Phoenix Rebirth!', shieldHit: '🛡️ Shield blocked it!', repaired: '🔧 Repaired +2', powerUp: 'Weapon up!', elite: 'Elite enemy!',
    controlsPC: 'Arrows / WASD to move · Shift for precise moves · Space skill · B bomb · P pause (auto-fire)',
    controlsTouch: 'Drag anywhere to fly · bottom-right buttons: skill, bomb (auto-fire)',
    story: 'Story', replayStory: 'Replay prologue', ending: 'Ending', theEnd: '— THE END —', thanks: 'Thank you for playing Star Squad!',
    resetQ: 'Erase all progress?', notEnough: 'Not enough credits', bought: 'Bought', help: 'Help',
    helpBody: [
      'Pick a pilot, spend credits in the hangar on upgrades and supplies, then launch! Your ship fires by itself.',
      'Enemies drop credits (gold), P (weapon level, up to 5) and hearts (repair). A hit costs 1 HP and one weapon level.',
      'When the skill meter is full press Skill for your active skill. Bombs are bought in the Supplies shop.',
      'Every stage ends with a boss that gets fiercer as its HP drops. Clearing a stage pays a bonus, and a no-hit run pays extra!',
    ],
  },
};

// ------------------------------------------------------------------ the story
// a line: { who, zh, en } or { who: 'pilot', josh: {zh,en}, jasper: ..., jeff: ..., erin: ... } (the chosen pilot speaks)
const P = (josh, jasper, jeff, erin) => ({ who: 'pilot', josh, jasper, jeff, erin });
const S = (who, zh, en) => ({ who, zh, en });
const T = (zh, en) => ({ zh, en });

export const STORY = {
  prologue: [
    S('mira', '緊急通知！所有殖民星的燈都在閃爍——「星之心」被偷走了！', 'Emergency! The lights are flickering on every colony. The Star Heart has been stolen!'),
    S('mira', '星之心是供應整個星區能源的水晶。沒有它，七天後所有星球都會陷入黑暗。', 'The Star Heart is the crystal that powers our whole sector. Without it, every planet goes dark in seven days.'),
    S('mira', '犯人是虛空艦隊，還有他們的首領：零號將軍。', 'The thieves are the Void Armada, led by Admiral Null.'),
    S('mira', '曙光號上只剩四架星際戰機能出動。Josh、Jasper、Jeff、Erin——星際小隊，就靠你們了！', 'Only four starfighters aboard the carrier Aurora can launch. Josh, Jasper, Jeff, Erin: Star Squad, it is up to you!'),
    S('josh', '速度交給我！我會第一個衝到他們面前。', "Leave the speed to me! I'll be the first one in their face."),
    S('jasper', '我的追蹤飛彈已經等不及了，它們會自己找到目標。', "My homing missiles can't wait. They find their own targets."),
    S('jeff', '先把護盾充好電。安全第一，然後再全力開火。', 'Shields charged first. Safety first, then full firepower.'),
    S('erin', '星之心在哭……我感覺得到。我們一定要把它帶回家。', "The Star Heart is crying... I can feel it. We're bringing it home."),
    S('mira', '追蹤訊號顯示，艦隊穿過了廢棄礦石帶。在機庫選好戰機、升級裝備，我們出發！', 'The trail leads through the Asteroid Belt. Pick your fighter in the hangar, gear up, and let us go!'),
  ],
  s1_intro: [
    S('mira', '這裡是廢棄礦石帶。虛空艦隊的採礦無人機正在把小行星拆光。', 'This is the Asteroid Belt. Armada mining drones are stripping the asteroids bare.'),
    S('mira', '它們在收集礦石……用來造某種非常大的東西。', "They're hauling ore... to build something very, very big."),
    P(T('小行星？完美的障礙賽道！', 'Asteroids? A perfect slalom course!'), T('目標好多，我的飛彈會很開心。', 'So many targets. My missiles will be thrilled.'),
      T('注意落石……還有在挖石頭的那個傢伙。', "Watch for falling rocks... and whatever's doing the digging."), T('石頭在嗡嗡作響。下面有個很大的東西。', 'The rocks are humming. Something big is down there.')),
    S('mira', '打碎石頭會掉出能量幣。收集越多，回機庫就能升級越多！', 'Smashed rocks drop credits. Collect them to upgrade back in the hangar!'),
  ],
  s1_boss: [
    S('goliath', '入侵者。偵測到。礦石。全部。是我的！', 'INTRUDER. DETECTED. ALL ORE. IS MINE!'),
    P(T('你很大隻，但你夠快嗎？', "You're big. But are you fast?"), T('鎖定完成。目標：一台很吵的挖土機。', 'Lock-on complete. Target: one very loud digger.'),
      T('它的鑽頭會發射雷射，大家小心！', 'Its drills fire lasers. Careful!'), T('它的眼睛……好像在害怕什麼。', 'Its eyes... it looks scared of something.')),
    S('mira', '那是 Goliath-X 採礦機甲！打它的身體和鑽頭！', "That's the Goliath-X mining mech! Hit its body and drills!"),
  ],
  s1_clear: [
    S('goliath', '系統……過熱……零號主人……原諒……', 'SYSTEM... OVERHEAT... MASTER NULL... FORGIVE...'),
    S('mira', '它說了「零號」。它的記憶體裡有一條航線——霓虹星港。', 'It said "Null". Its memory holds a flight path: the Neon Orbital Station.'),
    P(T('下一站，霓虹星港！全速前進！', 'Next stop, Neon Station! Full speed!'), T('我剛剛撿到好多能量幣，先去機庫買新飛彈。', 'I grabbed a pile of credits. New missiles first.'),
      T('先修好裝甲再出發。', 'Repair the armor, then we go.'), T('Goliath 只是被命令的……下一個敵人也是嗎？', 'Goliath was only following orders... is the next one too?')),
  ],
  s2_intro: [
    S('mira', '霓虹星港曾經是星區最熱鬧的太空港。現在它的燈光……不對勁。', 'Neon Station used to be the busiest port in the sector. Now its lights are... wrong.'),
    S('mira', '整座港口被駭進了。有些敵人只是全像投影——別相信你的眼睛。', 'The whole port has been hacked. Some enemies are only holograms. Do not trust your eyes.'),
    P(T('投影？那我就快到讓它們跟不上！', "Holograms? Then I'll be faster than they can draw!"), T('我的飛彈追熱源，投影騙不了它們。', 'My missiles track heat. Holograms cannot fool them.'),
      T('雷射只會打到真的東西，正好。', 'My laser only hits real things. Good.'), T('有人在這裡哭……是被關起來的人。', 'Someone is crying here... someone locked away.')),
    S('mira', '小心爆炸的水雷，它們會噴出一圈子彈。', 'Watch the mines. They burst into rings of bullets.'),
  ],
  s2_boss: [
    S('queen', '歡迎來到我的舞台，小小飛行員！猜猜看，哪一個才是真正的我？呵呵呵！', 'Welcome to my show, little pilots! Guess which one of me is real? Ha ha ha!'),
    P(T('全部打一遍就知道了！', "I'll just hit all of you!"), T('我的飛彈知道答案。', 'My missiles already know.'),
      T('分身會射子彈，但打不壞。專心打本尊！', "The clones shoot but can't be hurt. Focus on the real one!"), T('你的笑聲在發抖。你真的想這樣做嗎？', "Your laugh is shaking. Do you really want to do this?")),
    S('mira', '她會瞬間移動！跟著她，別讓她逃出你的射程。', 'She teleports! Stay with her and keep her in your sights.'),
  ],
  s2_clear: [
    S('queen', '等等……我腦袋裡的晶片……不見了。我的頭好清楚。', 'Wait... the chip in my head... it is gone. My mind is clear.'),
    S('queen', '是零號把控制晶片裝進我腦中的。對不起……我不是故意的。', 'Null put a control chip in me. I am sorry... I never wanted this.'),
    S('queen', '星之心被帶去水晶星雲充能了。快去，在它被吸乾之前！', 'The Star Heart was taken to the Crystal Nebula to be charged. Hurry, before it is drained!'),
    P(T('收到！謝啦，女王！', 'Got it! Thanks, Queen!'), T('座標已經存好了，出發。', 'Coordinates saved. Moving out.'),
      T('你自由了。好好保護這座星港吧。', "You're free. Take care of this station."), T('我就知道，你本來就不壞。', 'I knew it. You were never bad.')),
  ],
  s3_intro: [
    S('mira', '水晶星雲……星之心的能量正在外洩，到處長出水晶。', "The Crystal Nebula... the Star Heart's energy is leaking out and growing crystals everywhere."),
    S('mira', '有些水晶好像……活過來了。', 'Some of the crystals seem... alive.'),
    P(T('好漂亮，但我沒時間欣賞！', 'Pretty! No time to sightsee though!'), T('水晶硬歸硬，打中核心就會碎。', 'Crystals are tough, but hit the core and they shatter.'),
      T('水晶會反射光線。小心被自己的雷射……嗯，應該不會。', 'Crystals reflect light. Careful of my own laser... no, I think we are fine.'), T('這些水晶在唱歌。它們好痛。', 'The crystals are singing. They are in pain.')),
  ],
  s3_boss: [
    S('hydra', '（嘶——！！三顆頭同時發出刺耳的水晶共鳴）', '(SKREEEE! Three heads ring out in a piercing crystal chime)'),
    S('mira', '是稜鏡九頭蛇！它是用星之心外洩的能量長出來的！', "A Prism Hydra! It grew from the Star Heart's leaking energy!"),
    P(T('三顆頭？那我就打三倍快！', "Three heads? Then I'll shoot three times faster!"), T('三個目標，飛彈剛好夠分。', 'Three targets. Plenty of missiles to share.'),
      T('它的光束會掃過整個畫面，找空隙躲！', 'Its beams sweep the whole screen. Find the gaps!'), T('別怕……我們會讓你安靜下來。', "Don't be afraid... we'll help you rest.")),
  ],
  s3_clear: [
    S('mira', '九頭蛇碎成了光點……能量在回流。星之心就在附近！', 'The Hydra broke into sparkles... the energy is flowing back. The Star Heart is close!'),
    S('mira', '訊號指向太陽熔爐。零號在那裡吸取一顆恆星的力量，建造某種兵器。', 'The signal points to the Solar Forge. Null is draining a star there to build a weapon.'),
    P(T('一顆星星？那一定很燙！', 'A whole star? That has to be hot!'), T('再去機庫補給一次，這次要帶滿。', 'One more trip to the hangar. Full load this time.'),
      T('熔爐的溫度會很高，裝甲要升級。', 'The forge will be scorching. Upgrade the armor.'), T('那顆恆星也在求救……我們快去。', 'That star is calling for help too... let us hurry.')),
  ],
  s4_intro: [
    S('mira', '太陽熔爐。虛空艦隊把一顆恆星關在籠子裡，用它的火焰打造戰艦。', 'The Solar Forge. The Armada has caged a star and uses its fire to forge warships.'),
    S('mira', '他們造的就是那艘船：終極星艦「毀滅者」。', 'And this is where they built it: the ultimate starship, the Destroyer.'),
    P(T('越熱我越快！', 'The hotter it gets, the faster I go!'), T('飛彈的引擎在高溫下會更猛。', 'My missile engines love the heat.'),
      T('護盾全開。熔岩彈會穿過一般的掩護。', 'Shields to max. Lava shots punch through normal cover.'), T('星星，再忍耐一下，我們來救你了。', 'Hold on, little star. We are coming.')),
  ],
  s4_boss: [
    S('titan', '渺小的火花們！這座熔爐已經燃燒了一千年，你們熄不了它！', 'Tiny sparks! This forge has burned for a thousand years. You will not put it out!'),
    P(T('那我就燒得比你更快！', "Then I'll burn even faster!"), T('一千年？那你一定累了，換我們來。', 'A thousand years? You must be tired. Let us take over.'),
      T('火牆有缺口，找到它就能穿過去！', 'The fire walls have gaps. Find them and slip through!'), T('你守護熔爐這麼久……你守護的是誰？', 'You guarded this forge so long... who were you guarding it for?')),
    S('mira', '天上會掉隕石！看到黃色的光就快閃開！', 'Meteors incoming! When you see a yellow glow, move!'),
  ],
  s4_clear: [
    S('titan', '哈……你們燒得比我想像的還亮。', 'Ha... you burn brighter than I thought.'),
    S('titan', '去吧，小火花。零號在核心母艦裡等著你們。星之心就在毀滅者的心臟裡。', 'Go, little sparks. Null waits in the Dreadnought. The Star Heart beats inside the Destroyer.'),
    S('mira', '恆星的牢籠打開了！可是……毀滅者正在啟動！這是最後一戰了。', "The star's cage is open! But... the Destroyer is powering up! This is the final battle."),
    P(T('最後一戰？我最喜歡最後一戰！', 'The final battle? My favorite kind!'), T('能量幣全部拿去升級，一枚都不留。', 'Every last credit goes into upgrades.'),
      T('大家回到機庫整備。這次一個都不能少。', 'Everyone back to the hangar. Nobody gets left behind this time.'), T('星之心，我們來了。', 'Star Heart, we are coming.')),
  ],
  s5_intro: [
    S('mira', '我們進到核心母艦了。到處都是防衛系統！', 'We are inside the Dreadnought. Defenses everywhere!'),
    S('null', '所以，就是你們這幾個孩子，打垮了我的艦隊。', 'So. You are the children who broke my Armada.'),
    S('null', '你們知道我為什麼拿走星之心嗎？殖民星浪費它的光。我會好好保管它——永遠，在黑暗裡。', 'Do you know why I took the Heart? The colonies waste its light. I will keep it safe. Forever. In the dark.'),
    P(T('光不是用來關起來的！我要把它帶回去！', "Light isn't meant to be locked up! I'm taking it back!"), T('保管？你只是想自己擁有它。', 'Keep it safe? You just want it for yourself.'),
      T('沒有星之心，七天後所有人都會受凍。這不叫保管。', 'Without it everyone freezes in seven days. That is not keeping it safe.'), T('你的聲音……好孤單。', 'Your voice... it sounds so lonely.')),
  ],
  s5_boss: [
    S('null', '毀滅者，全功率！把他們抹掉！', 'Destroyer, full power! Erase them!'),
    S('mira', '先打掉兩側的砲台！血量降低後核心會露出來，然後……它會失控！', 'Take out the side turrets! When it weakens the core opens, and then... it will go berserk!'),
    P(T('全速衝刺！', 'Full throttle!'), T('所有飛彈，鎖定！', 'All missiles, lock on!'), T('護盾、雷射，準備完畢！', 'Shield and laser, ready!'), T('Josh、Jasper、Jeff，我們一起！', 'Josh, Jasper, Jeff, together!')),
  ],
  ending: [
    S('null', '為什麼……為什麼你們要為了別人的光這麼拚命？', 'Why... why do you fight so hard for other people\'s light?'),
    P(T('因為大家一起亮，才最好玩！', 'Because the light is more fun when everyone has it!'), T('因為那也是我們的家。', 'Because it is our home too.'),
      T('因為保護別人，才是真正的保管。', 'Because protecting others is what keeping things safe really means.'), T('因為光本來就是要分享的。你也可以一起來。', 'Because light is meant to be shared. You can share it too.')),
    S('null', '分享……我被造出來是為了守護。可是從來沒有人告訴我，要守護什麼。', 'Shared... I was built to guard. But nobody ever told me what I was guarding.'),
    S('mira', '那就和我們一起守護吧，零號。不是在黑暗裡，是在光裡。', 'Then guard it with us, Null. Not in the dark. In the light.'),
    S('null', '……把星之心帶回去吧。還有……謝謝你們。', '...Take the Heart home. And... thank you.'),
    S('mira', '星之心回收成功！各位，看——所有殖民星的燈，一盞一盞亮起來了！', 'Star Heart recovered! Look, everyone: every colony is lighting up again, one by one!'),
    S('josh', '耶！我們做到了！下一次比賽誰先飛回曙光號！', 'YES! We did it! Race you back to the Aurora!'),
    S('jasper', '能量幣存好了。說不定下次還用得到。', 'Credits saved. We might need them again someday.'),
    S('jeff', '全員平安。這才是最重要的任務成果。', 'Everyone is safe. That is the result that matters most.'),
    S('erin', '星之心不哭了。它在笑。', 'The Star Heart is not crying anymore. It is smiling.'),
    S('mira', '星際小隊，任務完成。歡迎回家。', 'Star Squad, mission complete. Welcome home.'),
  ],
};
export const SPEAKERS = ['mira', 'josh', 'jasper', 'jeff', 'erin', 'goliath', 'queen', 'hydra', 'titan', 'null'];

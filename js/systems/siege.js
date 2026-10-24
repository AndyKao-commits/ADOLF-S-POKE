/* ============ siege.js — asedio ============
 * Cada jugador tiene un castillo y sube de nivel por su cuenta.
 * Los monstruos salen de cada castillo: atacan a los demás, no a los suyos.
 * Al minuto y cuarto un jefe en el centro ataca sólo a jugadores.
 * Gana el último castillo en pie. El destruido deja de invocar y sus monstruos se van.
 * Los jugadores vivos se apuntan entre sí. Si tu castillo ya cayó, dejas de herir.
 * En solitario no hay un jugador rival: sólo el castillo rival.
 * La pelea la calcula el anfitrión: si se va a media partida, la ronda termina.
 */
G.Siege = (() => {
  const HALF = 832;
  const MAX_HP = 4800;
  const RESPAWN = 5;
  const CREEP_CAP = 4;
  const KILL_CASTLE = 240;
  const PLAYER_CAP = 160;
  let on = false, castles = [], img = null, ended = false, respawnT = 0, bumpT = 0;
  let bossAlive = false, bossSpawns = 0, bossNextAt = 90, bossWarned = false, bossWarn = 0, bossPaid = {};
  let bossByPlayer = new Map(), bossByTeam = new Map(), bossTime = 0, sawDead = {};
  const pk = {};

  function slots(n) {
    if (n <= 2) return [{ x: -620, y: 0 }, { x: 620, y: 0 }];
    if (n === 3) return [{ x: 0, y: -580 }, { x: -520, y: 400 }, { x: 520, y: 400 }];
    return [{ x: -480, y: -480 }, { x: 480, y: -480 }, { x: -480, y: 480 }, { x: 480, y: 480 }];
  }

  function meId() { return G.Coop.active ? G.Net.uid : 'me'; }
  function authority() { return !G.Coop.active || G.Coop.isHost; }

  /** Monstruo de este jugador: sus ataques lo atraviesan y no le hacen nada. */
  function ally(e, who) {
    if (!on || !e || !e.siegeCreep || !e.owner) return false;
    const uid = !who ? meId() : (typeof who === 'string' ? who : (who.uid || 'me'));
    return e.owner === uid;
  }

  function placeAt(pl, c) {
    const d = Math.hypot(c.x, c.y) || 1;
    pl.x = c.x - c.x / d * 70;
    pl.y = c.y - c.y / d * 70;
  }

  function begin(members) {
    on = true; ended = false; respawnT = 0; bumpT = 0; rejected = 0;
    for (const k in paidDeath) delete paidDeath[k];
    resetBoss();
    for (const k in pk) delete pk[k];
    let people;
    if (members && members.length) {
      people = members.slice(0, 4).map((m, i) => ({
        uid: m.uid, name: m.name || '?', color: G.Coop.COLORS[i % G.Coop.COLORS.length]
      }));
    } else {
      const name = (G.Social.me && G.Social.me.name) || 'Tú';
      people = [
        { uid: 'me', name, color: '#ffcb3d' },
        { uid: 'rival', name: 'Castillo rival', color: '#ff6b6b' }
      ];
    }
    const pos = slots(people.length);
    castles = people.map((p, i) => ({
      uid: p.uid, name: p.name, color: p.color,
      x: pos[i].x, y: pos[i].y, r: 26, hp: MAX_HP, maxHp: MAX_HP, shield: 0, cd: 0, spawnT: 0.35
    }));
    const mine = castles.find(c => c.uid === meId()) || castles[0];
    const pl = G.Game.player;
    if (pl && mine) placeAt(pl, mine);
    if (G.World && G.World.clearCover) {
      for (const c of castles) G.World.clearCover(c.x, c.y, 220);
    }
    if (G.Coop.active) {
      for (const c of castles) {
        if (c.uid === meId()) continue;
        const m = G.Coop.mate(c.uid);
        if (!m || !m.pl) continue;
        placeAt(m.pl, c);
        if (m.pl.net) { m.pl.net.x = m.pl.x; m.pl.net.y = m.pl.y; }
      }
    }
    if (!img) { img = new Image(); img.src = 'assets/castle-puppy.png?v=char'; }
    G.Spawner.say('Asedio: los monstruos salen de los castillos. El jefe del centro no toca castillos.', 4);
  }

  function bossCfg() { return (G.PvpBoss && G.PvpBoss.PVP_BOSS_CONFIG) || { firstSpawnAt: 90, respawnDelay: 120, maxSpawnCount: 3, warningSeconds: 10 }; }
  function resetBoss() {
    const cfg = bossCfg();
    bossAlive = false; bossSpawns = 0; bossNextAt = cfg.firstSpawnAt; bossWarned = false; bossWarn = 0; bossPaid = {};
    bossByPlayer = new Map(); bossByTeam = new Map(); bossTime = 0; sawDead = {};
  }

  function end() {
    on = false; castles = []; ended = false; rejected = 0;
    for (const k in paidDeath) delete paidDeath[k];
    resetBoss();
  }

  function clamp(e) {
    if (!on || !e) return;
    const r = e.r || 12;
    e.x = G.U.clamp(e.x, -HALF + r, HALF - r);
    e.y = G.U.clamp(e.y, -HALF + r, HALF - r);
  }

  function contain() {
    if (!on || (G.Rift && G.Rift.inArena)) return;
    if (G.Game.player) clamp(G.Game.player);
    for (const e of G.EnemyMgr.all()) clamp(e);
  }

  /** Un solo ataque no se lleva un tercio del castillo. */
  function clampDmg(n) { return Math.max(1, Math.min(360, Math.round(+n || 0))); }

  /** Este jugador ya no lucha: sin revivir y sin seguir pegando. */
  function knockLocal() {
    const pl = G.Game && G.Game.player;
    if (!pl || pl.dead) return;
    pl.invuln = 0;
    pl.hp = 0;
    pl.dead = true;
    pl.reviveT = 0;
    if (pl.anim) pl.anim.play('Faint', { hold: true });
    G.Projectiles.clearOrbs(pl);
  }

  function knockOut(uid) {
    if (!uid || uid === 'rival') return;
    if (uid === meId()) knockLocal();
    else if (G.Coop.mate) {
      const m = G.Coop.mate(uid);
      const p = m && m.pl;
      if (p && !p.dead) {
        p.hp = 0;
        p.dead = true;
        if (p.anim) p.anim.play('Faint', { hold: true });
      }
    }
    if (G.Coop.active && G.Coop.isHost) G.Coop.broadcast(['so', uid]);
  }

  /** Los monstruos de un castillo caído se van, sin experiencia. */
  function dismiss(uid) {
    if (!authority()) return;
    for (const e of G.EnemyMgr.all()) {
      if (e.dead || e.remote || !e.siegeCreep || e.owner !== uid) continue;
      e.noReward = true;
      e.hurt(Math.max(1, e.hp));
    }
  }

  function fall(c) {
    if (ended || !c || c.fallen) return;
    c.fallen = true;
    dismiss(c.uid);
    knockOut(c.uid);
    const left = castles.filter(x => x.hp > 0);
    if (left.length > 1) {
      if (G.Spawner) G.Spawner.say('¡' + c.name + ' queda fuera!', 2.6);
      return;
    }
    ended = true;
    const win = left.length === 1 && left[0].uid !== 'rival' ? left[0].uid : '';
    if (G.Game.siegeOver) G.Game.siegeOver({ win: win || '', fallen: c.uid });
  }

  /** El anfitrión (o el solo) aplica el golpe. El jefe no pasa por aquí. */
  function applyHit(uid, dmg, attackerUid) {
    if (!on || ended) return;
    const c = castles.find(x => x.uid === uid);
    if (!c || c.hp <= 0 || attackerUid === c.uid) return;
    const atk = attackerUid && castles.find(x => x.uid === attackerUid);
    if (atk && atk.hp <= 0) return;
    const hit = clampDmg(dmg);
    let left = hit;
    if (c.shield > 0) {
      const use = Math.min(c.shield, left);
      c.shield -= use;
      left -= use;
    }
    if (left > 0) c.hp = Math.max(0, c.hp - left);
    G.FX.dmgText(c.x + G.U.rand(-8, 8), c.y - 40, hit, left > 0 ? '#ff8b8b' : '#8fd4ff');
    if (c.hp <= 0) fall(c);
  }

  function localHit(c, dmg, attacker) {
    const who = attacker || meId();
    if (!c || c.uid === who) return;
    if (!authority()) G.Coop.toHost(['sg', c.uid, clampDmg(dmg), who]);
    else applyHit(c.uid, dmg, who);
  }

  function mineUp() {
    const mine = castles.find(x => x.uid === meId());
    return !!(mine && mine.hp > 0);
  }

  function ownerId(who) {
    if (!who) return meId();
    if (typeof who === 'string') return who;
    return who.uid || who.ownerId || 'me';
  }

  function people() {
    const out = [];
    const pl = G.Game && G.Game.player;
    if (pl) out.push(pl);
    if (G.Coop.puppets) for (const o of G.Coop.puppets()) if (o) out.push(o);
    return out;
  }

  /** Otros jugadores que aún pueden recibir los golpes de `who`. Nunca incluye a quien lanza. */
  function foePlayers(who) {
    if (!on || ended) return [];
    const uid = ownerId(who);
    const atk = castles.find(c => c.uid === uid);
    if (atk && atk.hp <= 0) return [];
    const out = [];
    for (const o of people()) {
      if (!o || o.dead) continue;
      const id = o.uid || 'me';
      if (id === uid) continue;
      const c = castles.find(x => x.uid === id);
      if (c && c.hp <= 0) continue;
      if ((o.spawnGuard || 0) > 0 || (o.reviveSafe || 0) > 0) continue;
      out.push(o);
    }
    return out;
  }

  function asMark(o) {
    const id = o.uid || 'me';
    return {
      x: o.x, y: o.y, r: o.r || 14, dead: false, id: 'pl:' + id, uid: id, _pl: true,
      bodyH: o.bodyH || 28,
      cy() { return this.y; }
    };
  }

  /** Blancos de mira de este lanzador: el rival, nunca él mismo. */
  function marks(who) {
    return foePlayers(who).map(asMark);
  }

  let rejected = 0;
  const paidDeath = {};

  function poke(uid, dmg, attacker) {
    attacker = attacker || meId();
    if (!on || !uid || attacker === uid) { if (attacker === uid) rejected++; return; }
    const atk = castles.find(c => c.uid === attacker);
    if (atk && atk.hp <= 0) return;
    const vic = castles.find(c => c.uid === uid);
    if (vic && vic.hp <= 0) return;
    dmg = Math.max(1, Math.min(PLAYER_CAP, Math.round(+dmg || 0)));
    const body = people().find(o => (o.uid || 'me') === uid);
    if (!body || body.dead) return;
    if ((body.spawnGuard || 0) > 0 || (body.reviveSafe || 0) > 0) return;
    // El daño lo aplica quien lo recibe. El anfitrión, si el blanco es otro, sólo avisa.
    if (!G.Coop.active || uid === meId()) {
      body._hitBy = attacker;
      if (body.hurt) body.hurt(dmg);
      return;
    }
    const ev = ['ph', uid, dmg, attacker];
    if (G.Coop.isHost) G.Coop.broadcast(ev);
    else if (attacker === meId()) G.Coop.toHost(ev);
  }

  /** Daña a los rivales de `who` que cumplan pred. Nunca al lanzador. */
  function strikePlayers(pred, dmg, who) {
    if (!on || ended || !pred) return;
    const uid = ownerId(who);
    for (const o of foePlayers(who)) {
      if ((o.uid || 'me') === uid) continue;
      if (pred(o)) poke(o.uid || 'me', dmg, uid);
    }
  }

  function smack(pl, reach, dmg) {
    if (!on || ended || !pl || pl.dead) return;
    const who = ownerId(pl);
    for (const c of castles) {
      if (c.uid === who || c.hp <= 0) continue;
      if (G.U.dist2(pl.x, pl.y, c.x, c.y) > (reach + c.r) * (reach + c.r)) continue;
      localHit(c, dmg, who);
    }
  }

  function strike(p) {
    if (!on || ended || !p || p.ghost || !p.friendly) return;
    if (!p.phits) p.phits = new Set();
    const who = p.owner ? ownerId(p.owner) : (p.ownerId || meId());
    for (const c of castles) {
      if (c.uid === who || c.hp <= 0) continue;
      const key = 'sg' + c.uid;
      if (p.phits.has(key)) continue;
      if (G.U.dist2(p.x, p.y, c.x, c.y) > (p.r + c.r) * (p.r + c.r)) continue;
      p.phits.add(key);
      localHit(c, p.dmg, who);
    }
    for (const o of foePlayers(who)) {
      const id = o.uid || 'me';
      if (id === who) continue;
      const key = 'pl' + id;
      if (p.phits.has(key)) continue;
      if (G.U.dist2(p.x, p.y, o.x, o.y) > (p.r + (o.r || 14)) * (p.r + (o.r || 14))) continue;
      p.phits.add(key);
      poke(id, p.dmg * 0.65, who);
    }
  }

  /**
   * A quién mira este jugador. Primero el rival, luego su castillo, sus monstruos
   * de avance, el jefe del centro y el resto. Nunca a sí mismo.
   */
  function pickAim(who, x, y, range) {
    const r2 = range * range;
    let best = null, bd = r2;
    for (const o of foePlayers(who)) {
      const d = G.U.dist2(x, y, o.x, o.y);
      if (d < bd) { bd = d; best = o; }
    }
    if (best) return asMark(best);
    const castle = target(x, y, range, who);
    if (castle) return castle;
    let push = null, boss = null, norm = null, pd = r2, bd2 = r2, nd = r2;
    for (const e of G.EnemyMgr.all()) {
      if (!e || e.dead || ally(e, who)) continue;
      const d = G.U.dist2(x, y, e.x, e.y);
      if (e.siegePush && d < pd) { pd = d; push = e; }
      else if (e.siegeBoss && d < bd2) { bd2 = d; boss = e; }
      else if (!e.siegeBoss && !e.siegePush && d < nd) { nd = d; norm = e; }
    }
    return push || boss || norm || null;
  }

  function grant(uid, xp, coins) {
    xp = Math.max(0, Math.round(+xp || 0));
    coins = Math.max(0, Math.round(+coins || 0));
    if (!uid || uid === 'rival' || (!xp && !coins)) return;
    if (uid === meId()) {
      const pl = G.Game.player;
      if (!pl) return;
      if (xp && G.Game.noteXp) G.Game.noteXp(pl.gainXp(xp));
      if (coins) pl.coins += coins;
      if (xp) G.FX.dmgText(pl.x, pl.y - pl.bodyH - 18, '+' + xp, '#7ec8ff');
      if (coins) G.FX.dmgText(pl.x, pl.y - pl.bodyH - 6, '+' + coins, '#ffd23f');
      return;
    }
    if (G.Coop.active && G.Coop.isHost) G.Coop.broadcast(['rw', uid, xp, coins]);
  }

  function grantItem(uid, id) {
    if (!uid || uid === 'rival' || !id) return;
    if (uid === meId()) { if (G.Game.giveItem) G.Game.giveItem(id); return; }
    if (G.Coop.active && G.Coop.isHost) G.Coop.broadcast(['it', uid, id]);
  }

  function onCreepDown(e) {
    if (!authority() || !e) return;
    const who = e.lastUid;
    if (e.noReward || !who || who === e.owner || who === 'rival') return;
    grant(who, 6, 0);
  }

  function noteBoss(uid, dmg) {
    if (!on || !authority() || !uid || uid === 'rival' || dmg <= 0) return;
    const n = Math.max(1, Math.round(dmg));
    bossByPlayer.set(uid, (bossByPlayer.get(uid) || 0) + n);
    bossByTeam.set(uid, (bossByTeam.get(uid) || 0) + n);
  }

  function roster() {
    const ids = castles.filter(c => c.uid !== 'rival' && c.hp > 0).map(c => c.uid);
    const out = [];
    const pl = G.Game && G.Game.player;
    if (pl && ids.includes(pl.uid || 'me')) out.push(pl);
    if (G.Coop.puppets) for (const o of G.Coop.puppets()) if (o && ids.includes(o.uid)) out.push(o);
    return out;
  }

  function averageLevel() {
    const people = roster();
    if (!people.length) return 1;
    let s = 0;
    for (const p of people) s += Math.max(1, p.level || 1);
    return s / people.length;
  }

  function payBoss(spawnIndex, maxHp) {
    if (bossPaid[spawnIndex]) return;
    const rewardId = 'boss:' + spawnIndex;
    if (G.CombatAuthority && !G.CombatAuthority.claimReward(rewardId)) return;
    bossPaid[spawnIndex] = true;
    const reward = G.PvpBoss.rewardFor(spawnIndex);
    if (!reward) return;
    const entries = [];
    for (const [uid, dmg] of bossByTeam) entries.push({ uid, dmg });
    const people = [];
    for (const [uid, dmg] of bossByPlayer) people.push({ uid, dmg });
    const team = G.PvpBoss.winningTeam(entries);
    const split = G.PvpBoss.splitCandy(reward.candy, people, maxHp);
    const valid = new Set(split.rows.map(r => r.uid));
    for (const uid of valid) grant(uid, reward.xp, 0);
    for (const row of split.rows) if (G.Game.grantCandy) G.Game.grantCandy(row.uid, row.candy);
    const castle = team && castles.find(c => c.uid === team && c.hp > 0);
    if (castle) {
      if (reward.kind === 'creep') castle.buffUntil = bossTime + 30;
      if (reward.kind === 'shield') castle.shield = (castle.shield || 0) + Math.round(castle.maxHp * 0.15);
      if (reward.kind === 'push') summonPush(castle, bossTime);
      const others = castles.filter(c => c !== castle && c.hp > 0);
      let lead = 0;
      for (const c of others) lead = Math.max(lead, c.hp / c.maxHp);
      if (others.length && castle.hp / castle.maxHp < lead) castle.shield = (castle.shield || 0) + Math.round(castle.maxHp * 0.10);
    }
    bossByPlayer = new Map();
    bossByTeam = new Map();
  }

  function onBossDown(e) {
    if (!authority() || !bossAlive) return;
    bossAlive = false;
    const index = bossSpawns - 1;
    payBoss(index, (e && e.maxHp) || 1);
    const cfg = bossCfg();
    if (bossSpawns < cfg.maxSpawnCount) {
      bossNextAt = bossTime + cfg.respawnDelay;
      bossWarned = false;
    }
  }

  /** Cualquier muerte en un 1 contra 1: el único rival se lleva la experiencia, una vez. */
  function noteDeath(victim) {
    if (!on || !victim || victim.remote || victim._siegeXp) return;
    const id = victim.uid || 'me';
    const attacker = victim._hitBy || '';
    victim._hitBy = '';
    if (attacker === id) { rejected++; return; }
    victim._siegeXp = true;
    if (!authority()) { G.Coop.toHost(['pd', id, attacker]); return; }
    payDeath(id, attacker);
  }

  function payDeath(victim, attacker) {
    if (!on || !victim || paidDeath[victim] || attacker === victim) {
      if (attacker === victim) rejected++;
      return;
    }
    paidDeath[victim] = true;
    const human = castles.some(c => c.uid === attacker);
    if (human) { playerDown(attacker, victim); return; }
    if (castles.filter(c => c.uid !== 'rival').length !== 2) return;
    const opp = castles.find(c => c.uid !== 'rival' && c.uid !== victim);
    if (opp) grant(opp.uid, 48, 0);
  }

  /** Matar a un jugador: experiencia, y un golpe a su castillo. Menos si es siempre el mismo. */
  function playerDown(attacker, victim) {
    if (!on || !attacker || !victim || attacker === victim || attacker === 'rival') return;
    if (G.Coop.active && !G.Coop.isHost) { G.Coop.toHost(['pk', attacker, victim]); return; }
    const key = attacker + '|' + victim;
    const n = pk[key] || 0;
    pk[key] = n + 1;
    grant(attacker, n === 0 ? 48 : n === 1 ? 28 : 14, 0);
    applyHit(victim, KILL_CASTLE, attacker);
  }

  function owned(uid) {
    let n = 0;
    for (const e of G.EnemyMgr.all()) if (!e.dead && e.siegeCreep && e.owner === uid) n++;
    return n;
  }

  function summon(c, time) {
    const SKIP = new Set(['thief', 'healer', 'shielder', 'summoner', 'bomber']);
    let bag = G.Enemies.bagAt(Math.min(160, time || 0)).filter(d => !SKIP.has(d.behavior));
    if (!bag.length) bag = G.Enemies.bagAt(0);
    const def = G.U.pick(bag);
    const d = Math.hypot(c.x, c.y) || 1;
    const dist = 56 + Math.random() * 16;
    const x = G.U.clamp(c.x - c.x / d * dist, -HALF + 24, HALF - 24);
    const y = G.U.clamp(c.y - c.y / d * dist, -HALF + 24, HALF - 24);
    const e = new G.Enemy(def, x, y, { hp: 1, dmg: 1, spd: 1 });
    const grow = Math.floor((time || 0) / 45);
    e.maxHp = e.hp = Math.round(18 + grow * 6);
    e.dmg = 4 + grow;
    e.spd = 64;
    e.xp = 6;
    e.flying = true;
    e.owner = c.uid;
    e.ring = c.color;
    e.siegeCreep = true;
    if ((c.buffUntil || 0) > (time || 0)) {
      e.maxHp = e.hp = Math.round(e.maxHp * 1.2);
      e.dmg *= 1.2;
    }
    G.EnemyMgr.add(e);
    return e;
  }

  function summonPush(c, time) {
    const e = summon(c, time);
    if (!e) return;
    e.siegePush = true;
    e.maxHp = e.hp = Math.round(e.maxHp * 2.2);
    e.dmg *= 1.8;
  }

  function spawnCenterBoss() {
    const cfg = bossCfg();
    const index = bossSpawns;
    const count = Math.max(1, roster().length);
    const avg = averageLevel();
    const def = G.Enemies.bossMob(0);
    const e = new G.Enemy(def, 0, 0, { hp: 1, dmg: 1, spd: 1 }, true);
    e.maxHp = e.hp = G.PvpBoss.calculatePvpBossHp(count, avg, index);
    e.dmg = G.PvpBoss.calculatePvpBossDamage(avg, index);
    e.spd = 68;
    e.xp = 0;
    e.siegeBoss = true;
    G.EnemyMgr.add(e);
    bossSpawns += 1;
    bossAlive = true;
    bossByPlayer = new Map();
    bossByTeam = new Map();
    bossWarn = 0;
    if (G.Spawner) G.Spawner.say('¡Jefe en el centro! Sólo ataca a jugadores.', 3.4);
    G.Audio.sfx('boss');
    G.Camera.kick(1.1);
  }

  function maybeBoss(time) {
    bossTime = time || 0;
    if (bossAlive || bossSpawns >= bossCfg().maxSpawnCount) { bossWarn = 0; return; }
    const cfg = bossCfg();
    const warnAt = bossNextAt - cfg.warningSeconds;
    if (bossTime < warnAt) { bossWarn = 0; return; }
    if (bossTime < bossNextAt) {
      bossWarn = Math.max(0, bossNextAt - bossTime);
      if (!bossWarned) {
        bossWarned = true;
        if (G.Spawner) G.Spawner.say('El jefe del centro llega en 10 s. Sólo ataca a jugadores.', 3.5);
      }
      return;
    }
    bossWarned = false;
    spawnCenterBoss();
  }

  function creepTouch(dt) {
    for (const e of G.EnemyMgr.all()) {
      if (!on || e.dead || e.remote || !e.siegeCreep) continue;
      if ((e.castleCd || 0) > 0) { e.castleCd -= dt; continue; }
      for (const c of castles) {
        if (c.uid === e.owner || c.hp <= 0) continue;
        const reach = e.r + c.r;
        if (G.U.dist2(e.x, e.y, c.x, c.y) > reach * reach) continue;
        e.castleCd = 0.5;
        applyHit(c.uid, Math.max(2, Math.round(e.dmg)), e.owner);
        if (!on || ended || e.dead) return;
        break;
      }
    }
  }

  /** Los monstruos de castillos distintos se pegan entre ellos. */
  function creepFight() {
    const creeps = [];
    for (const e of G.EnemyMgr.all()) if (!e.dead && !e.remote && e.siegeCreep) creeps.push(e);
    for (const e of creeps) {
      if (e.dead || (e.creepCd || 0) > 0) continue;
      let best = null, bd = Infinity;
      for (const o of creeps) {
        if (o === e || o.dead || o.owner === e.owner) continue;
        const reach = e.r + o.r;
        const d = G.U.dist2(e.x, e.y, o.x, o.y);
        if (d > reach * reach || d >= bd) continue;
        bd = d; best = o;
      }
      if (!best) continue;
      e.creepCd = 0.5;
      const prev = best.lastUid;
      best.hurt(Math.max(2, Math.round(e.dmg)), '#ffb0b0', best.x - e.x, best.y - e.y, 30);
      if (best.lastUid !== prev && !best.dead) best.lastUid = prev;
    }
  }

  function watchGuards(dt) {
    const list = [];
    if (G.Game && G.Game.player) list.push(G.Game.player);
    if (G.Coop.puppets) for (const o of G.Coop.puppets()) if (o) list.push(o);
    for (const p of list) {
      const id = p.uid || 'me';
      if (sawDead[id] && !p.dead) { p.spawnGuard = 2; delete paidDeath[id]; p._siegeXp = false; }
      sawDead[id] = !!p.dead;
      if (p.spawnGuard > 0) p.spawnGuard -= dt;
    }
  }

  function tickWorld(dt, time) {
    if (!on) return;
    for (const c of castles) {
      if (!on || c.hp <= 0) continue;
      c.spawnT -= dt;
      if (c.spawnT > 0) continue;
      if (owned(c.uid) >= CREEP_CAP) { c.spawnT = 0.45; continue; }
      c.spawnT = 1.65;
      summon(c, time);
    }
    if (on) watchGuards(dt);
    if (on) creepTouch(dt);
    if (on) creepFight();
    if (on) maybeBoss(time);
  }

  function tick(dt, pl, time) {
    if (!on || !pl || (G.Rift && G.Rift.inArena)) return;
    const mine = castles.find(x => x.uid === meId());
    const out = !!(mine && mine.hp <= 0);
    if (out) {
      if (!pl.dead) knockLocal();
    } else if (pl.dead) {
      respawnT += dt;
      if (respawnT >= RESPAWN) {
        if (mine) placeAt(pl, mine);
        pl.revive(1);
        respawnT = 0;
      }
    } else {
      respawnT = 0;
      for (const c of castles) if (c.cd > 0) c.cd -= dt;
      bumpT -= dt;
      const who = meId();
      for (const c of castles) {
        if (!on || c.uid === who || c.hp <= 0 || c.cd > 0) continue;
        if (G.U.dist2(pl.x, pl.y, c.x, c.y) > (pl.r + c.r) * (pl.r + c.r)) continue;
        c.cd = 0.45;
        localHit(c, 8 + pl.level * 2);
      }
      if (on && G.Coop.active && bumpT <= 0) {
        for (const o of G.Coop.puppets()) {
          if (o.dead) continue;
          if (G.U.dist2(pl.x, pl.y, o.x, o.y) > (pl.r + o.r) * (pl.r + o.r)) continue;
          bumpT = 0.55;
          poke(o.uid, 6 + pl.level * 1.5);
          break;
        }
      }
    }
    if (on && authority()) tickWorld(dt, time || 0);
  }

  /** A quién va este monstruo. El jefe, al jugador vivo más cercano. Los demás, a otro castillo, jugador o monstruo, nunca a los suyos. */
  function aimFor(e, players) {
    if (!on || !e || e.dead) return null;
    if (e.siegeBoss) {
      let best = null, bd = Infinity;
      for (const p of players) {
        if (!p || p.dead) continue;
        if ((p.reviveSafe || 0) > 0 || (p.spawnGuard || 0) > 0) continue;
        const d = G.U.dist2(e.x, e.y, p.x, p.y);
        if (d < bd) { bd = d; best = p; }
      }
      return best;
    }
    if (e.siegePush) {
      let best = null, bd = Infinity;
      for (const c of castles) {
        if (c.uid === e.owner || c.hp <= 0) continue;
        const d = G.U.dist2(e.x, e.y, c.x, c.y);
        if (d < bd) { bd = d; best = c; }
      }
      if (!best) return null;
      return { x: best.x, y: best.y, r: best.r, dead: false, level: 1, _vx: 0, _vy: 0, hurt() {} };
    }
    if (!e.siegeCreep) return null;
    let best = null, bd = Infinity, castle = false;
    for (const c of castles) {
      if (c.uid === e.owner || c.hp <= 0) continue;
      const d = G.U.dist2(e.x, e.y, c.x, c.y);
      if (d < bd) { bd = d; best = c; castle = true; }
    }
    for (const p of players) {
      if (!p || p.dead) continue;
      if ((p.uid || 'me') === e.owner) continue;
      const d = G.U.dist2(e.x, e.y, p.x, p.y);
      if (d < bd) { bd = d; best = p; castle = false; }
    }
    for (const o of G.EnemyMgr.all()) {
      if (!o || o.dead || o === e || !o.siegeCreep || o.owner === e.owner) continue;
      const d = G.U.dist2(e.x, e.y, o.x, o.y);
      if (d < bd) { bd = d; best = o; castle = false; }
    }
    if (!best) return null;
    if (!castle) return best;
    return { x: best.x, y: best.y, r: best.r, dead: false, level: 1, _vx: 0, _vy: 0, hurt() {} };
  }

  function net(list) {
    if (!on || !list) return;
    list.forEach((pair, i) => {
      if (!pair) return;
      if (pair[0] === 'w') { bossWarn = Math.max(0, +pair[1] || 0); return; }
      if (!castles[i]) return;
      castles[i].hp = Math.max(0, +pair[0] || 0);
      castles[i].maxHp = Math.max(1, +pair[1] || castles[i].maxHp);
      castles[i].shield = Math.max(0, +pair[2] || 0);
    });
  }

  function snapshot() {
    const rows = castles.map(c => [Math.ceil(c.hp), Math.ceil(c.maxHp), Math.ceil(c.shield || 0)]);
    rows.push(['w', Math.ceil(bossWarn || 0)]);
    return rows;
  }

  function target(x, y, range, who) {
    if (!on || ended) return null;
    who = ownerId(who);
    let best = null, bd = range * range;
    for (const c of castles) {
      if (c.uid === who || c.hp <= 0) continue;
      const d = G.U.dist2(x, y, c.x, c.y);
      if (d < bd) { bd = d; best = c; }
    }
    return best ? { x: best.x, y: best.y, r: best.r, dead: false } : null;
  }

  function drawOne(ctx, c) {
    const H = 46;
    const ready = img && img.complete && img.naturalWidth;
    const W = ready ? Math.round(H * img.naturalWidth / img.naturalHeight) : 96;
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.fillStyle = c.color;
    ctx.globalAlpha = 0.28;
    ctx.beginPath();
    ctx.ellipse(0, -1, 34, 10, 0, 0, 6.2832);
    ctx.fill();
    ctx.globalAlpha = c.hp <= 0 ? 0.4 : 1;
    ctx.fillStyle = 'rgba(0,0,0,.34)';
    ctx.beginPath();
    ctx.ellipse(0, 0, 28, 7, 0, 0, 6.2832);
    ctx.fill();
    if (ready) {
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(img, -W / 2, -H, W, H);
      ctx.imageSmoothingEnabled = false;
    }
    const frac = c.maxHp > 0 ? c.hp / c.maxHp : 0;
    const bw = 54, by = -H - 6;
    ctx.fillStyle = 'rgba(0,0,0,.6)';
    ctx.fillRect(-bw / 2, by, bw, 3.4);
    ctx.fillStyle = frac > 0.35 ? '#5fe08a' : '#ff5f6d';
    ctx.fillRect(-bw / 2, by, bw * frac, 3.4);
    if (c.shield > 0 && c.maxHp > 0) {
      const sh = Math.min(1 - frac, c.shield / c.maxHp);
      ctx.fillStyle = '#8fd4ff';
      ctx.fillRect(-bw / 2 + bw * frac, by, bw * sh, 3.4);
    }
    ctx.font = '700 8px Pixelify,"Segoe UI",system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(0,0,0,.8)';
    ctx.strokeText(c.name, 0, by - 2);
    ctx.fillStyle = c.color;
    ctx.fillText(c.name, 0, by - 2);
    ctx.restore();
  }

  function drawBorder(ctx) {
    if (!on) return;
    const B = 2400;
    ctx.save();
    ctx.fillStyle = 'rgba(6,14,8,.72)';
    ctx.fillRect(-HALF - B, -HALF - B, HALF * 2 + B * 2, B);
    ctx.fillRect(-HALF - B, HALF, HALF * 2 + B * 2, B);
    ctx.fillRect(-HALF - B, -HALF, B, HALF * 2);
    ctx.fillRect(HALF, -HALF, B, HALF * 2);
    ctx.strokeStyle = '#e2b657';
    ctx.lineWidth = 8;
    ctx.strokeRect(-HALF, -HALF, HALF * 2, HALF * 2);
    if (bossWarn > 0) {
      const n = Math.max(1, Math.ceil(bossWarn));
      const text = G.I18n && G.I18n.f ? G.I18n.f('Jefe del centro: {x}', n) : ('Jefe del centro: ' + n);
      ctx.font = '700 14px Pixelify,"Segoe UI",system-ui,sans-serif';
      ctx.textAlign = 'center';
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(0,0,0,.8)';
      ctx.strokeText(text, 0, -HALF + 28);
      ctx.fillStyle = '#9fd4ff';
      ctx.fillText(text, 0, -HALF + 28);
    }
    ctx.restore();
  }

  function drawables() {
    if (!on) return [];
    return castles.map(c => ({ y: c.y, ent: { draw(ctx) { drawOne(ctx, c); } } }));
  }

  return {
    begin, end, clamp, contain, smack, strike, strikePlayers, marks, pickAim, tick, net, snapshot, target, aimFor, drawBorder, drawables, applyHit,
    onCreepDown, onBossDown, noteBoss, noteDeath, payDeath, playerDown, ally, knockOut,
    get up() { return on; },
    get half() { return HALF; },
    bossSoon() { return bossWarn > 0 ? bossWarn : 0; },
    self() {
      const c = castles.find(x => x.uid === meId());
      return c ? { hp: c.hp, maxHp: c.maxHp, shield: c.shield || 0, name: c.name } : null;
    }
  };
})();

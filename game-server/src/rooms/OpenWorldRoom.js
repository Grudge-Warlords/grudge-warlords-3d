const colyseus = require('colyseus');

/**
 * OpenWorldRoom — main game room for multiplayer.
 *
 * Systems:
 *   Movement, Attack, Chat, Zone Change, Ability (existing)
 *   Party (invite/accept/leave/kick — max 5)
 *   Guild (create/invite/accept/leave — max 50)
 *   Trade (request/offer/accept/cancel — 2 players)
 *   Duel (request/accept/decline — PvP)
 *   Inspect (request → response)
 */
class OpenWorldRoom extends colyseus.Room {

  maxClients = 50;
  players = new Map();
  parties = new Map();
  nextPartyId = 1;
  guilds = new Map();
  nextGuildId = 1;
  activeTrades = new Map();
  nextTradeId = 1;
  activeDuels = new Map();
  nextDuelId = 1;

  onCreate(options) {
    console.log(`[OpenWorldRoom] created — maxClients=${this.maxClients}`);

    // ── Movement ──
    this.onMessage('move', (client, data) => {
      const p = this.players.get(client.sessionId);
      if (!p) return;
      p.x = data.x ?? p.x; p.y = data.y ?? p.y;
      p.facing = data.facing ?? p.facing;
      p.animState = data.animState ?? p.animState;
      p.hp = data.hp ?? p.hp; p.maxHp = data.maxHp ?? p.maxHp;
      p.level = data.level ?? p.level;
      this.broadcast('player_move', {
        sessionId: client.sessionId, x: p.x, y: p.y,
        facing: p.facing, animState: p.animState,
        hp: p.hp, maxHp: p.maxHp, level: p.level,
      }, { except: client });
    });

    // ── Attack ──
    this.onMessage('attack', (client, data) => {
      this.broadcast('player_attack', {
        sessionId: client.sessionId, targetId: data.targetId, damage: data.damage,
      }, { except: client });
    });

    // ── Chat ──
    this.onMessage('chat', (client, data) => {
      const p = this.players.get(client.sessionId);
      if (!p) return;
      const text = typeof data.text === 'string' ? data.text.trim() : '';
      if (!text || text.length > 500) return;
      this.broadcast('chat', { sender: p.name, text, timestamp: Date.now(), type: data.channel || 'chat' });
    });

    // ── Zone change ──
    this.onMessage('zone_change', (client, data) => {
      const p = this.players.get(client.sessionId);
      if (!p) return;
      p.zoneId = data.zoneId;
      this.broadcast('zone_change', { sessionId: client.sessionId, zoneId: data.zoneId }, { except: client });
    });

    // ── Ability ──
    this.onMessage('ability', (client, data) => {
      this.broadcast('ability_use', {
        sessionId: client.sessionId, abilityIndex: data.abilityIndex,
        targetX: data.targetX, targetY: data.targetY,
      }, { except: client });
    });

    // ═══════════════════════ PARTY (max 5) ═══════════════════════

    this.onMessage('party_invite', (client, data) => {
      const sender = this.players.get(client.sessionId);
      const tc = this._client(data.targetSessionId);
      if (!sender || !tc || data.targetSessionId === client.sessionId) return;
      const tp = this.players.get(data.targetSessionId);
      if (tp?.partyId) { client.send('party_error', { message: `${tp.name} is already in a party` }); return; }
      if (!sender.partyId) {
        const id = this.nextPartyId++;
        this.parties.set(id, { id, leader: client.sessionId, members: [client.sessionId] });
        sender.partyId = id;
      }
      const party = this.parties.get(sender.partyId);
      if (!party || party.leader !== client.sessionId) { client.send('party_error', { message: 'Only leader can invite' }); return; }
      if (party.members.length >= 5) { client.send('party_error', { message: 'Party full (5/5)' }); return; }
      tc.send('party_invite', { partyId: party.id, fromSessionId: client.sessionId, fromName: sender.name });
    });

    this.onMessage('party_accept', (client, data) => {
      const party = this.parties.get(data.partyId);
      const p = this.players.get(client.sessionId);
      if (!party || party.members.length >= 5 || !p || p.partyId) return;
      party.members.push(client.sessionId);
      p.partyId = party.id;
      this._partyBroadcast(party.id);
    });

    this.onMessage('party_leave', (client) => { this._partyRemove(client.sessionId); });

    this.onMessage('party_kick', (client, data) => {
      const p = this.players.get(client.sessionId);
      if (!p?.partyId) return;
      const party = this.parties.get(p.partyId);
      if (!party || party.leader !== client.sessionId || data.targetSessionId === client.sessionId) return;
      this._partyRemove(data.targetSessionId);
    });

    // ═══════════════════════ GUILD (max 50) ═══════════════════════

    this.onMessage('guild_create', (client, data) => {
      const p = this.players.get(client.sessionId);
      if (!p) return;
      if (p.guildId) { client.send('guild_error', { message: 'Already in a guild' }); return; }
      const name = (data.name || '').trim(), tag = (data.tag || '').trim().toUpperCase();
      if (name.length < 2 || name.length > 24 || tag.length < 2 || tag.length > 5) {
        client.send('guild_error', { message: 'Name 2-24, tag 2-5 chars' }); return;
      }
      const id = this.nextGuildId++;
      this.guilds.set(id, { id, name, tag, leader: client.sessionId, members: [{ sessionId: client.sessionId, name: p.name, rank: 'leader' }], createdAt: Date.now() });
      p.guildId = id;
      client.send('guild_update', this._guildState(id));
    });

    this.onMessage('guild_invite', (client, data) => {
      const p = this.players.get(client.sessionId);
      if (!p?.guildId) return;
      const g = this.guilds.get(p.guildId);
      if (!g || g.leader !== client.sessionId) { client.send('guild_error', { message: 'Only leader can invite' }); return; }
      if (g.members.length >= 50) { client.send('guild_error', { message: 'Guild full' }); return; }
      const tc = this._client(data.targetSessionId), tp = this.players.get(data.targetSessionId);
      if (!tc || !tp) return;
      if (tp.guildId) { client.send('guild_error', { message: `${tp.name} already in a guild` }); return; }
      tc.send('guild_invite', { guildId: g.id, guildName: g.name, guildTag: g.tag, fromName: p.name });
    });

    this.onMessage('guild_accept', (client, data) => {
      const g = this.guilds.get(data.guildId), p = this.players.get(client.sessionId);
      if (!g || g.members.length >= 50 || !p || p.guildId) return;
      g.members.push({ sessionId: client.sessionId, name: p.name, rank: 'member' });
      p.guildId = g.id;
      this._guildBroadcast(g.id);
    });

    this.onMessage('guild_leave', (client) => { this._guildRemove(client.sessionId); });

    // ═══════════════════════ TRADE (2 players) ═══════════════════

    this.onMessage('trade_request', (client, data) => {
      const sender = this.players.get(client.sessionId);
      const tc = this._client(data.targetSessionId);
      if (!sender || !tc) return;
      const id = this.nextTradeId++;
      this.activeTrades.set(id, { id, from: client.sessionId, to: data.targetSessionId, fromOffer: { items: [], gold: 0 }, toOffer: { items: [], gold: 0 }, fromAccepted: false, toAccepted: false });
      tc.send('trade_request', { tradeId: id, fromSessionId: client.sessionId, fromName: sender.name });
      client.send('trade_started', { tradeId: id, withName: this.players.get(data.targetSessionId)?.name || 'Player' });
    });

    this.onMessage('trade_accept_request', (client, data) => {
      const t = this.activeTrades.get(data.tradeId);
      if (!t || t.to !== client.sessionId) return;
      // Target accepted the trade request — open trade window for both
      const fc = this._client(t.from), tc = this._client(t.to);
      const state = { tradeId: t.id, fromOffer: t.fromOffer, toOffer: t.toOffer, fromAccepted: false, toAccepted: false };
      if (fc) fc.send('trade_update', state);
      if (tc) tc.send('trade_update', state);
    });

    this.onMessage('trade_offer', (client, data) => {
      const t = this.activeTrades.get(data.tradeId);
      if (!t) return;
      t.fromAccepted = false; t.toAccepted = false;
      if (t.from === client.sessionId) t.fromOffer = { items: data.items || [], gold: data.gold || 0 };
      else if (t.to === client.sessionId) t.toOffer = { items: data.items || [], gold: data.gold || 0 };
      else return;
      const state = { tradeId: t.id, fromOffer: t.fromOffer, toOffer: t.toOffer, fromAccepted: t.fromAccepted, toAccepted: t.toAccepted };
      const fc = this._client(t.from), tc = this._client(t.to);
      if (fc) fc.send('trade_update', state);
      if (tc) tc.send('trade_update', state);
    });

    this.onMessage('trade_accept', (client, data) => {
      const t = this.activeTrades.get(data.tradeId);
      if (!t) return;
      if (t.from === client.sessionId) t.fromAccepted = true;
      if (t.to === client.sessionId) t.toAccepted = true;
      if (t.fromAccepted && t.toAccepted) {
        const fc = this._client(t.from), tc = this._client(t.to);
        if (fc) fc.send('trade_complete', { tradeId: t.id, yourOffer: t.fromOffer, theirOffer: t.toOffer });
        if (tc) tc.send('trade_complete', { tradeId: t.id, yourOffer: t.toOffer, theirOffer: t.fromOffer });
        this.activeTrades.delete(t.id);
      } else {
        const state = { tradeId: t.id, fromOffer: t.fromOffer, toOffer: t.toOffer, fromAccepted: t.fromAccepted, toAccepted: t.toAccepted };
        const fc = this._client(t.from), tc = this._client(t.to);
        if (fc) fc.send('trade_update', state);
        if (tc) tc.send('trade_update', state);
      }
    });

    this.onMessage('trade_cancel', (client, data) => {
      const t = this.activeTrades.get(data.tradeId);
      if (!t) return;
      const fc = this._client(t.from), tc = this._client(t.to);
      if (fc) fc.send('trade_cancelled', { tradeId: t.id });
      if (tc) tc.send('trade_cancelled', { tradeId: t.id });
      this.activeTrades.delete(t.id);
    });

    // ═══════════════════════ DUEL ═══════════════════════════════

    this.onMessage('duel_request', (client, data) => {
      const sender = this.players.get(client.sessionId);
      const tc = this._client(data.targetSessionId);
      if (!sender || !tc) return;
      const id = this.nextDuelId++;
      this.activeDuels.set(id, { id, challenger: client.sessionId, target: data.targetSessionId, state: 'pending' });
      tc.send('duel_request', { duelId: id, fromSessionId: client.sessionId, fromName: sender.name });
    });

    this.onMessage('duel_accept', (client, data) => {
      const d = this.activeDuels.get(data.duelId);
      if (!d || d.target !== client.sessionId || d.state !== 'pending') return;
      d.state = 'active';
      const cName = this.players.get(d.challenger)?.name || 'Player';
      const tName = this.players.get(d.target)?.name || 'Player';
      const c1 = this._client(d.challenger), c2 = this._client(d.target);
      if (c1) c1.send('duel_start', { duelId: d.id, opponentName: tName, opponentSessionId: d.target });
      if (c2) c2.send('duel_start', { duelId: d.id, opponentName: cName, opponentSessionId: d.challenger });
      this.broadcast('chat', { sender: 'System', text: `⚔ DUEL: ${cName} vs ${tName}!`, timestamp: Date.now(), type: 'system' });
    });

    this.onMessage('duel_decline', (client, data) => {
      const d = this.activeDuels.get(data.duelId);
      if (!d || d.target !== client.sessionId) return;
      const c = this._client(d.challenger);
      if (c) c.send('duel_declined', { duelId: d.id, byName: this.players.get(client.sessionId)?.name || 'Player' });
      this.activeDuels.delete(d.id);
    });

    this.onMessage('duel_end', (client, data) => {
      const d = this.activeDuels.get(data.duelId);
      if (!d || d.state !== 'active') return;
      const wName = this.players.get(data.winnerSessionId)?.name || 'Player';
      const lSid = data.winnerSessionId === d.challenger ? d.target : d.challenger;
      const lName = this.players.get(lSid)?.name || 'Player';
      const result = { duelId: d.id, winner: data.winnerSessionId, winnerName: wName, loserName: lName };
      const c1 = this._client(d.challenger), c2 = this._client(d.target);
      if (c1) c1.send('duel_result', result);
      if (c2) c2.send('duel_result', result);
      this.broadcast('chat', { sender: 'System', text: `⚔ ${wName} defeated ${lName}!`, timestamp: Date.now(), type: 'system' });
      this.activeDuels.delete(d.id);
    });

    // ═══════════════════════ INSPECT ═══════════════════════════

    this.onMessage('inspect_request', (client, data) => {
      const tp = this.players.get(data.targetSessionId);
      if (!tp) return;
      const g = tp.guildId ? this.guilds.get(tp.guildId) : null;
      client.send('inspect_result', {
        sessionId: data.targetSessionId, name: tp.name, race: tp.race, heroClass: tp.heroClass,
        level: tp.level, hp: tp.hp, maxHp: tp.maxHp,
        guildName: g?.name || null, guildTag: g?.tag || null,
        equipment: tp.equipment || {},
      });
    });

    this.onMessage('equipment_update', (client, data) => {
      const p = this.players.get(client.sessionId);
      if (p) p.equipment = data.equipment || {};
    });
  }

  onJoin(client, options) {
    const player = {
      sessionId: client.sessionId, name: options.name || 'Adventurer',
      race: options.race || 'Human', heroClass: options.heroClass || 'Warrior',
      level: options.level || 1, x: 0, y: 0, facing: 0,
      animState: 'idle', animTimer: 0, hp: 100, maxHp: 100,
      zoneId: 0, partyId: null, guildId: null, equipment: {},
    };
    this.players.set(client.sessionId, player);
    for (const [sid, p] of this.players) { if (sid !== client.sessionId) client.send('player_joined', p); }
    this.broadcast('player_joined', player, { except: client });
    console.log(`[OpenWorldRoom] ${player.name} joined (${client.sessionId}) — ${this.players.size} players`);
  }

  onLeave(client) {
    const p = this.players.get(client.sessionId);
    this._partyRemove(client.sessionId);
    this._guildRemove(client.sessionId);
    this._cancelTrades(client.sessionId);
    this._cancelDuels(client.sessionId);
    this.players.delete(client.sessionId);
    this.broadcast('player_left', { sessionId: client.sessionId });
    if (p) console.log(`[OpenWorldRoom] ${p.name} left — ${this.players.size} players`);
  }

  onDispose() { console.log('[OpenWorldRoom] disposed'); }

  // ── Helpers ──

  _client(sid) { for (const c of this.clients) { if (c.sessionId === sid) return c; } return null; }

  _partyBroadcast(pid) {
    const party = this.parties.get(pid);
    if (!party) return;
    const state = { id: party.id, leader: party.leader, members: party.members.map(sid => { const p = this.players.get(sid); return { sessionId: sid, name: p?.name || '?', heroClass: p?.heroClass || 'Warrior', level: p?.level || 1, hp: p?.hp || 0, maxHp: p?.maxHp || 100 }; }) };
    for (const sid of party.members) { const c = this._client(sid); if (c) c.send('party_update', state); }
  }

  _guildBroadcast(gid) {
    const g = this.guilds.get(gid);
    if (!g) return;
    const state = this._guildState(gid);
    for (const m of g.members) { const c = this._client(m.sessionId); if (c) c.send('guild_update', state); }
  }

  _guildState(gid) {
    const g = this.guilds.get(gid);
    if (!g) return null;
    return { id: g.id, name: g.name, tag: g.tag, leader: g.leader, members: g.members.map(m => { const p = this.players.get(m.sessionId); return { sessionId: m.sessionId, name: m.name, rank: m.rank, online: !!p, level: p?.level || 0, heroClass: p?.heroClass || '' }; }), memberCount: g.members.length };
  }

  _partyRemove(sid) {
    const p = this.players.get(sid);
    if (!p?.partyId) return;
    const party = this.parties.get(p.partyId);
    if (!party) { p.partyId = null; return; }
    party.members = party.members.filter(s => s !== sid);
    p.partyId = null;
    const c = this._client(sid); if (c) c.send('party_update', null);
    if (party.members.length === 0) { this.parties.delete(party.id); }
    else { if (party.leader === sid) party.leader = party.members[0]; this._partyBroadcast(party.id); }
  }

  _guildRemove(sid) {
    const p = this.players.get(sid);
    if (!p?.guildId) return;
    const g = this.guilds.get(p.guildId);
    if (!g) { p.guildId = null; return; }
    g.members = g.members.filter(m => m.sessionId !== sid);
    p.guildId = null;
    if (g.members.length === 0) { this.guilds.delete(g.id); }
    else { if (g.leader === sid) g.leader = g.members[0].sessionId; this._guildBroadcast(g.id); }
  }

  _cancelTrades(sid) {
    for (const [id, t] of this.activeTrades) {
      if (t.from === sid || t.to === sid) {
        const other = t.from === sid ? t.to : t.from;
        const c = this._client(other); if (c) c.send('trade_cancelled', { tradeId: id });
        this.activeTrades.delete(id);
      }
    }
  }

  _cancelDuels(sid) {
    for (const [id, d] of this.activeDuels) {
      if (d.challenger === sid || d.target === sid) {
        const other = d.challenger === sid ? d.target : d.challenger;
        const c = this._client(other); if (c) c.send('duel_result', { duelId: id, winner: other, winnerName: 'Opponent left', loserName: '' });
        this.activeDuels.delete(id);
      }
    }
  }
}

module.exports = { OpenWorldRoom };

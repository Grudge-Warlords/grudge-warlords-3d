/**
 * Social UI Overlays — rendered on top of the open-world game canvas.
 * Includes: PlayerInteractMenu, PartyFrames, TradeWindow, InspectPanel.
 */
import { useState } from 'react';
import {
  type InteractMenuState, type InteractOption,
  INTERACT_OPTION_META, closeInteractMenu,
  sendPartyInvite, sendGuildInvite, sendTradeRequest,
  sendDuelRequest, sendInspectRequest,
  sendPartyLeave, sendTradeAccept, sendTradeCancel, sendTradeOffer,
  sendDuelAccept, sendDuelDecline,
  sendGuildCreate, sendGuildLeave,
} from '@/game/player-interact';
import { CLASS_COLORS } from '@/game/types';

const FONT = "'Oxanium', sans-serif";

// ═══════════════════════════════════════════════════════════════
// PLAYER INTERACT MENU (popup when E near another player)
// ═══════════════════════════════════════════════════════════════

export function PlayerInteractMenu({ menu, onClose }: {
  menu: InteractMenuState;
  onClose: () => void;
}) {
  if (!menu.open || !menu.target) return null;
  const t = menu.target;

  const handleOption = (opt: InteractOption) => {
    if (!t) return;
    switch (opt) {
      case 'trade': sendTradeRequest(t.sessionId); break;
      case 'party_invite': sendPartyInvite(t.sessionId); break;
      case 'guild_invite': sendGuildInvite(t.sessionId); break;
      case 'duel': sendDuelRequest(t.sessionId); break;
      case 'inspect': sendInspectRequest(t.sessionId); break;
    }
    onClose();
  };

  return (
    <div style={{
      position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
      zIndex: 100, fontFamily: FONT,
    }}>
      <div style={{
        background: 'linear-gradient(to bottom, rgba(15,10,5,0.97), rgba(8,5,0,0.97))',
        border: '2px solid #c5a059', borderRadius: 10, padding: '12px 16px', minWidth: 200,
        boxShadow: '0 8px 30px rgba(0,0,0,0.8), 0 0 8px rgba(197,160,89,0.2)',
      }}>
        {/* Target info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, borderBottom: '1px solid #333', paddingBottom: 8 }}>
          <div style={{
            width: 28, height: 28, borderRadius: '50%',
            background: `linear-gradient(135deg, ${CLASS_COLORS[t.heroClass] || '#888'}, ${CLASS_COLORS[t.heroClass] || '#888'}88)`,
            border: '2px solid #c5a059', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 700, color: '#fff',
          }}>{t.heroClass[0]}</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: CLASS_COLORS[t.heroClass] || '#ddd' }}>{t.name}</div>
            <div style={{ fontSize: 9, color: '#888' }}>Lv{t.level} {t.race} {t.heroClass}{t.isAI ? ' (AI)' : ''}</div>
          </div>
        </div>

        {/* Options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {menu.options.map(opt => {
            const meta = INTERACT_OPTION_META[opt];
            return (
              <button key={opt} onClick={() => handleOption(opt)} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '6px 10px', borderRadius: 6, border: `1px solid ${meta.color}30`,
                background: `${meta.color}08`, color: meta.color,
                cursor: 'pointer', fontSize: 11, fontWeight: 600, fontFamily: FONT,
                transition: 'all 0.15s',
              }}
                onMouseEnter={e => { (e.target as HTMLElement).style.background = `${meta.color}20`; }}
                onMouseLeave={e => { (e.target as HTMLElement).style.background = `${meta.color}08`; }}
              >
                <span style={{ fontSize: 16 }}>{meta.icon}</span>
                {meta.label}
              </button>
            );
          })}
        </div>

        {/* Close */}
        <button onClick={onClose} style={{
          width: '100%', marginTop: 8, padding: '4px 0', borderRadius: 4,
          background: 'rgba(255,255,255,0.05)', border: '1px solid #333',
          color: '#666', fontSize: 10, cursor: 'pointer', fontFamily: FONT,
        }}>ESC to close</button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// PARTY FRAMES (top-left, shows party members)
// ═══════════════════════════════════════════════════════════════

export interface PartyMember {
  sessionId: string;
  name: string;
  heroClass: string;
  level: number;
  hp: number;
  maxHp: number;
}

export interface PartyState {
  id: number;
  leader: string;
  members: PartyMember[];
}

export function PartyFrames({ party, mySessionId, onLeave }: {
  party: PartyState | null;
  mySessionId: string;
  onLeave: () => void;
}) {
  if (!party || party.members.length <= 1) return null;

  return (
    <div style={{
      position: 'absolute', top: 50, left: 8, zIndex: 20,
      display: 'flex', flexDirection: 'column', gap: 4,
      fontFamily: FONT, pointerEvents: 'auto',
    }}>
      <div style={{ fontSize: 9, color: '#c5a059', fontWeight: 700, letterSpacing: 1, marginBottom: 2 }}>
        PARTY ({party.members.length}/5)
      </div>
      {party.members.map(m => {
        const isLeader = m.sessionId === party.leader;
        const isMe = m.sessionId === mySessionId;
        const hpPct = m.maxHp > 0 ? (m.hp / m.maxHp) * 100 : 0;
        const classColor = CLASS_COLORS[m.heroClass] || '#888';
        return (
          <div key={m.sessionId} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '4px 8px', borderRadius: 6,
            background: isMe ? 'rgba(197,160,89,0.1)' : 'rgba(10,10,20,0.85)',
            border: `1px solid ${isMe ? '#c5a05940' : '#222'}`,
            minWidth: 150,
          }}>
            {/* Class icon */}
            <div style={{
              width: 22, height: 22, borderRadius: '50%',
              background: `linear-gradient(135deg, ${classColor}, ${classColor}88)`,
              border: isLeader ? '2px solid #ffd700' : '1px solid #555',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 10, fontWeight: 700, color: '#fff', flexShrink: 0,
            }}>
              {isLeader ? '👑' : m.heroClass[0]}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: '#ddd', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {m.name} <span style={{ color: '#666', fontSize: 9 }}>Lv{m.level}</span>
              </div>
              <div style={{ height: 3, borderRadius: 1, background: '#1a0a0a', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${hpPct}%`, background: `linear-gradient(to right, #991b1b, ${hpPct > 50 ? '#22c55e' : hpPct > 25 ? '#fbbf24' : '#ef4444'})`, transition: 'width 0.3s' }} />
              </div>
            </div>
          </div>
        );
      })}
      <button onClick={onLeave} style={{
        fontSize: 9, color: '#ef4444', background: 'rgba(239,68,68,0.1)',
        border: '1px solid rgba(239,68,68,0.2)', borderRadius: 4,
        padding: '2px 8px', cursor: 'pointer', fontFamily: FONT,
      }}>Leave Party</button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// INSPECT PANEL (popup showing another player's info)
// ═══════════════════════════════════════════════════════════════

export interface InspectData {
  sessionId: string;
  name: string;
  race: string;
  heroClass: string;
  level: number;
  hp: number;
  maxHp: number;
  guildName: string | null;
  guildTag: string | null;
  equipment: Record<string, any>;
}

export function InspectPanel({ data, onClose }: { data: InspectData | null; onClose: () => void }) {
  if (!data) return null;
  const classColor = CLASS_COLORS[data.heroClass] || '#888';
  const hpPct = data.maxHp > 0 ? (data.hp / data.maxHp) * 100 : 0;
  const eqSlots = ['helm', 'shoulder', 'chest', 'hands', 'feet', 'mainhand', 'offhand', 'ring', 'necklace', 'cape'];

  return (
    <div style={{
      position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
      zIndex: 100, fontFamily: FONT,
    }} onClick={e => e.stopPropagation()}>
      <div style={{
        background: 'linear-gradient(to bottom, rgba(15,10,5,0.97), rgba(8,5,0,0.97))',
        border: `2px solid ${classColor}`, borderRadius: 12, padding: 16, width: 280,
        boxShadow: `0 8px 30px rgba(0,0,0,0.8), 0 0 8px ${classColor}22`,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: classColor }}>{data.name}</div>
            <div style={{ fontSize: 10, color: '#888' }}>Lv{data.level} {data.race} {data.heroClass}</div>
            {data.guildName && <div style={{ fontSize: 9, color: '#a78bfa' }}>&lt;{data.guildTag}&gt; {data.guildName}</div>}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#666', fontSize: 18, cursor: 'pointer' }}>&times;</button>
        </div>

        {/* HP bar */}
        <div style={{ marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#888', marginBottom: 2 }}>
            <span>HP</span><span>{Math.floor(data.hp)}/{data.maxHp}</span>
          </div>
          <div style={{ height: 4, borderRadius: 2, background: '#1a0a0a' }}>
            <div style={{ height: '100%', width: `${hpPct}%`, background: 'linear-gradient(to right, #991b1b, #22c55e)', borderRadius: 2 }} />
          </div>
        </div>

        {/* Equipment grid */}
        <div style={{ fontSize: 9, color: '#c5a059', fontWeight: 700, marginBottom: 4 }}>EQUIPMENT</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 4 }}>
          {eqSlots.map(slot => {
            const item = data.equipment?.[slot];
            return (
              <div key={slot} style={{
                width: 40, height: 40, borderRadius: 4,
                background: item ? 'rgba(197,160,89,0.1)' : 'rgba(255,255,255,0.03)',
                border: item ? '1px solid #c5a05940' : '1px solid #222',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 8, color: item ? '#c5a059' : '#333', fontWeight: 600,
              }} title={item?.name || slot}>
                {item ? item.name?.split(' ').map((w: string) => w[0]).join('') : slot[0].toUpperCase()}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// TRADE WINDOW
// ═══════════════════════════════════════════════════════════════

export interface TradeState {
  tradeId: number;
  withName: string;
  fromOffer: { items: any[]; gold: number };
  toOffer: { items: any[]; gold: number };
  fromAccepted: boolean;
  toAccepted: boolean;
}

export function TradeWindow({ trade, isFrom, onOffer, onAccept, onCancel }: {
  trade: TradeState;
  isFrom: boolean;
  onOffer: (items: any[], gold: number) => void;
  onAccept: () => void;
  onCancel: () => void;
}) {
  const [goldInput, setGoldInput] = useState(0);
  const myOffer = isFrom ? trade.fromOffer : trade.toOffer;
  const theirOffer = isFrom ? trade.toOffer : trade.fromOffer;
  const myAccepted = isFrom ? trade.fromAccepted : trade.toAccepted;
  const theirAccepted = isFrom ? trade.toAccepted : trade.fromAccepted;

  return (
    <div style={{
      position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
      zIndex: 100, fontFamily: FONT,
    }}>
      <div style={{
        background: 'linear-gradient(to bottom, rgba(15,10,5,0.97), rgba(8,5,0,0.97))',
        border: '2px solid #fbbf24', borderRadius: 12, padding: 16, width: 420,
        boxShadow: '0 8px 30px rgba(0,0,0,0.8), 0 0 8px rgba(251,191,36,0.2)',
      }}>
        <div style={{ textAlign: 'center', fontSize: 14, fontWeight: 700, color: '#fbbf24', marginBottom: 10 }}>
          💰 TRADE — {trade.withName}
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          {/* Your offer */}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#4ade80', marginBottom: 4 }}>YOUR OFFER</div>
            <div style={{
              minHeight: 100, borderRadius: 6, padding: 8,
              background: 'rgba(74,222,128,0.05)', border: '1px solid rgba(74,222,128,0.2)',
            }}>
              {myOffer.items.length === 0 && <div style={{ fontSize: 9, color: '#555' }}>No items</div>}
              {myOffer.items.map((item: any, i: number) => (
                <div key={i} style={{ fontSize: 9, color: '#ddd', padding: 2 }}>{item.name || 'Item'}</div>
              ))}
              <div style={{ fontSize: 10, color: '#fbbf24', marginTop: 4 }}>Gold: {myOffer.gold}</div>
            </div>
            <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
              <input type="number" value={goldInput} onChange={e => setGoldInput(Math.max(0, parseInt(e.target.value) || 0))}
                style={{ flex: 1, padding: '3px 6px', borderRadius: 4, background: '#111', border: '1px solid #333', color: '#fbbf24', fontSize: 10, fontFamily: FONT }} />
              <button onClick={() => onOffer(myOffer.items, goldInput)} style={{
                padding: '3px 8px', borderRadius: 4, background: 'rgba(251,191,36,0.15)',
                border: '1px solid rgba(251,191,36,0.3)', color: '#fbbf24', fontSize: 9, cursor: 'pointer', fontFamily: FONT,
              }}>Set Gold</button>
            </div>
          </div>

          {/* Their offer */}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#60a5fa', marginBottom: 4 }}>THEIR OFFER</div>
            <div style={{
              minHeight: 100, borderRadius: 6, padding: 8,
              background: 'rgba(96,165,250,0.05)', border: '1px solid rgba(96,165,250,0.2)',
            }}>
              {theirOffer.items.length === 0 && <div style={{ fontSize: 9, color: '#555' }}>No items</div>}
              {theirOffer.items.map((item: any, i: number) => (
                <div key={i} style={{ fontSize: 9, color: '#ddd', padding: 2 }}>{item.name || 'Item'}</div>
              ))}
              <div style={{ fontSize: 10, color: '#fbbf24', marginTop: 4 }}>Gold: {theirOffer.gold}</div>
            </div>
          </div>
        </div>

        {/* Status + buttons */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
          <div style={{ fontSize: 9, color: '#888' }}>
            {myAccepted && theirAccepted ? '✅ Both accepted!' :
             myAccepted ? '✅ You accepted. Waiting...' :
             theirAccepted ? '⏳ They accepted. Your turn.' : 'Set offer, then accept.'}
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={onAccept} style={{
              padding: '5px 14px', borderRadius: 6,
              background: myAccepted ? 'rgba(74,222,128,0.2)' : 'rgba(74,222,128,0.1)',
              border: `1px solid ${myAccepted ? '#4ade80' : '#4ade8040'}`,
              color: '#4ade80', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: FONT,
            }}>{myAccepted ? '✓ Accepted' : 'Accept'}</button>
            <button onClick={onCancel} style={{
              padding: '5px 14px', borderRadius: 6,
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
              color: '#ef4444', fontSize: 11, cursor: 'pointer', fontFamily: FONT,
            }}>Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// GUILD PANEL (replaces the stub GuildTab)
// ═══════════════════════════════════════════════════════════════

export interface GuildState {
  id: number;
  name: string;
  tag: string;
  leader: string;
  members: { sessionId: string; name: string; rank: string; online: boolean; level: number; heroClass: string }[];
  memberCount: number;
}

export function GuildPanel({ guild, mySessionId, onLeave, onCreate }: {
  guild: GuildState | null;
  mySessionId: string;
  onLeave: () => void;
  onCreate: (name: string, tag: string) => void;
}) {
  const [createName, setCreateName] = useState('');
  const [createTag, setCreateTag] = useState('');

  if (!guild) {
    return (
      <div style={{ padding: 16, fontFamily: FONT }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#c5a059', marginBottom: 8 }}>CREATE GUILD</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <input placeholder="Guild Name (2-24 chars)" value={createName} onChange={e => setCreateName(e.target.value)} maxLength={24}
            style={{ padding: '6px 10px', borderRadius: 6, background: '#111', border: '1px solid #333', color: '#ddd', fontSize: 12, fontFamily: FONT }} />
          <input placeholder="Tag (2-5 chars)" value={createTag} onChange={e => setCreateTag(e.target.value)} maxLength={5}
            style={{ padding: '6px 10px', borderRadius: 6, background: '#111', border: '1px solid #333', color: '#ddd', fontSize: 12, fontFamily: FONT }} />
          <button onClick={() => { if (createName.trim().length >= 2 && createTag.trim().length >= 2) onCreate(createName.trim(), createTag.trim()); }}
            disabled={createName.trim().length < 2 || createTag.trim().length < 2}
            style={{
              padding: '8px 16px', borderRadius: 6,
              background: createName.trim().length >= 2 ? '#c5a059' : '#333',
              border: 'none', color: '#000', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: FONT,
            }}>Create Guild</button>
        </div>
        <div style={{ fontSize: 10, color: '#555', marginTop: 8 }}>Form crews, claim territory, compete for faction dominance.</div>
      </div>
    );
  }

  const isLeader = guild.leader === mySessionId;
  const onlineCount = guild.members.filter(m => m.online).length;

  return (
    <div style={{ padding: 16, fontFamily: FONT }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <div style={{ fontSize: 20 }}>⚔</div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#c5a059' }}>[{guild.tag}] {guild.name}</div>
          <div style={{ fontSize: 10, color: '#888' }}>{onlineCount}/{guild.memberCount} online</div>
        </div>
      </div>

      <div style={{ fontSize: 10, fontWeight: 700, color: '#888', marginBottom: 4 }}>MEMBERS</div>
      <div style={{ maxHeight: 200, overflowY: 'auto' }}>
        {guild.members.map(m => (
          <div key={m.sessionId} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '3px 6px', borderRadius: 4,
            background: m.sessionId === mySessionId ? 'rgba(197,160,89,0.1)' : 'transparent',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{
                width: 6, height: 6, borderRadius: '50%',
                background: m.online ? '#4ade80' : '#555',
              }} />
              <span style={{ fontSize: 11, color: m.online ? '#ddd' : '#666' }}>
                {m.rank === 'leader' ? '👑 ' : ''}{m.name}
              </span>
            </div>
            <span style={{ fontSize: 9, color: '#666' }}>Lv{m.level} {m.heroClass}</span>
          </div>
        ))}
      </div>

      <button onClick={onLeave} style={{
        marginTop: 10, width: '100%', padding: '5px 0', borderRadius: 4,
        background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
        color: '#ef4444', fontSize: 10, cursor: 'pointer', fontFamily: FONT,
      }}>Leave Guild</button>
    </div>
  );
}

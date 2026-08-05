// ===== Cardano Stake Bulls TCG — shared card data + rules engine =====

export interface TcgCard {
  uid: string;          // unique instance id
  id: string;           // catalog id ("bull", "rune_bolt", ...)
  name: string;
  cost: number;
  type: 'minion' | 'spell';
  atk?: number;
  hp?: number;
  text?: string;
  image?: string;
  bull?: boolean;
  effect?: SpellEffect;
}

export type SpellEffect =
  | 'damage_any'        // 3 damage to any target
  | 'buff_hp'           // +0/+3 to a friendly minion
  | 'buff_atk_rush'     // +2/+0 and may attack this turn
  | 'heal_hero'         // restore hero HP
  | 'aoe_enemy'         // damage all enemy minions
  | 'buff_board';       // +1/+1 to all your minions

export interface TcgMinion {
  uid: string;
  name: string;
  atk: number;
  hp: number;
  maxHp: number;
  image?: string;
  bull?: boolean;
  canAttack: boolean;
}

export interface TcgSide {
  name: string;
  hp: number;
  mana: number;
  maxMana: number;
  deck: TcgCard[];
  hand: TcgCard[];
  board: TcgMinion[];
  fatigue: number;
}

export interface TcgBoardState {
  hostId: string;
  guestId: string;
  sides: Record<string, TcgSide>;
  log: string[];
  winnerId?: string | null;
}

export const HERO_HP = 30;
export const MAX_BOARD = 5;
export const MAX_MANA = 10;
export const HAND_LIMIT = 8;

let counter = 0;
export const nextUid = (p = 'c') => `${p}_${Date.now().toString(36)}_${(counter++).toString(36)}${Math.random().toString(36).slice(2, 6)}`;

// ---------- Earnable / buyable cards ----------
export interface ShopCard extends Omit<TcgCard, 'uid'> {
  price: number;
  emoji: string;
}

export const SHOP_CARDS: ShopCard[] = [
  { id: 'rune_acolyte', name: 'Rune Acolyte', cost: 1, type: 'minion', atk: 1, hp: 2, text: 'A cheap early body.', emoji: '🔮', price: 120 },
  { id: 'stake_guard', name: 'Stake Pool Guard', cost: 2, type: 'minion', atk: 1, hp: 4, text: 'Soaks up damage.', emoji: '🛡️', price: 200 },
  { id: 'oracle_drone', name: 'Oracle Drone', cost: 3, type: 'minion', atk: 3, hp: 3, text: 'Balanced mid-game body.', emoji: '🛰️', price: 320 },
  { id: 'chain_golem', name: 'Chain Golem', cost: 5, type: 'minion', atk: 5, hp: 6, text: 'Heavy finisher.', emoji: '🗿', price: 600 },
  { id: 'rune_bolt', name: 'Rune Bolt', cost: 2, type: 'spell', effect: 'damage_any', text: 'Deal 3 damage to any target.', emoji: '⚡', price: 180 },
  { id: 'stake_shield', name: 'Stake Shield', cost: 1, type: 'spell', effect: 'buff_hp', text: 'Give a friendly minion +0/+3.', emoji: '🪬', price: 140 },
  { id: 'horn_charge', name: 'Horn Charge', cost: 2, type: 'spell', effect: 'buff_atk_rush', text: 'Give a minion +2/+0 and it can attack now.', emoji: '💨', price: 220 },
  { id: 'ada_blessing', name: 'ADA Blessing', cost: 3, type: 'spell', effect: 'heal_hero', text: 'Restore 8 HP to your hero.', emoji: '💠', price: 260 },
  { id: 'cardano_storm', name: 'Cardano Storm', cost: 5, type: 'spell', effect: 'aoe_enemy', text: 'Deal 2 damage to all enemy minions.', emoji: '🌩️', price: 480 },
  { id: 'bull_run', name: 'Bull Run', cost: 4, type: 'spell', effect: 'buff_board', text: 'Give all your minions +1/+1.', emoji: '📈', price: 420 },
];

export const shopCard = (id: string) => SHOP_CARDS.find((c) => c.id === id);

export function makeCard(id: string): TcgCard | null {
  const s = shopCard(id);
  if (!s) return null;
  const { price, emoji, ...rest } = s;
  return { ...rest, uid: nextUid(id) };
}

export const TOKEN_RECRUIT: Omit<TcgCard, 'uid'> = {
  id: 'bull_recruit', name: 'Bull Recruit', cost: 1, type: 'minion', atk: 1, hp: 2, text: 'A young bull eager to fight.',
};

// ---------- Bull cards ----------
export interface BullLike { nft_id: string; nft_name: string; level: number; rarity: string; image?: string }

export function bullToCard(b: BullLike): TcgCard {
  const lvl = Math.max(1, b.level || 1);
  return {
    uid: nextUid('bull'),
    id: `bull_${b.nft_id}`,
    name: b.nft_name,
    cost: Math.min(8, 1 + Math.floor(lvl / 2)),
    type: 'minion',
    atk: 2 + Math.floor(lvl * 0.8),
    hp: 3 + Math.floor(lvl * 0.9),
    image: b.image,
    bull: true,
    text: `Your Lv ${lvl} bull.`,
  };
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function buildDeck(bulls: BullLike[], owned: Array<{ card_id: string; quantity: number }>): TcgCard[] {
  const cards: TcgCard[] = bulls.map(bullToCard);
  owned.forEach((o) => {
    for (let i = 0; i < Math.min(3, o.quantity); i++) {
      const c = makeCard(o.card_id);
      if (c) cards.push(c);
    }
  });
  while (cards.length < 12) cards.push({ ...TOKEN_RECRUIT, uid: nextUid('rec') });
  return shuffle(cards);
}

export function buildAiDeck(playerLevel: number): TcgCard[] {
  const cards: TcgCard[] = [];
  const names = ['Shadow Bull', 'Iron Horn', 'Crimson Charger', 'Frost Hoof', 'Thunder Stomp', 'Dark Taurus'];
  for (let i = 0; i < 5; i++) {
    const lvl = Math.max(1, playerLevel + Math.floor(Math.random() * 3) - 1);
    cards.push(bullToCard({ nft_id: `ai${i}`, nft_name: names[i % names.length], level: lvl, rarity: 'common' }));
  }
  ['rune_acolyte', 'stake_guard', 'oracle_drone', 'rune_bolt', 'horn_charge', 'chain_golem', 'stake_shield'].forEach((id) => {
    const c = makeCard(id);
    if (c) cards.push(c);
  });
  while (cards.length < 14) cards.push({ ...TOKEN_RECRUIT, uid: nextUid('rec') });
  return shuffle(cards);
}

// ---------- State helpers ----------
export function makeSide(name: string, deck: TcgCard[]): TcgSide {
  const d = [...deck];
  const hand = d.splice(0, 3);
  return { name, hp: HERO_HP, mana: 0, maxMana: 0, deck: d, hand, board: [], fatigue: 0 };
}

export function createBoardState(hostId: string, guestId: string, hostSide: TcgSide, guestSide: TcgSide): TcgBoardState {
  const state: TcgBoardState = {
    hostId,
    guestId,
    sides: { [hostId]: hostSide, [guestId]: guestSide },
    log: [`🃏 ${hostSide.name} vs ${guestSide.name} — the duel begins!`],
    winnerId: null,
  };
  return beginTurn(state, hostId);
}

export function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v));
}

export function beginTurn(state: TcgBoardState, playerId: string): TcgBoardState {
  const s = clone(state);
  const side = s.sides[playerId];
  if (!side) return s;
  side.maxMana = Math.min(MAX_MANA, side.maxMana + 1);
  side.mana = side.maxMana;
  side.board.forEach((m) => { m.canAttack = true; });
  drawCard(s, playerId, 1);
  s.log.push(`🔄 ${side.name}'s turn (${side.mana} mana).`);
  return s;
}

export function drawCard(state: TcgBoardState, playerId: string, count = 1) {
  const side = state.sides[playerId];
  for (let i = 0; i < count; i++) {
    if (side.deck.length === 0) {
      side.fatigue += 1;
      side.hp -= side.fatigue;
      state.log.push(`💀 ${side.name} is out of cards and takes ${side.fatigue} fatigue damage.`);
      checkWinner(state);
      continue;
    }
    const card = side.deck.shift()!;
    if (side.hand.length >= HAND_LIMIT) {
      state.log.push(`🔥 ${side.name}'s hand is full — ${card.name} burned.`);
    } else {
      side.hand.push(card);
    }
  }
}

export function checkWinner(state: TcgBoardState) {
  const [a, b] = [state.hostId, state.guestId];
  if (state.sides[a].hp <= 0 && state.winnerId == null) state.winnerId = b;
  else if (state.sides[b].hp <= 0 && state.winnerId == null) state.winnerId = a;
}

export function opponentOf(state: TcgBoardState, playerId: string) {
  return playerId === state.hostId ? state.guestId : state.hostId;
}

export interface PlayOptions { targetMinionUid?: string; targetHero?: 'me' | 'foe' }

export function playCard(state: TcgBoardState, playerId: string, cardUid: string, opts: PlayOptions = {}): { state: TcgBoardState; ok: boolean; error?: string } {
  const s = clone(state);
  const me = s.sides[playerId];
  const foeId = opponentOf(s, playerId);
  const foe = s.sides[foeId];
  const idx = me.hand.findIndex((c) => c.uid === cardUid);
  if (idx === -1) return { state, ok: false, error: 'Card not in hand' };
  const card = me.hand[idx];
  if (card.cost > me.mana) return { state, ok: false, error: 'Not enough mana' };

  if (card.type === 'minion') {
    if (me.board.length >= MAX_BOARD) return { state, ok: false, error: 'Your board is full' };
    me.board.push({
      uid: card.uid, name: card.name, atk: card.atk || 1, hp: card.hp || 1, maxHp: card.hp || 1,
      image: card.image, bull: card.bull, canAttack: false,
    });
    s.log.push(`🐂 ${me.name} summons ${card.name} (${card.atk}/${card.hp}).`);
  } else {
    const applied = applySpell(s, playerId, card, opts);
    if (!applied.ok) return { state, ok: false, error: applied.error };
  }

  me.mana -= card.cost;
  me.hand.splice(idx, 1);
  cleanupBoard(s);
  checkWinner(s);
  return { state: s, ok: true };
}

function applySpell(s: TcgBoardState, playerId: string, card: TcgCard, opts: PlayOptions): { ok: boolean; error?: string } {
  const me = s.sides[playerId];
  const foeId = opponentOf(s, playerId);
  const foe = s.sides[foeId];
  const findMinion = (uid?: string) => {
    if (!uid) return null;
    const mine = me.board.find((m) => m.uid === uid);
    if (mine) return { m: mine, friendly: true };
    const theirs = foe.board.find((m) => m.uid === uid);
    if (theirs) return { m: theirs, friendly: false };
    return null;
  };

  switch (card.effect) {
    case 'damage_any': {
      if (opts.targetHero === 'foe') {
        foe.hp -= 3;
        s.log.push(`⚡ ${card.name} hits ${foe.name} for 3.`);
      } else {
        const t = findMinion(opts.targetMinionUid);
        if (!t) return { ok: false, error: 'Pick a target' };
        t.m.hp -= 3;
        s.log.push(`⚡ ${card.name} hits ${t.m.name} for 3.`);
      }
      break;
    }
    case 'buff_hp': {
      const t = findMinion(opts.targetMinionUid);
      if (!t || !t.friendly) return { ok: false, error: 'Pick one of your minions' };
      t.m.hp += 3; t.m.maxHp += 3;
      s.log.push(`🪬 ${t.m.name} gains +0/+3.`);
      break;
    }
    case 'buff_atk_rush': {
      const t = findMinion(opts.targetMinionUid);
      if (!t || !t.friendly) return { ok: false, error: 'Pick one of your minions' };
      t.m.atk += 2; t.m.canAttack = true;
      s.log.push(`💨 ${t.m.name} charges: +2/+0 and can attack now.`);
      break;
    }
    case 'heal_hero': {
      me.hp = Math.min(HERO_HP, me.hp + 8);
      s.log.push(`💠 ${me.name} restores 8 HP.`);
      break;
    }
    case 'aoe_enemy': {
      foe.board.forEach((m) => { m.hp -= 2; });
      s.log.push(`🌩️ Cardano Storm hits every enemy minion for 2.`);
      break;
    }
    case 'buff_board': {
      me.board.forEach((m) => { m.atk += 1; m.hp += 1; m.maxHp += 1; });
      s.log.push(`📈 Bull Run! ${me.name}'s minions gain +1/+1.`);
      break;
    }
    default:
      return { ok: false, error: 'Unknown spell' };
  }
  return { ok: true };
}

export function attack(state: TcgBoardState, playerId: string, attackerUid: string, target: { minionUid?: string; hero?: boolean }): { state: TcgBoardState; ok: boolean; error?: string } {
  const s = clone(state);
  const me = s.sides[playerId];
  const foeId = opponentOf(s, playerId);
  const foe = s.sides[foeId];
  const attacker = me.board.find((m) => m.uid === attackerUid);
  if (!attacker) return { state, ok: false, error: 'Minion not found' };
  if (!attacker.canAttack) return { state, ok: false, error: 'That minion cannot attack yet' };

  if (target.hero) {
    foe.hp -= attacker.atk;
    s.log.push(`⚔️ ${attacker.name} hits ${foe.name} for ${attacker.atk}!`);
  } else {
    const def = foe.board.find((m) => m.uid === target.minionUid);
    if (!def) return { state, ok: false, error: 'Target not found' };
    def.hp -= attacker.atk;
    attacker.hp -= def.atk;
    s.log.push(`⚔️ ${attacker.name} (${attacker.atk}) clashes with ${def.name} (${def.atk}).`);
  }
  attacker.canAttack = false;
  cleanupBoard(s);
  checkWinner(s);
  return { state: s, ok: true };
}

export function cleanupBoard(s: TcgBoardState) {
  Object.values(s.sides).forEach((side) => {
    side.board = side.board.filter((m) => {
      if (m.hp <= 0) { s.log.push(`☠️ ${m.name} is destroyed.`); return false; }
      return true;
    });
  });
}

export function endTurn(state: TcgBoardState, playerId: string): TcgBoardState {
  const foeId = opponentOf(state, playerId);
  const s = clone(state);
  s.log.push(`⏭️ ${s.sides[playerId].name} ends the turn.`);
  return beginTurn(s, foeId);
}

// ---------- Simple AI ----------
export function aiTakeTurn(state: TcgBoardState, aiId: string): TcgBoardState {
  let s = clone(state);
  const foeId = opponentOf(s, aiId);

  // Play the most expensive affordable cards
  for (let guard = 0; guard < 8; guard++) {
    const me = s.sides[aiId];
    const playable = me.hand
      .filter((c) => c.cost <= me.mana && (c.type === 'minion' ? me.board.length < MAX_BOARD : true))
      .sort((a, b) => b.cost - a.cost);
    if (playable.length === 0) break;
    const card = playable[0];
    const opts: PlayOptions = {};
    if (card.type === 'spell') {
      const enemy = s.sides[foeId].board;
      const mine = me.board;
      if (card.effect === 'damage_any') {
        const t = enemy.sort((a, b) => b.atk - a.atk)[0];
        if (t) opts.targetMinionUid = t.uid; else opts.targetHero = 'foe';
      } else if (card.effect === 'buff_hp' || card.effect === 'buff_atk_rush') {
        const t = mine.sort((a, b) => b.atk - a.atk)[0];
        if (!t) { // can't use it usefully — skip by pretending it's unplayable
          const i = me.hand.findIndex((c) => c.uid === card.uid);
          if (i > -1) me.hand.push(me.hand.splice(i, 1)[0]);
          continue;
        }
        opts.targetMinionUid = t.uid;
      } else if (card.effect === 'aoe_enemy' && enemy.length === 0) {
        continue;
      } else if (card.effect === 'heal_hero' && me.hp > HERO_HP - 8) {
        continue;
      }
    }
    const res = playCard(s, aiId, card.uid, opts);
    if (!res.ok) break;
    s = res.state;
  }

  // Attack: trade into big threats, otherwise go face
  for (let guard = 0; guard < 8; guard++) {
    const me = s.sides[aiId];
    const attacker = me.board.find((m) => m.canAttack);
    if (!attacker) break;
    const enemyBoard = s.sides[foeId].board;
    const killable = enemyBoard.filter((m) => m.hp <= attacker.atk).sort((a, b) => b.atk - a.atk)[0];
    const res = killable
      ? attack(s, aiId, attacker.uid, { minionUid: killable.uid })
      : attack(s, aiId, attacker.uid, { hero: true });
    if (!res.ok) break;
    s = res.state;
    if (s.winnerId) return s;
  }

  if (s.winnerId) return s;
  return endTurn(s, aiId);
}

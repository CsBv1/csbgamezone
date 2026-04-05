import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Swords, Shield, Heart, Zap, Star, Trophy, RotateCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useBullWorldNavigation } from "@/hooks/useBullWorldNavigation";

interface FighterStats {
  maxHp: number;
  hp: number;
  attack: number;
  defense: number;
  speed: number;
  special: number;
  critChance: number;
  name: string;
  badge: string | null;
  rune: string | null;
  runeElement: string;
}

interface BattleLog {
  text: string;
  type: 'attack' | 'defend' | 'special' | 'crit' | 'heal' | 'info';
}

const RUNE_BONUSES: Record<string, { stat: string; bonus: number; element: string }> = {
  '♈': { stat: 'attack', bonus: 15, element: '🔥 Fire' },
  '♉': { stat: 'defense', bonus: 20, element: '🌍 Earth' },
  '♊': { stat: 'speed', bonus: 18, element: '💨 Wind' },
  '♋': { stat: 'maxHp', bonus: 50, element: '🌊 Water' },
  '♌': { stat: 'attack', bonus: 18, element: '☀️ Solar' },
  '♍': { stat: 'defense', bonus: 15, element: '🌿 Nature' },
  '♎': { stat: 'special', bonus: 20, element: '⚖️ Balance' },
  '♏': { stat: 'critChance', bonus: 15, element: '🦂 Venom' },
  '♐': { stat: 'speed', bonus: 20, element: '🏹 Arrow' },
  '♑': { stat: 'defense', bonus: 25, element: '🏔️ Mountain' },
  '♒': { stat: 'special', bonus: 25, element: '⚡ Lightning' },
  '♓': { stat: 'maxHp', bonus: 60, element: '🌙 Lunar' },
};

const BADGE_BONUSES: Record<string, { hp: number; shield: number }> = {
  'Legendary Gold': { hp: 100, shield: 30 },
  'Epic Purple': { hp: 80, shield: 25 },
  'Rare Blue': { hp: 60, shield: 20 },
  'Diamond White': { hp: 90, shield: 28 },
  'Mythic Red': { hp: 85, shield: 27 },
  'Shadow Black': { hp: 70, shield: 22 },
  'Cosmic Cyan': { hp: 75, shield: 24 },
  'Nature Green': { hp: 65, shield: 18 },
  'Royal Indigo': { hp: 72, shield: 21 },
  'Fire Orange': { hp: 78, shield: 23 },
  'Ice Silver': { hp: 68, shield: 19 },
  'Common Copper': { hp: 40, shield: 12 },
};

const AI_NAMES = ['Shadow Bull', 'Iron Horn', 'Crimson Charger', 'Frost Hoof', 'Thunder Stomp', 'Dark Taurus', 'Steel Fury', 'Blaze Runner'];

function buildStats(badge: string | null, rune: string | null, name: string): FighterStats {
  let stats: FighterStats = {
    maxHp: 200, hp: 200, attack: 25, defense: 15, speed: 10, special: 20, critChance: 5,
    name, badge, rune, runeElement: 'None',
  };

  if (badge && BADGE_BONUSES[badge]) {
    stats.maxHp += BADGE_BONUSES[badge].hp;
    stats.defense += BADGE_BONUSES[badge].shield;
  }

  if (rune && RUNE_BONUSES[rune]) {
    const b = RUNE_BONUSES[rune];
    stats.runeElement = b.element;
    (stats as any)[b.stat] += b.bonus;
  }

  stats.hp = stats.maxHp;
  return stats;
}

function buildAI(level: number): FighterStats {
  const name = AI_NAMES[Math.floor(Math.random() * AI_NAMES.length)];
  const runes = Object.keys(RUNE_BONUSES);
  const badges = Object.keys(BADGE_BONUSES);
  const rune = level > 1 ? runes[Math.floor(Math.random() * runes.length)] : null;
  const badge = level > 2 ? badges[Math.floor(Math.random() * badges.length)] : null;
  const ai = buildStats(badge, rune, name);
  // Scale by level
  ai.maxHp += level * 20;
  ai.hp = ai.maxHp;
  ai.attack += level * 3;
  ai.defense += level * 2;
  return ai;
}

export default function BullArena() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { goBack, getBackLabel } = useBullWorldNavigation();
  const logRef = useRef<HTMLDivElement>(null);

  const [userId, setUserId] = useState<string | null>(null);
  const [playerBadge, setPlayerBadge] = useState<string | null>(null);
  const [playerRune, setPlayerRune] = useState<string | null>(null);
  const [username, setUsername] = useState('Fighter');
  const [gameState, setGameState] = useState<'lobby' | 'fighting' | 'victory' | 'defeat'>('lobby');
  const [player, setPlayer] = useState<FighterStats | null>(null);
  const [enemy, setEnemy] = useState<FighterStats | null>(null);
  const [battleLog, setBattleLog] = useState<BattleLog[]>([]);
  const [turn, setTurn] = useState<'player' | 'enemy'>('player');
  const [isAnimating, setIsAnimating] = useState(false);
  const [combo, setCombo] = useState(0);
  const [wins, setWins] = useState(0);
  const [playerShake, setPlayerShake] = useState(false);
  const [enemyShake, setEnemy Shake] = useState(false);
  const [specialReady, setSpecialReady] = useState(0); // 0-100 charge

  useEffect(() => {
    const loadUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const [profileRes, badgeRes, runeRes] = await Promise.all([
        supabase.from('profiles').select('username').eq('id', user.id).single(),
        supabase.from('user_badges').select('badge_name').eq('user_id', user.id).eq('active', true).maybeSingle(),
        supabase.from('user_runes').select('rune_symbol').eq('user_id', user.id).eq('active', true).maybeSingle(),
      ]);

      if (profileRes.data?.username) setUsername(profileRes.data.username);
      if (badgeRes.data?.badge_name) setPlayerBadge(badgeRes.data.badge_name);
      if (runeRes.data?.rune_symbol) setPlayerRune(runeRes.data.rune_symbol);
    };
    loadUser();
  }, []);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [battleLog]);

  const startFight = () => {
    const p = buildStats(playerBadge, playerRune, username);
    const e = buildAI(wins + 1);
    setPlayer(p);
    setEnemy(e);
    setBattleLog([{ text: `⚔️ ${p.name} VS ${e.name}!`, type: 'info' }]);
    setTurn('player');
    setCombo(0);
    setSpecialReady(0);
    setGameState('fighting');
  };

  const doAttack = useCallback(() => {
    if (!player || !enemy || turn !== 'player' || isAnimating) return;
    setIsAnimating(true);

    const isCrit = Math.random() * 100 < player.critChance;
    let dmg = Math.max(5, player.attack - enemy.defense / 2 + Math.floor(Math.random() * 10));
    if (isCrit) dmg = Math.floor(dmg * 1.8);

    const newEnemy = { ...enemy, hp: Math.max(0, enemy.hp - dmg) };
    setEnemy(newEnemy);
    setEnemyShake(true);
    setTimeout(() => setEnemyShake(false), 300);
    setCombo(c => c + 1);
    setSpecialReady(s => Math.min(100, s + 20));

    const log: BattleLog = isCrit
      ? { text: `💥 CRITICAL! ${player.name} deals ${dmg} damage!`, type: 'crit' }
      : { text: `⚔️ ${player.name} attacks for ${dmg} damage!`, type: 'attack' };
    setBattleLog(prev => [...prev, log]);

    if (newEnemy.hp <= 0) {
      setTimeout(() => handleVictory(), 500);
    } else {
      setTimeout(() => { setTurn('enemy'); doEnemyTurn(newEnemy, player); }, 800);
    }
    setTimeout(() => setIsAnimating(false), 600);
  }, [player, enemy, turn, isAnimating]);

  const doSpecial = useCallback(() => {
    if (!player || !enemy || turn !== 'player' || isAnimating || specialReady < 100) return;
    setIsAnimating(true);

    const dmg = Math.floor(player.special * 2.5 + Math.random() * 20);
    const newEnemy = { ...enemy, hp: Math.max(0, enemy.hp - dmg) };
    setEnemy(newEnemy);
    setEnemyShake(true);
    setTimeout(() => setEnemyShake(false), 400);
    setSpecialReady(0);
    setCombo(c => c + 1);

    setBattleLog(prev => [...prev, { text: `🌟 ${player.runeElement} SPECIAL! ${dmg} damage!`, type: 'special' }]);

    if (newEnemy.hp <= 0) {
      setTimeout(() => handleVictory(), 500);
    } else {
      setTimeout(() => { setTurn('enemy'); doEnemyTurn(newEnemy, player); }, 800);
    }
    setTimeout(() => setIsAnimating(false), 600);
  }, [player, enemy, turn, isAnimating, specialReady]);

  const doDefend = useCallback(() => {
    if (!player || !enemy || turn !== 'player' || isAnimating) return;
    setIsAnimating(true);

    const heal = Math.floor(player.defense * 0.5 + 5);
    const newPlayer = { ...player, hp: Math.min(player.maxHp, player.hp + heal) };
    setPlayer(newPlayer);
    setSpecialReady(s => Math.min(100, s + 10));
    setCombo(0);

    setBattleLog(prev => [...prev, { text: `🛡️ ${player.name} defends and heals ${heal} HP!`, type: 'defend' }]);
    setTimeout(() => { setTurn('enemy'); doEnemyTurn(enemy, newPlayer); }, 800);
    setTimeout(() => setIsAnimating(false), 600);
  }, [player, enemy, turn, isAnimating]);

  const doEnemyTurn = (currentEnemy: FighterStats, currentPlayer: FighterStats) => {
    const action = Math.random();
    let log: BattleLog;
    let newPlayer = { ...currentPlayer };

    if (action < 0.7) {
      const isCrit = Math.random() * 100 < currentEnemy.critChance;
      let dmg = Math.max(3, currentEnemy.attack - currentPlayer.defense / 2 + Math.floor(Math.random() * 8));
      if (isCrit) dmg = Math.floor(dmg * 1.5);
      newPlayer.hp = Math.max(0, newPlayer.hp - dmg);
      setPlayerShake(true);
      setTimeout(() => setPlayerShake(false), 300);
      log = isCrit
        ? { text: `💥 ${currentEnemy.name} crits for ${dmg}!`, type: 'crit' }
        : { text: `👊 ${currentEnemy.name} attacks for ${dmg}!`, type: 'attack' };
    } else {
      const heal = Math.floor(currentEnemy.defense * 0.4 + 3);
      const newEnemy = { ...currentEnemy, hp: Math.min(currentEnemy.maxHp, currentEnemy.hp + heal) };
      setEnemy(newEnemy);
      log = { text: `🛡️ ${currentEnemy.name} defends and heals ${heal}!`, type: 'defend' };
    }

    setPlayer(newPlayer);
    setBattleLog(prev => [...prev, log]);

    if (newPlayer.hp <= 0) {
      setTimeout(() => handleDefeat(), 500);
    } else {
      setTimeout(() => setTurn('player'), 400);
    }
  };

  const handleVictory = async () => {
    setGameState('victory');
    setWins(w => w + 1);
    const reward = 50 + wins * 25;

    if (userId) {
      await supabase.rpc('handle_wallet_auth', { _wallet_address: '', _wallet_name: '' }).then(() => {});
      // Award diamonds
      const { data: existing } = await supabase.from('user_diamonds').select('balance, total_earned').eq('user_id', userId).maybeSingle();
      if (existing) {
        await supabase.from('user_diamonds').update({
          balance: (existing.balance || 0) + reward,
          total_earned: (existing.total_earned || 0) + reward,
        }).eq('user_id', userId);
      }
      await supabase.from('game_results').insert({
        user_id: userId, game_name: 'Bull Arena', result: 'win', diamonds_won: reward,
      });
    }

    setBattleLog(prev => [...prev, { text: `🏆 VICTORY! +${reward} 💎 Diamonds!`, type: 'info' }]);
    toast({ title: "Victory! 🏆", description: `You won ${reward} 💎 Diamonds!` });
  };

  const handleDefeat = async () => {
    setGameState('defeat');
    if (userId) {
      await supabase.from('game_results').insert({
        user_id: userId, game_name: 'Bull Arena', result: 'loss', diamonds_won: 0,
      });
    }
    setBattleLog(prev => [...prev, { text: `💀 DEFEATED! Better luck next time...`, type: 'info' }]);
  };

  const logColor = (type: string) => {
    switch (type) {
      case 'crit': return 'text-red-400 font-bold';
      case 'special': return 'text-purple-400 font-bold';
      case 'defend': return 'text-green-400';
      case 'heal': return 'text-emerald-400';
      case 'info': return 'text-yellow-400 font-bold';
      default: return 'text-cyan-300';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-red-950/20 to-gray-950 p-2">
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <Button variant="ghost" size="sm" onClick={goBack} className="text-white">
          <ArrowLeft className="w-4 h-4 mr-1" /> {getBackLabel()}
        </Button>
        <h1 className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-orange-400 flex items-center gap-1">
          <Swords className="w-5 h-5 text-red-400" /> Bull Arena
        </h1>
        {wins > 0 && <Badge className="bg-yellow-600 text-xs ml-auto">{wins} Win{wins > 1 ? 's' : ''}</Badge>}
      </div>

      {gameState === 'lobby' && (
        <div className="max-w-md mx-auto space-y-4 mt-8">
          <Card className="bg-gray-900/80 border-red-800/50 p-6 text-center space-y-4">
            <div className="text-6xl animate-pulse">⚔️</div>
            <h2 className="text-2xl font-bold text-white">Arcade Fighter</h2>
            <p className="text-gray-400 text-sm">1v1 battle with stats from your Badge & Rune!</p>

            <div className="bg-gray-800/60 rounded-lg p-3 text-left space-y-1 text-sm">
              <p className="text-cyan-400 font-semibold">{username}'s Loadout:</p>
              <p className="text-gray-300">🏅 Badge: <span className="text-yellow-400">{playerBadge || 'None'}</span>
                {playerBadge && BADGE_BONUSES[playerBadge] && <span className="text-green-400 text-xs ml-1">(+{BADGE_BONUSES[playerBadge].hp} HP, +{BADGE_BONUSES[playerBadge].shield} DEF)</span>}
              </p>
              <p className="text-gray-300">✨ Rune: <span className="text-purple-400">{playerRune || 'None'}</span>
                {playerRune && RUNE_BONUSES[playerRune] && <span className="text-green-400 text-xs ml-1">({RUNE_BONUSES[playerRune].element} +{RUNE_BONUSES[playerRune].bonus} {RUNE_BONUSES[playerRune].stat.toUpperCase()})</span>}
              </p>
            </div>

            <Button onClick={startFight} className="w-full bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-lg h-12">
              <Swords className="w-5 h-5 mr-2" /> Enter the Arena
            </Button>
            <p className="text-xs text-gray-500">Equip a Badge & Rune from Dashboard for bonus stats!</p>
          </Card>
        </div>
      )}

      {(gameState === 'fighting' || gameState === 'victory' || gameState === 'defeat') && player && enemy && (
        <div className="max-w-lg mx-auto space-y-2">
          {/* Enemy Stats */}
          <Card className={`bg-gray-900/80 border-red-800/40 p-3 transition-transform ${enemyShake ? 'translate-x-2 -translate-x-2' : ''}`}
                style={enemyShake ? { animation: 'shake 0.3s ease-in-out' } : {}}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-red-400 font-bold text-sm flex items-center gap-1">
                👹 {enemy.name}
                {enemy.badge && <span className="text-yellow-400 text-xs">🏅</span>}
                {enemy.rune && <span className="text-purple-400">{enemy.rune}</span>}
              </span>
              <span className="text-xs text-gray-400">{enemy.runeElement}</span>
            </div>
            <Progress value={(enemy.hp / enemy.maxHp) * 100} className="h-3 bg-gray-800" />
            <div className="flex justify-between text-xs mt-1 text-gray-400">
              <span><Heart className="w-3 h-3 inline text-red-400" /> {enemy.hp}/{enemy.maxHp}</span>
              <span><Swords className="w-3 h-3 inline text-orange-400" /> {enemy.attack} <Shield className="w-3 h-3 inline text-blue-400" /> {enemy.defense}</span>
            </div>
          </Card>

          {/* Battle Visual */}
          <div className="relative h-40 bg-gradient-to-r from-red-950/40 via-gray-900 to-blue-950/40 rounded-xl border border-gray-800 flex items-center justify-around overflow-hidden">
            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(255,100,0,0.3) 0%, transparent 70%)' }} />
            
            {/* Player Fighter */}
            <div className={`text-center transition-all duration-200 ${playerShake ? 'animate-bounce' : ''}`}>
              <div className="text-5xl" style={{ filter: playerRune ? 'drop-shadow(0 0 10px rgba(147,51,234,0.8))' : undefined }}>
                🐂
              </div>
              <p className="text-cyan-400 text-xs font-bold mt-1">{player.name}</p>
              {player.rune && <span className="text-purple-400 text-lg">{player.rune}</span>}
            </div>

            <div className="text-3xl text-yellow-400 font-black animate-pulse">VS</div>

            {/* Enemy Fighter */}
            <div className={`text-center transition-all duration-200 ${enemyShake ? 'animate-bounce' : ''}`}>
              <div className="text-5xl" style={{ filter: enemy.rune ? 'drop-shadow(0 0 10px rgba(239,68,68,0.8))' : undefined }}>
                👹
              </div>
              <p className="text-red-400 text-xs font-bold mt-1">{enemy.name}</p>
              {enemy.rune && <span className="text-red-400 text-lg">{enemy.rune}</span>}
            </div>
          </div>

          {/* Player Stats */}
          <Card className={`bg-gray-900/80 border-cyan-800/40 p-3 ${playerShake ? '' : ''}`}
                style={playerShake ? { animation: 'shake 0.3s ease-in-out' } : {}}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-cyan-400 font-bold text-sm flex items-center gap-1">
                🐂 {player.name}
                {player.badge && <span className="text-yellow-400 text-xs">🏅 {player.badge}</span>}
                {player.rune && <span className="text-purple-400">{player.rune}</span>}
              </span>
              <span className="text-xs text-gray-400">{player.runeElement}</span>
            </div>
            <Progress value={(player.hp / player.maxHp) * 100} className="h-3 bg-gray-800" />
            <div className="flex justify-between text-xs mt-1 text-gray-400">
              <span><Heart className="w-3 h-3 inline text-red-400" /> {player.hp}/{player.maxHp}</span>
              <span><Swords className="w-3 h-3 inline text-orange-400" /> {player.attack} <Shield className="w-3 h-3 inline text-blue-400" /> {player.defense} <Zap className="w-3 h-3 inline text-purple-400" /> {player.special}</span>
            </div>
            {/* Special charge */}
            <div className="mt-1">
              <div className="flex items-center gap-1 text-xs text-purple-400">
                <Star className="w-3 h-3" /> Special: {specialReady}%
              </div>
              <Progress value={specialReady} className="h-1.5 bg-gray-800 mt-0.5" />
            </div>
          </Card>

          {/* Actions */}
          {gameState === 'fighting' && (
            <div className="grid grid-cols-3 gap-2">
              <Button onClick={doAttack} disabled={turn !== 'player' || isAnimating}
                className="bg-gradient-to-b from-red-600 to-red-800 hover:from-red-500 h-14 flex-col text-xs">
                <Swords className="w-5 h-5" /> Attack
              </Button>
              <Button onClick={doDefend} disabled={turn !== 'player' || isAnimating}
                className="bg-gradient-to-b from-blue-600 to-blue-800 hover:from-blue-500 h-14 flex-col text-xs">
                <Shield className="w-5 h-5" /> Defend
              </Button>
              <Button onClick={doSpecial} disabled={turn !== 'player' || isAnimating || specialReady < 100}
                className={`h-14 flex-col text-xs ${specialReady >= 100 ? 'bg-gradient-to-b from-purple-600 to-purple-800 hover:from-purple-500 animate-pulse' : 'bg-gray-700'}`}>
                <Zap className="w-5 h-5" /> Special
              </Button>
            </div>
          )}

          {(gameState === 'victory' || gameState === 'defeat') && (
            <div className="flex gap-2">
              <Button onClick={startFight} className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 h-12">
                <RotateCcw className="w-4 h-4 mr-1" /> {gameState === 'victory' ? 'Next Fight' : 'Rematch'}
              </Button>
              <Button onClick={goBack} variant="outline" className="h-12 border-gray-600 text-gray-300">
                Exit
              </Button>
            </div>
          )}

          {/* Combo & Turn */}
          <div className="flex justify-between text-xs">
            {combo > 1 && <Badge className="bg-orange-600 animate-pulse">🔥 {combo}x Combo!</Badge>}
            <Badge className={turn === 'player' ? 'bg-cyan-700' : 'bg-red-700'}>
              {turn === 'player' ? '🎮 Your Turn' : '👹 Enemy Turn'}
            </Badge>
          </div>

          {/* Battle Log */}
          <Card className="bg-gray-950/80 border-gray-800 p-2 max-h-32 overflow-y-auto" ref={logRef}>
            {battleLog.map((log, i) => (
              <p key={i} className={`text-xs ${logColor(log.type)}`}>{log.text}</p>
            ))}
          </Card>
        </div>
      )}

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-6px); }
          75% { transform: translateX(6px); }
        }
      `}</style>
    </div>
  );
}

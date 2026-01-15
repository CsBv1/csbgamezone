import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Globe, Coins, Users, Zap } from "lucide-react";
import { useHolderGame } from "@/hooks/useHolderGame";
import { CreditBar } from "@/components/CreditBar";
import { audioManager } from "@/hooks/useAudioManager";

// Start background music immediately
audioManager.startBackgroundMusic();

interface Region {
  id: string;
  name: string;
  emoji: string;
  owner: 'player' | 'enemy' | 'neutral';
  income: number;
  defense: number;
  connected: string[];
}

export default function ADAConquest() {
  const { isLoading, isAuthorized, bullsOwned, awardKeys, navigate } = useHolderGame({ 
    gameName: "ADA Conquest" 
  });
  
  const [turn, setTurn] = useState(1);
  const [ada, setAda] = useState(300);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [keysEarned, setKeysEarned] = useState(0);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  
  const maxTurns = 20;
  const [regions, setRegions] = useState<Region[]>([
    { id: 'capital', name: 'Bull Capital', emoji: '🏛️', owner: 'player', income: 50, defense: 100, connected: ['forest', 'plains'] },
    { id: 'forest', name: 'Dark Forest', emoji: '🌲', owner: 'neutral', income: 30, defense: 40, connected: ['capital', 'mountain', 'plains'] },
    { id: 'plains', name: 'Golden Plains', emoji: '🌾', owner: 'neutral', income: 40, defense: 30, connected: ['capital', 'forest', 'coast'] },
    { id: 'mountain', name: 'Iron Mountain', emoji: '⛰️', owner: 'neutral', income: 60, defense: 60, connected: ['forest', 'enemy'] },
    { id: 'coast', name: 'Trade Coast', emoji: '🏖️', owner: 'neutral', income: 50, defense: 35, connected: ['plains', 'enemy'] },
    { id: 'enemy', name: 'Enemy Fortress', emoji: '🏴', owner: 'enemy', income: 0, defense: 120, connected: ['mountain', 'coast'] },
  ]);

  const playerRegions = regions.filter(r => r.owner === 'player');
  const enemyRegions = regions.filter(r => r.owner === 'enemy');

  const canAttack = (regionId: string) => {
    const region = regions.find(r => r.id === regionId);
    if (!region || region.owner === 'player') return false;
    
    // Check if connected to player region
    return region.connected.some(connId => {
      const connRegion = regions.find(r => r.id === connId);
      return connRegion?.owner === 'player';
    });
  };

  const attack = (regionId: string) => {
    const region = regions.find(r => r.id === regionId);
    if (!region || !canAttack(regionId)) return;
    
    const attackCost = 50;
    if (ada < attackCost) {
      audioManager.playSFX('error');
      return;
    }
    
    audioManager.playSFX('attack');
    setAda(a => a - attackCost);
    
    // Calculate success chance based on bull ownership and defense
    const baseChance = 0.5;
    const bullBonus = bullsOwned * 0.05;
    const defenseModifier = region.defense / 200;
    const successChance = Math.min(0.9, Math.max(0.2, baseChance + bullBonus - defenseModifier));
    
    setTimeout(() => {
      if (Math.random() < successChance) {
        audioManager.playSFX('levelUp');
        setRegions(prev => prev.map(r => 
          r.id === regionId ? { ...r, owner: 'player' } : r
        ));
        
        // Check win condition
        if (regionId === 'enemy') {
          endGame(true);
        }
      } else {
        audioManager.playSFX('lose');
      }
    }, 500);
  };

  const fortify = (regionId: string) => {
    const region = regions.find(r => r.id === regionId);
    if (!region || region.owner !== 'player') return;
    
    const cost = 30;
    if (ada < cost) {
      audioManager.playSFX('error');
      return;
    }
    
    audioManager.playSFX('coin');
    setAda(a => a - cost);
    setRegions(prev => prev.map(r => 
      r.id === regionId ? { ...r, defense: r.defense + 20 } : r
    ));
  };

  const endTurn = () => {
    audioManager.playSFX('buttonPress');
    
    // Collect income
    const income = playerRegions.reduce((sum, r) => sum + r.income, 0);
    setAda(a => a + income);
    
    // Enemy counterattack (simplified)
    if (enemyRegions.length > 0 && Math.random() < 0.3) {
      const vulnerableRegion = playerRegions.find(r => 
        r.connected.some(connId => regions.find(cr => cr.id === connId)?.owner === 'enemy')
      );
      
      if (vulnerableRegion && Math.random() < 0.3) {
        audioManager.playSFX('lose');
        setRegions(prev => prev.map(r => 
          r.id === vulnerableRegion.id ? { ...r, owner: 'neutral' } : r
        ));
      }
    }
    
    const newTurn = turn + 1;
    setTurn(newTurn);
    setSelectedRegion(null);
    
    if (newTurn > maxTurns && enemyRegions.length > 0) {
      endGame(false);
    }
  };

  const endGame = async (victory: boolean) => {
    setGameOver(true);
    setWon(victory);
    
    if (victory) {
      audioManager.playSFX('jackpot');
      const keys = 2 + Math.floor(bullsOwned / 2);
      setKeysEarned(keys);
      await awardKeys(keys);
    } else {
      audioManager.playSFX('lose');
    }
  };

  const resetGame = () => {
    setTurn(1);
    setAda(300);
    setGameOver(false);
    setWon(false);
    setKeysEarned(0);
    setSelectedRegion(null);
    setRegions([
      { id: 'capital', name: 'Bull Capital', emoji: '🏛️', owner: 'player', income: 50, defense: 100, connected: ['forest', 'plains'] },
      { id: 'forest', name: 'Dark Forest', emoji: '🌲', owner: 'neutral', income: 30, defense: 40, connected: ['capital', 'mountain', 'plains'] },
      { id: 'plains', name: 'Golden Plains', emoji: '🌾', owner: 'neutral', income: 40, defense: 30, connected: ['capital', 'forest', 'coast'] },
      { id: 'mountain', name: 'Iron Mountain', emoji: '⛰️', owner: 'neutral', income: 60, defense: 60, connected: ['forest', 'enemy'] },
      { id: 'coast', name: 'Trade Coast', emoji: '🏖️', owner: 'neutral', income: 50, defense: 35, connected: ['plains', 'enemy'] },
      { id: 'enemy', name: 'Enemy Fortress', emoji: '🏴', owner: 'enemy', income: 0, defense: 120, connected: ['mountain', 'coast'] },
    ]);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bull-pattern flex items-center justify-center">
        <div className="text-2xl text-primary animate-pulse">Loading...</div>
      </div>
    );
  }

  if (!isAuthorized) return null;

  return (
    <div className="min-h-screen bull-pattern p-4">
      <div className="flex justify-between items-center mb-4">
        <Button variant="ghost" onClick={() => navigate('/')}>
          <ArrowLeft className="w-5 h-5 mr-2" /> Back
        </Button>
        <CreditBar />
      </div>

      <Card className="max-w-lg mx-auto p-6 bg-card/95 backdrop-blur">
        <div className="text-center mb-4">
          <h1 className="text-3xl font-bold gradient-gold bg-clip-text text-transparent flex items-center justify-center gap-2">
            <Globe className="w-8 h-8 text-blue-500" />
            ADA Conquest
          </h1>
          <p className="text-muted-foreground">Conquer the Enemy Fortress!</p>
          <div className="text-sm text-amber-400 mt-2">🐂 {bullsOwned} Bulls = +{bullsOwned * 5}% attack bonus</div>
        </div>

        {gameOver ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-4">{won ? '🏆' : '💀'}</div>
            <h2 className="text-2xl font-bold mb-2">
              {won ? 'Total Domination!' : 'Empire Collapsed!'}
            </h2>
            <p className="text-lg text-muted-foreground mb-2">
              Conquered {playerRegions.length} regions
            </p>
            {keysEarned > 0 && (
              <p className="text-lg text-amber-400 mb-4">+{keysEarned} 🔑 earned!</p>
            )}
            <Button onClick={resetGame} size="lg">Conquer Again</Button>
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className="flex justify-between items-center mb-4 p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-1">
                <Coins className="w-4 h-4 text-blue-400" />
                <span className="font-bold text-blue-400">{ada} ADA</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="font-bold">Turn {turn}/{maxTurns}</span>
              </div>
              <div className="flex items-center gap-1">
                <Users className="w-4 h-4 text-green-400" />
                <span className="font-bold text-green-400">{playerRegions.length}/6</span>
              </div>
            </div>

            {/* Map */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              {regions.map(region => {
                const isSelected = selectedRegion === region.id;
                const attackable = canAttack(region.id);
                
                return (
                  <button
                    key={region.id}
                    onClick={() => setSelectedRegion(region.id)}
                    className={`p-3 rounded-lg text-center transition-all ${
                      region.owner === 'player' 
                        ? 'bg-green-500/20 border-2 border-green-500' 
                        : region.owner === 'enemy' 
                          ? 'bg-red-500/20 border-2 border-red-500'
                          : 'bg-muted/30 border border-muted'
                    } ${isSelected ? 'ring-2 ring-primary' : ''} ${attackable ? 'animate-pulse' : ''}`}
                  >
                    <div className="text-2xl mb-1">{region.emoji}</div>
                    <p className="text-xs font-semibold truncate">{region.name}</p>
                    <div className="flex justify-between text-xs mt-1">
                      <span className="text-yellow-400">+{region.income}</span>
                      <span className="text-blue-400">🛡️{region.defense}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Actions */}
            {selectedRegion && (
              <div className="mb-4 p-3 bg-muted/20 rounded-lg">
                <p className="text-sm font-semibold mb-2">
                  {regions.find(r => r.id === selectedRegion)?.name}
                </p>
                <div className="flex gap-2">
                  {canAttack(selectedRegion) && (
                    <Button 
                      onClick={() => attack(selectedRegion)} 
                      disabled={ada < 50}
                      variant="destructive"
                      size="sm"
                    >
                      <Zap className="w-3 h-3 mr-1" /> Attack (50 ADA)
                    </Button>
                  )}
                  {regions.find(r => r.id === selectedRegion)?.owner === 'player' && (
                    <Button 
                      onClick={() => fortify(selectedRegion)} 
                      disabled={ada < 30}
                      variant="outline"
                      size="sm"
                    >
                      🛡️ Fortify (30 ADA)
                    </Button>
                  )}
                </div>
              </div>
            )}

            <Button onClick={endTurn} className="w-full" size="lg">
              End Turn (Collect +{playerRegions.reduce((s, r) => s + r.income, 0)} ADA)
            </Button>
          </>
        )}
      </Card>
    </div>
  );
}

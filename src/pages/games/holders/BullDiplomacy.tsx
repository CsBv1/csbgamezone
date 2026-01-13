import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Users, Handshake, Sword, Gift } from "lucide-react";
import { useHolderGame } from "@/hooks/useHolderGame";
import { CreditBar } from "@/components/CreditBar";
import { useAudioManager } from "@/hooks/useAudioManager";

interface Faction {
  id: string;
  name: string;
  emoji: string;
  relation: number; // -100 to 100
  power: number;
  trait: string;
}

interface Event {
  text: string;
  choices: { text: string; effects: { [factionId: string]: number } }[];
}

export default function BullDiplomacy() {
  const { isLoading, isAuthorized, bullsOwned, awardKeys, navigate } = useHolderGame({ 
    gameName: "Bull Diplomacy" 
  });
  const { playSFX, startMusic } = useAudioManager();
  
  // Start music when entering game
  startMusic();
  
  const bonusRelation = bullsOwned * 5;
  
  const [factions, setFactions] = useState<Faction[]>([
    { id: 'warriors', name: 'Warriors Guild', emoji: '⚔️', relation: 0 + bonusRelation, power: 80, trait: 'Aggressive' },
    { id: 'merchants', name: 'Merchant League', emoji: '💰', relation: 0 + bonusRelation, power: 60, trait: 'Greedy' },
    { id: 'scholars', name: 'Scholar Circle', emoji: '📚', relation: 0 + bonusRelation, power: 40, trait: 'Neutral' },
    { id: 'mystics', name: 'Mystic Order', emoji: '🔮', relation: 0 + bonusRelation, power: 70, trait: 'Unpredictable' },
  ]);
  
  const [turn, setTurn] = useState(1);
  const [currentEvent, setCurrentEvent] = useState<Event | null>(null);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [keysEarned, setKeysEarned] = useState(0);

  const TURNS_TO_WIN = 10;
  const ALLY_THRESHOLD = 50;

  const events: Event[] = [
    {
      text: "The Warriors Guild demands tribute for 'protection'.",
      choices: [
        { text: "Pay the tribute", effects: { warriors: 20, merchants: -10 } },
        { text: "Refuse firmly", effects: { warriors: -30, scholars: 10 } },
        { text: "Negotiate a deal", effects: { warriors: 5, merchants: 5 } },
      ]
    },
    {
      text: "Merchants offer exclusive trade rights.",
      choices: [
        { text: "Accept the deal", effects: { merchants: 25, scholars: -15 } },
        { text: "Decline politely", effects: { merchants: -10, scholars: 5 } },
        { text: "Counter-offer", effects: { merchants: 10, warriors: -5 } },
      ]
    },
    {
      text: "Scholars seek funding for research.",
      choices: [
        { text: "Fund generously", effects: { scholars: 30, merchants: -20 } },
        { text: "Offer limited support", effects: { scholars: 10 } },
        { text: "Redirect to military", effects: { scholars: -15, warriors: 20 } },
      ]
    },
    {
      text: "The Mystics offer a prophecy... for a price.",
      choices: [
        { text: "Pay for the prophecy", effects: { mystics: 25, merchants: -10 } },
        { text: "Demand it freely", effects: { mystics: -20, warriors: 10 } },
        { text: "Trade knowledge", effects: { mystics: 15, scholars: 15 } },
      ]
    },
    {
      text: "Two factions are in conflict. You must mediate.",
      choices: [
        { text: "Side with Warriors", effects: { warriors: 30, merchants: -25 } },
        { text: "Side with Merchants", effects: { merchants: 30, warriors: -25 } },
        { text: "Propose compromise", effects: { warriors: 5, merchants: 5, scholars: 10 } },
      ]
    },
    {
      text: "A grand festival is being planned.",
      choices: [
        { text: "Host lavishly", effects: { warriors: 10, merchants: 10, scholars: 10, mystics: 10 } },
        { text: "Invite only allies", effects: { warriors: 15, scholars: -10 } },
        { text: "Skip the festival", effects: { warriors: -5, merchants: -5, scholars: -5, mystics: -5 } },
      ]
    },
  ];

  const startTurn = () => {
    playSFX('buttonPress');
    const event = events[Math.floor(Math.random() * events.length)];
    setCurrentEvent(event);
  };

  const makeChoice = (choiceIndex: number) => {
    if (!currentEvent) return;
    
    playSFX('select');
    const choice = currentEvent.choices[choiceIndex];
    
    setFactions(prev => prev.map(faction => ({
      ...faction,
      relation: Math.max(-100, Math.min(100, faction.relation + (choice.effects[faction.id] || 0)))
    })));
    
    setCurrentEvent(null);
    
    if (turn >= TURNS_TO_WIN) {
      checkWinCondition();
    } else {
      playSFX('levelUp');
      setTurn(t => t + 1);
    }
  };

  const checkWinCondition = async () => {
    const allies = factions.filter(f => f.relation >= ALLY_THRESHOLD);
    const isWin = allies.length >= 3;
    
    setGameOver(true);
    setWon(isWin);
    
    if (isWin) {
      playSFX('jackpot');
      const keys = 2 + Math.floor(bullsOwned / 2);
      setKeysEarned(keys);
      await awardKeys(keys);
    } else {
      playSFX('lose');
    }
  };

  const resetGame = () => {
    setFactions([
      { id: 'warriors', name: 'Warriors Guild', emoji: '⚔️', relation: 0 + bonusRelation, power: 80, trait: 'Aggressive' },
      { id: 'merchants', name: 'Merchant League', emoji: '💰', relation: 0 + bonusRelation, power: 60, trait: 'Greedy' },
      { id: 'scholars', name: 'Scholar Circle', emoji: '📚', relation: 0 + bonusRelation, power: 40, trait: 'Neutral' },
      { id: 'mystics', name: 'Mystic Order', emoji: '🔮', relation: 0 + bonusRelation, power: 70, trait: 'Unpredictable' },
    ]);
    setTurn(1);
    setCurrentEvent(null);
    setGameOver(false);
    setWon(false);
    setKeysEarned(0);
  };

  const getRelationColor = (relation: number) => {
    if (relation >= 50) return 'text-green-400';
    if (relation >= 0) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getRelationLabel = (relation: number) => {
    if (relation >= 75) return 'Allied';
    if (relation >= 50) return 'Friendly';
    if (relation >= 0) return 'Neutral';
    if (relation >= -50) return 'Unfriendly';
    return 'Hostile';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bull-pattern flex items-center justify-center">
        <div className="text-2xl text-primary animate-pulse">Loading...</div>
      </div>
    );
  }

  if (!isAuthorized) return null;

  const allies = factions.filter(f => f.relation >= ALLY_THRESHOLD).length;

  return (
    <div className="min-h-screen bull-pattern p-4">
      <div className="flex justify-between items-center mb-4">
        <Button variant="ghost" onClick={() => navigate('/')}>
          <ArrowLeft className="w-5 h-5 mr-2" /> Back
        </Button>
        <CreditBar />
      </div>

      <Card className="max-w-2xl mx-auto p-6 bg-card/95 backdrop-blur">
        <div className="text-center mb-4">
          <h1 className="text-3xl font-bold gradient-gold bg-clip-text text-transparent flex items-center justify-center gap-2">
            <Handshake className="w-8 h-8 text-amber-500" />
            Bull Diplomacy
          </h1>
          <p className="text-muted-foreground">Win 3+ faction alliances in {TURNS_TO_WIN} turns!</p>
          <div className="text-sm text-amber-400 mt-2">🐂 {bullsOwned} Bulls = +{bonusRelation} starting relations</div>
        </div>

        {gameOver ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-4">{won ? '🤝' : '⚔️'}</div>
            <h2 className="text-2xl font-bold mb-2">
              {won ? 'Diplomatic Victory!' : 'Diplomatic Failure!'}
            </h2>
            <p className="mb-4">Allies secured: {allies}/4</p>
            {keysEarned > 0 && (
              <p className="text-lg text-amber-400 mb-4">+{keysEarned} 🔑 earned!</p>
            )}
            <Button onClick={resetGame} size="lg">Negotiate Again</Button>
          </div>
        ) : (
          <>
            <div className="flex justify-between mb-4 text-sm">
              <span>🗓️ Turn: {turn}/{TURNS_TO_WIN}</span>
              <span>🤝 Allies: {allies}/3 needed</span>
            </div>

            {/* Faction Status */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              {factions.map(faction => (
                <div key={faction.id} className="bg-muted/50 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xl">{faction.emoji}</span>
                    <span className="font-bold text-sm">{faction.name}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className={`text-xs ${getRelationColor(faction.relation)}`}>
                      {getRelationLabel(faction.relation)}
                    </span>
                    <span className="text-xs">{faction.relation > 0 ? '+' : ''}{faction.relation}</span>
                  </div>
                  <div className="w-full h-2 bg-gray-700 rounded mt-1">
                    <div 
                      className={`h-full rounded transition-all ${
                        faction.relation >= 50 ? 'bg-green-500' :
                        faction.relation >= 0 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${Math.max(0, (faction.relation + 100) / 2)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {currentEvent ? (
              <div className="bg-muted/50 rounded-lg p-4">
                <p className="text-lg mb-4 text-center">{currentEvent.text}</p>
                <div className="space-y-2">
                  {currentEvent.choices.map((choice, i) => (
                    <Button
                      key={i}
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => makeChoice(i)}
                    >
                      {choice.text}
                    </Button>
                  ))}
                </div>
              </div>
            ) : (
              <Button onClick={startTurn} className="w-full" size="lg">
                <Users className="w-4 h-4 mr-2" />
                Begin Turn {turn}
              </Button>
            )}
          </>
        )}
      </Card>
    </div>
  );
}

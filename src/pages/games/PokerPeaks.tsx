import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { useGameLogic } from "@/hooks/useGameLogic";
import { CreditBar } from "@/components/CreditBar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const SUITS = ["♠", "♥", "♦", "♣"];
const RANKS = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];

interface CardType {
  suit: string;
  rank: string;
}

export default function PokerPeaks() {
  const navigate = useNavigate();
  const { credits, diamonds, keys, updateCredits, updateDiamonds, updateKeys } = useGameLogic();
  const [autoStarting, setAutoStarting] = useState(true);
  const [gameActive, setGameActive] = useState(false);
  const [round, setRound] = useState(1);
  const [hand, setHand] = useState<CardType[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [totalDiamonds, setTotalDiamonds] = useState(0);
  const [gameFinished, setGameFinished] = useState(false);

  useEffect(() => {
    const startGameAuto = async () => {
      try {
        if (keys <= 0) {
          toast.error("You need a key to play this game!");
          navigate("/dashboard");
          return;
        }

        const { error } = await updateKeys(-1);
        if (error) {
          toast.error("Failed to deduct key. Please try again.");
          navigate("/dashboard");
          return;
        }

        toast.success("Key used! Game starting...");
        dealNewHand();
        setGameActive(true);
        setRound(1);
        setTotalDiamonds(0);
        setGameFinished(false);
        setAutoStarting(false);
      } catch (error) {
        console.error("Error starting game:", error);
        toast.error("Failed to start game");
        navigate("/dashboard");
      }
    };

    startGameAuto();
  }, []);

  const dealNewHand = () => {
    const deck: CardType[] = [];
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        deck.push({ suit, rank });
      }
    }

    const shuffled = deck.sort(() => Math.random() - 0.5);
    setHand(shuffled.slice(0, 5));
    setSelectedIndices([]);
  };

  const evaluateHand = (cards: CardType[]): { name: string; multiplier: number } => {
    const rankCounts: Record<string, number> = {};
    const suitCounts: Record<string, number> = {};

    cards.forEach(card => {
      rankCounts[card.rank] = (rankCounts[card.rank] || 0) + 1;
      suitCounts[card.suit] = (suitCounts[card.suit] || 0) + 1;
    });

    const counts = Object.values(rankCounts).sort((a, b) => b - a);
    const isFlush = Object.values(suitCounts).some(count => count === 5);

    if (counts[0] === 4) return { name: "Four of a Kind", multiplier: 25 };
    if (counts[0] === 3 && counts[1] === 2) return { name: "Full House", multiplier: 15 };
    if (isFlush) return { name: "Flush", multiplier: 10 };
    if (counts[0] === 3) return { name: "Three of a Kind", multiplier: 6 };
    if (counts[0] === 2 && counts[1] === 2) return { name: "Two Pair", multiplier: 4 };
    if (counts[0] === 2) return { name: "Pair", multiplier: 2 };
    return { name: "High Card", multiplier: 0 };
  };

  const submitHand = async () => {
    if (!gameActive) return;

    const result = evaluateHand(hand);
    const earned = result.multiplier * round;

    if (earned > 0) {
      setTotalDiamonds((prev) => prev + earned);
      toast.success(`${result.name}! Earned ${earned} 💎`);
    } else {
      toast.error(`${result.name}. No diamonds this round.`);
    }

    if (round >= 10) {
      endGame();
    } else {
      setRound((r) => r + 1);
      dealNewHand();
    }
  };

  const toggleCard = (index: number) => {
    if (selectedIndices.includes(index)) {
      setSelectedIndices(selectedIndices.filter(i => i !== index));
    } else if (selectedIndices.length < 3) {
      setSelectedIndices([...selectedIndices, index]);
    }
  };

  const replaceCards = () => {
    const deck: CardType[] = [];
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        if (!hand.some(c => c.suit === suit && c.rank === rank)) {
          deck.push({ suit, rank });
        }
      }
    }

    const shuffled = deck.sort(() => Math.random() - 0.5);
    const newHand = [...hand];
    
    selectedIndices.forEach((idx, i) => {
      newHand[idx] = shuffled[i];
    });

    setHand(newHand);
    setSelectedIndices([]);
    toast.info("Cards replaced!");
  };

  const endGame = async () => {
    setGameActive(false);
    setGameFinished(true);
    await updateDiamonds(totalDiamonds);
    toast.success(`Completed 10 rounds! Earned ${totalDiamonds} 💎`);
  };

  if (autoStarting) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-background/80 p-4">
        <CreditBar credits={credits} diamonds={diamonds} keys={keys} />
        <Card className="max-w-4xl mx-auto p-8 text-center">
          <p className="text-xl">Loading game...</p>
        </Card>
      </div>
    );
  }

  if (gameFinished) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-background/80 p-4">
        <CreditBar credits={credits} diamonds={diamonds} keys={keys} />
        <Card className="max-w-4xl mx-auto p-8 text-center space-y-6">
          <h2 className="text-3xl font-bold gradient-gold bg-clip-text text-transparent">
            Run Finished!
          </h2>
          <p className="text-xl">Rounds Completed: {round}</p>
          <p className="text-xl">Total Diamonds: {totalDiamonds} 💎</p>
          <p className="text-muted-foreground">Thanks for playing!</p>
          <Button onClick={() => navigate("/dashboard")} size="lg">
            Return to Dashboard
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/80 p-4">
      <CreditBar credits={credits} diamonds={diamonds} keys={keys} />
      
      <Card className="max-w-4xl mx-auto p-8">
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold gradient-gold bg-clip-text text-transparent">
              Poker Peaks
            </h1>
            <Button onClick={() => navigate("/dashboard")} variant="outline">
              Exit Game
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <p className="text-muted-foreground">Round</p>
              <p className="text-2xl font-bold">{round}/10</p>
            </div>
            <div>
              <p className="text-muted-foreground">Diamonds</p>
              <p className="text-2xl font-bold">{totalDiamonds} 💎</p>
            </div>
          </div>

          <div className="flex justify-center gap-2 flex-wrap">
            {hand.map((card, idx) => (
              <Button
                key={idx}
                onClick={() => toggleCard(idx)}
                variant={selectedIndices.includes(idx) ? "default" : "outline"}
                className="h-32 w-24 text-3xl flex flex-col items-center justify-center"
                style={{
                  color: card.suit === "♥" || card.suit === "♦" ? "#ef4444" : "#000"
                }}
              >
                <span>{card.rank}</span>
                <span>{card.suit}</span>
              </Button>
            ))}
          </div>

          <div className="flex gap-2 justify-center">
            <Button
              onClick={replaceCards}
              disabled={selectedIndices.length === 0}
            >
              Replace Selected ({selectedIndices.length}/3)
            </Button>
            <Button
              onClick={submitHand}
              variant="default"
              size="lg"
            >
              Submit Hand
            </Button>
          </div>

          <div className="text-sm text-center text-muted-foreground space-y-1">
            <p>Select up to 3 cards to replace before submitting</p>
            <p>Pair: 2x | Two Pair: 4x | Three: 6x | Flush: 10x | Full House: 15x | Four: 25x</p>
          </div>
        </div>
      </Card>
    </div>
  );
}

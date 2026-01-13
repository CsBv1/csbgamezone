import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import holyBull from "@/assets/holy-bull.jpeg";
import { useBullWorldNavigation } from "@/hooks/useBullWorldNavigation";
import { audioManager } from "@/hooks/useAudioManager";

// Start music when entering game
audioManager.startBackgroundMusic();

const HiLo = () => {
  const { goBack, getBackLabel } = useBullWorldNavigation();
  const [currentCard, setCurrentCard] = useState(7);
  const [nextCard, setNextCard] = useState<number | null>(null);
  const [credits, setCredits] = useState(1000);
  const [streak, setStreak] = useState(0);
  const [playing, setPlaying] = useState(false);

  const startGame = () => {
    if (credits < 50) {
      audioManager.playSFX('error');
      toast.error("Not enough credits!");
      return;
    }
    audioManager.playSFX('cardDeal');
    setCredits(credits - 50);
    setCurrentCard(Math.floor(Math.random() * 13) + 1);
    setNextCard(null);
    setStreak(0);
    setPlaying(true);
  };

  const guess = (higher: boolean) => {
    audioManager.playSFX('cardFlip');
    const next = Math.floor(Math.random() * 13) + 1;
    setNextCard(next);

    const correct = higher ? next > currentCard : next < currentCard;
    
    if (correct) {
      audioManager.playSFX('win');
      const newStreak = streak + 1;
      setStreak(newStreak);
      const winAmount = 25 * newStreak;
      setCredits(c => c + winAmount);
      toast.success(`🐂 Correct! +${winAmount} credits (${newStreak}x streak)`);
      
      setTimeout(() => {
        setCurrentCard(next);
        setNextCard(null);
      }, 1000);
    } else {
      audioManager.playSFX('lose');
      toast.error("Wrong! Game over!");
      setPlaying(false);
    }
  };

  const cashOut = () => {
    audioManager.playSFX('collect');
    toast.success(`Cashed out with ${streak}x streak! 🐂`);
    setPlaying(false);
  };

  const getCardDisplay = (card: number) => {
    if (card === 1) return "A";
    if (card === 11) return "J";
    if (card === 12) return "Q";
    if (card === 13) return "K";
    return card.toString();
  };

  return (
    <div className="min-h-screen bull-pattern">
      <header className="border-b border-border/50 backdrop-blur-sm bg-background/80">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" onClick={goBack}>
            <ArrowLeft className="w-5 h-5" />
            {getBackLabel()}
          </Button>
          <h1 className="text-4xl font-bold gradient-gold bg-clip-text text-transparent mt-2">
            Hi-Lo 🐂
          </h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Card className="max-w-2xl mx-auto p-8 bg-card/95 backdrop-blur">
          <div className="flex justify-between items-center mb-8">
            <div className="text-2xl font-bold text-primary">Credits: {credits}</div>
            <img src={holyBull} alt="Holy Bull" className="w-16 h-16 rounded-full border-4 border-primary shadow-lg" />
          </div>

          {!playing ? (
            <div className="text-center py-12">
              <Button variant="gold" size="xl" onClick={startGame}>
                Start Game (50 credits)
              </Button>
            </div>
          ) : (
            <>
              <div className="text-center mb-8">
                <p className="text-lg font-bold mb-4">Streak: {streak}x</p>
                <div className="flex justify-center gap-8 items-center">
                  <div className="w-32 h-44 bg-gradient-to-br from-primary to-primary/50 rounded-lg flex items-center justify-center text-6xl font-bold text-primary-foreground shadow-lg">
                    {getCardDisplay(currentCard)}
                  </div>
                  {nextCard !== null && (
                    <div className="w-32 h-44 bg-gradient-to-br from-secondary to-secondary/50 rounded-lg flex items-center justify-center text-6xl font-bold text-secondary-foreground shadow-lg">
                      {getCardDisplay(nextCard)}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-4 mb-6">
                <Button
                  variant="default"
                  size="xl"
                  className="flex-1 h-24 text-2xl bg-green-600 hover:bg-green-700"
                  onClick={() => guess(true)}
                  disabled={nextCard !== null}
                >
                  Higher ⬆️
                </Button>
                <Button
                  variant="default"
                  size="xl"
                  className="flex-1 h-24 text-2xl bg-red-600 hover:bg-red-700"
                  onClick={() => guess(false)}
                  disabled={nextCard !== null}
                >
                  Lower ⬇️
                </Button>
              </div>

              {streak > 0 && (
                <Button variant="gold" size="lg" className="w-full" onClick={cashOut}>
                  Cash Out ({streak * 25} credits earned)
                </Button>
              )}
            </>
          )}

          <div className="mt-6 p-4 bg-muted/50 rounded-lg">
            <h3 className="font-bold mb-2">How to Play:</h3>
            <p className="text-sm text-muted-foreground">
              Guess if the next card will be higher or lower. Each correct guess increases your streak multiplier! 🐂
            </p>
          </div>
        </Card>
      </main>
    </div>
  );
};

export default HiLo;

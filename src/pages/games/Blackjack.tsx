import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import holyBull from "@/assets/holy-bull.jpeg";
import { useBullWorldNavigation } from "@/hooks/useBullWorldNavigation";

const Blackjack = () => {
  const { goBack, getBackLabel } = useBullWorldNavigation();
  const [playerHand, setPlayerHand] = useState<number[]>([]);
  const [dealerHand, setDealerHand] = useState<number[]>([]);
  const [credits, setCredits] = useState(1000);
  const [playing, setPlaying] = useState(false);
  const [dealerRevealed, setDealerRevealed] = useState(false);

  const getRandomCard = () => Math.floor(Math.random() * 13) + 1;

  const calculateTotal = (hand: number[]) => {
    let total = 0;
    let aces = 0;
    hand.forEach(card => {
      if (card === 1) aces++;
      total += card > 10 ? 10 : card;
    });
    while (total <= 11 && aces > 0) {
      total += 10;
      aces--;
    }
    return total;
  };

  const startGame = () => {
    if (credits < 50) {
      toast.error("Not enough credits! Minimum bet: 50");
      return;
    }
    setCredits(credits - 50);
    const newPlayerHand = [getRandomCard(), getRandomCard()];
    const newDealerHand = [getRandomCard(), getRandomCard()];
    setPlayerHand(newPlayerHand);
    setDealerHand(newDealerHand);
    setPlaying(true);
    setDealerRevealed(false);
  };

  const hit = () => {
    const newHand = [...playerHand, getRandomCard()];
    setPlayerHand(newHand);
    if (calculateTotal(newHand) > 21) {
      endGame(newHand, dealerHand);
    }
  };

  const stand = () => {
    let newDealerHand = [...dealerHand];
    while (calculateTotal(newDealerHand) < 17) {
      newDealerHand.push(getRandomCard());
    }
    setDealerHand(newDealerHand);
    endGame(playerHand, newDealerHand);
  };

  const endGame = (pHand: number[], dHand: number[]) => {
    setDealerRevealed(true);
    const playerTotal = calculateTotal(pHand);
    const dealerTotal = calculateTotal(dHand);
    
    setTimeout(() => {
      if (playerTotal > 21) {
        toast.error("Bust! You lose 🐂");
      } else if (dealerTotal > 21) {
        setCredits(c => c + 100);
        toast.success("Dealer busts! You win! 🎉");
      } else if (playerTotal > dealerTotal) {
        setCredits(c => c + 100);
        toast.success("You win! 🐂");
      } else if (playerTotal < dealerTotal) {
        toast.error("Dealer wins!");
      } else {
        setCredits(c => c + 50);
        toast("Push! Bet returned");
      }
      setPlaying(false);
    }, 500);
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
            Blackjack 🐂
          </h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Card className="max-w-4xl mx-auto p-8 bg-card/95 backdrop-blur">
          <div className="flex justify-between items-center mb-8">
            <div className="text-2xl font-bold text-primary">Credits: {credits}</div>
            <img src={holyBull} alt="Holy Bull" className="w-20 h-20 rounded-full border-4 border-primary shadow-lg" />
          </div>

          {!playing && playerHand.length === 0 && (
            <div className="text-center py-12">
              <Button variant="gold" size="xl" onClick={startGame}>
                Deal Cards (50 credits)
              </Button>
            </div>
          )}

          {playerHand.length > 0 && (
            <>
              <div className="mb-8">
                <h3 className="text-xl font-bold mb-4">Dealer's Hand {dealerRevealed && `(${calculateTotal(dealerHand)})`}</h3>
                <div className="flex gap-4">
                  {dealerHand.map((card, i) => (
                    <div key={i} className="w-24 h-32 bg-gradient-to-br from-primary to-primary/50 rounded-lg flex items-center justify-center text-4xl font-bold text-primary-foreground shadow-lg">
                      {dealerRevealed || i === 0 ? getCardDisplay(card) : "🐂"}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-xl font-bold mb-4">Your Hand ({calculateTotal(playerHand)})</h3>
                <div className="flex gap-4 mb-6">
                  {playerHand.map((card, i) => (
                    <div key={i} className="w-24 h-32 bg-gradient-to-br from-secondary to-secondary/50 rounded-lg flex items-center justify-center text-4xl font-bold text-secondary-foreground shadow-lg">
                      {getCardDisplay(card)}
                    </div>
                  ))}
                </div>
              </div>

              {playing && (
                <div className="flex gap-4 justify-center">
                  <Button variant="default" size="lg" onClick={hit}>Hit</Button>
                  <Button variant="outline" size="lg" onClick={stand}>Stand</Button>
                </div>
              )}

              {!playing && (
                <div className="text-center">
                  <Button variant="gold" size="lg" onClick={startGame}>
                    New Game (50 credits)
                  </Button>
                </div>
              )}
            </>
          )}
        </Card>
      </main>
    </div>
  );
};

export default Blackjack;

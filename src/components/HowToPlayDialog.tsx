import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { BookOpen } from 'lucide-react';

export const HowToPlayDialog = () => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="border-cyan-400 text-cyan-300 hover:bg-cyan-400/10">
          <BookOpen className="w-4 h-4 mr-1" /> How to Play
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <BookOpen className="w-5 h-5 text-cyan-400" /> How to Play — Cardano Stake Bulls
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Card className="p-3 bg-card/60 border border-primary/30">
            <h4 className="font-bold mb-2 text-foreground">🎬 Video Tutorial</h4>
            <div className="aspect-video rounded-lg overflow-hidden bg-muted/50 border border-border">
              <video className="w-full h-full object-cover" controls preload="metadata">
                <source src="/csb-gameplay-tutorial.mp4" type="video/mp4" />
                Your browser does not support video.
              </video>
            </div>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              { title: "🐂 Earn Diamonds", steps: ["Play Mining/Milking/Kingdom games", "Earn credits + diamonds", "Trade 100 credits → 5 💎"] },
              { title: "🔑 Get Keys", steps: ["Swap 1M 💎 → 1 🔑", "Keys unlock advanced games", "Higher risk = bigger rewards"] },
              { title: "👑 Holder Strategy", steps: ["Hold a CSB Bull NFT or Subscribe", "Unlocks 60+ strategy games", "Win Keys & exclusive rewards"] },
              { title: "⚡ CSB Game Zone", steps: ["Tap ⚡ CSB Zone button", "Earn $CsBv1 token", "Level up bulls in NFT Power"] },
              { title: "⚔️ Bull Battle", steps: ["Battle AI or PvP (3x reward)", "Stronger bulls = more $CsBv1", "Combo attacks for damage boost"] },
              { title: "🌍 Bull World", steps: ["Multiplayer hub (1 🔑 to enter)", "Meet players, chat & emote", "Race, stampede & explore"] },
            ].map(g => (
              <Card key={g.title} className="p-3 bg-card/60 border border-primary/20">
                <h4 className="font-bold text-sm mb-1 text-foreground">{g.title}</h4>
                <ol className="text-xs text-muted-foreground space-y-0.5">
                  {g.steps.map((s, i) => (
                    <li key={i} className="flex gap-1.5"><span className="text-primary font-bold">{i + 1}.</span>{s}</li>
                  ))}
                </ol>
              </Card>
            ))}
          </div>

          <Card className="p-3 bg-gradient-to-br from-amber-500/10 to-card border border-amber-500/30">
            <h4 className="font-bold mb-1 text-amber-300">💡 Pro Tips</h4>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• Claim your Daily Bonus every day to stack streak rewards</li>
              <li>• Holders get +10% reward boost per Bull NFT held</li>
              <li>• Subscribers count as Bull-equivalents (Tier 1=1, Tier 2=4, Tier 3=10)</li>
              <li>• Top 10 players each season earn special prizes</li>
            </ul>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};

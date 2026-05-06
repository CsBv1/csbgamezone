import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Coins, Crown, Flag, Trophy, Sparkles, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useCsbv1 } from "@/hooks/useCsbv1";
import { useCardanoWallet } from "@/hooks/useCardanoWallet";
import { useNFTBonuses } from "@/hooks/useNFTBonuses";

const RARITY_BASE: Record<string, number> = { common: 1, rare: 1.3, epic: 1.6, legendary: 2 };
const TRACK_LENGTH = 100;

interface CsbBull { nft_id: string; nft_name: string; rarity: string; level: number; image?: string }
interface Racer { name: string; image?: string; pos: number; speed: number; isMe: boolean; color: string }

const AI_NAMES = ['Storm Hoof', 'Iron Bull', 'Crimson Rush', 'Thunder Charge'];
const AI_COLORS = ['bg-red-500', 'bg-orange-500', 'bg-purple-500', 'bg-pink-500'];

export default function CsbBullRace() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { connectedWallet } = useCardanoWallet();
  const { nfts: walletNfts } = useNFTBonuses(connectedWallet?.address || null);
  const { player: csbPlayer, userId, addBalance } = useCsbv1();

  const [bulls, setBulls] = useState<CsbBull[]>([]);
  const [selected, setSelected] = useState<CsbBull | null>(null);
  const [state, setState] = useState<'select' | 'racing' | 'finish'>('select');
  const [racers, setRacers] = useState<Racer[]>([]);
  const [taps, setTaps] = useState(0);
  const [winner, setWinner] = useState<Racer | null>(null);
  const [reward, setReward] = useState(0);
  const tickRef = useRef<any>(null);

  useEffect(() => {
    const load = async () => {
      if (!userId) return;
      const { data } = await supabase.from('csbv1_nft_power' as any)
        .select('*').eq('user_id', userId).order('nft_id');
      const rows = ((data || []) as any[]).filter((r) => r.nft_id?.startsWith('csb_') && (walletNfts.length === 0 || walletNfts.some((w) => w.assetNameHex && r.nft_id === `csb_${w.assetNameHex}`)));
      const merged = rows.map((r, idx) => {
        const match = walletNfts?.find((w) => w.assetNameHex && r.nft_id === `csb_${w.assetNameHex}`);
        const numMatch = (r.nft_name || '').match(/(\d+)\s*$/);
        const num = numMatch ? numMatch[1] : String(idx + 1);
        return { ...r, image: match?.image, nft_name: `Bull #${num}` } as CsbBull;
      });
      setBulls(merged);
    };
    load();
  }, [userId, walletNfts.length]);

  useEffect(() => () => { if (tickRef.current) clearInterval(tickRef.current); }, []);

  const startRace = (bull: CsbBull) => {
    setSelected(bull);
    setTaps(0);
    setWinner(null);
    const myBase = (RARITY_BASE[bull.rarity] || 1) + bull.level * 0.05;
    const me: Racer = { name: bull.nft_name, image: bull.image, pos: 0, speed: myBase, isMe: true, color: 'bg-cyan-400' };
    const ai: Racer[] = AI_NAMES.map((n, i) => ({
      name: n, pos: 0,
      speed: 0.9 + Math.random() * 0.7,
      isMe: false, color: AI_COLORS[i],
    }));
    setRacers([me, ...ai]);
    setState('racing');

    tickRef.current = setInterval(() => {
      setRacers((prev) => {
        const next = prev.map((r) => {
          if (r.pos >= TRACK_LENGTH) return r;
          const inc = r.isMe ? 0 : (r.speed * (0.4 + Math.random() * 0.6));
          return { ...r, pos: Math.min(TRACK_LENGTH, r.pos + inc) };
        });
        const w = next.find((r) => r.pos >= TRACK_LENGTH);
        if (w) {
          clearInterval(tickRef.current);
          finishRace(w, bull);
        }
        return next;
      });
    }, 120);
  };

  const handleTap = () => {
    if (state !== 'racing' || !selected) return;
    setTaps((t) => t + 1);
    setRacers((prev) => prev.map((r) => {
      if (!r.isMe) return r;
      const myBoost = 1.2 * ((RARITY_BASE[selected.rarity] || 1) + selected.level * 0.05);
      return { ...r, pos: Math.min(TRACK_LENGTH, r.pos + myBoost) };
    }));
  };

  const finishRace = async (w: Racer, bull: CsbBull) => {
    setWinner(w);
    setState('finish');
    let earned = 0;
    if (w.isMe) {
      const rarityMult = RARITY_BASE[bull.rarity] || 1;
      earned = Math.floor((40 + bull.level * 8) * rarityMult);
      await addBalance(earned);
      if (userId) {
        await supabase.from('game_results').insert({
          user_id: userId, game_name: 'CSB Bull Race', result: 'win', diamonds_won: 0,
        });
      }
      toast({ title: '🏁 You Won!', description: `+${earned} $CsBv1` });
    } else {
      earned = Math.floor(8 + bull.level * 2);
      await addBalance(earned);
      toast({ title: '🏁 Race finished', description: `Consolation: +${earned} $CsBv1` });
    }
    setReward(earned);
  };

  const reset = () => { setState('select'); setSelected(null); setRacers([]); setWinner(null); };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-sky-950/40 to-slate-950 text-foreground p-3 md:p-6">
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate('/')} className="gap-2">
            <ArrowLeft className="w-4 h-4" /> Dashboard
          </Button>
          <div className="flex items-center gap-2 text-amber-300 text-sm">
            <Coins className="w-4 h-4" /> {csbPlayer?.balance.toLocaleString() || 0} $CsBv1
          </div>
        </div>

        <div className="text-center">
          <h1 className="text-3xl md:text-4xl font-black bg-gradient-to-r from-sky-300 via-cyan-300 to-blue-400 bg-clip-text text-transparent">
            🏁 CSB BULL RACE
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Tap to charge your bull. First to the finish wins <span className="text-amber-300">$CsBv1</span>!
          </p>
        </div>

        {state === 'select' && (
          <>
            {bulls.length === 0 ? (
              <Card className="p-10 text-center bg-slate-900/50 border-slate-700">
                <Sparkles className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                <p className="text-muted-foreground mb-3">No CSB Bulls registered. Visit NFT Power first.</p>
                <Button onClick={() => navigate('/csb/nft-power')}>Go to NFT Power</Button>
              </Card>
            ) : (
              <div>
                <h2 className="text-lg font-bold mb-3 text-center">Pick your racer</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {bulls.map((b) => (
                    <Card key={b.nft_id} onClick={() => startRace(b)}
                      className="p-3 bg-gradient-to-br from-sky-700 to-blue-900 border-2 border-sky-300/30 cursor-pointer hover:scale-[1.02] transition-transform">
                      <div className="aspect-square rounded-lg bg-black/40 flex items-center justify-center mb-2 overflow-hidden ring-1 ring-white/10">
                        {b.image ? <img src={b.image} alt={b.nft_name} className="w-full h-full object-cover" /> : <Crown className="w-10 h-10 text-amber-300" />}
                      </div>
                      <div className="text-[10px] uppercase tracking-widest font-extrabold text-cyan-300 drop-shadow-[0_0_6px_rgba(34,211,238,0.9)]">Legendary</div>
                      <div className="font-bold text-sm">{b.nft_name}</div>
                      <div className="text-xs opacity-90">Lv {b.level} · Speed {((RARITY_BASE[b.rarity] || 1) + b.level * 0.05).toFixed(2)}</div>
                      <Button size="sm" className="w-full mt-2"><Flag className="w-3 h-3 mr-1" /> Race</Button>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {(state === 'racing' || state === 'finish') && (
          <Card className="bg-slate-900/80 border-sky-800/40 p-4 space-y-3">
            <div className="space-y-2">
              {racers.map((r, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className={r.isMe ? 'text-cyan-300 font-bold' : 'text-muted-foreground'}>
                      {r.isMe ? '🐂 ' : '🤖 '}{r.name}
                    </span>
                    <span className="text-muted-foreground">{Math.floor(r.pos)}%</span>
                  </div>
                  <div className="relative h-6 bg-slate-800 rounded overflow-hidden">
                    <div className={`absolute inset-y-0 left-0 ${r.color} transition-all`} style={{ width: `${r.pos}%` }} />
                    <div className="absolute right-1 top-1/2 -translate-y-1/2 text-xs">🏁</div>
                  </div>
                </div>
              ))}
            </div>

            {state === 'racing' && (
              <Button onClick={handleTap} size="lg"
                className="w-full h-20 text-2xl bg-gradient-to-b from-sky-400 to-cyan-600 hover:from-sky-300 hover:to-cyan-500 active:scale-95">
                <Zap className="w-6 h-6 mr-2" /> TAP TO CHARGE! ({taps})
              </Button>
            )}

            {state === 'finish' && winner && (
              <div className="text-center space-y-3">
                <Trophy className={`w-16 h-16 mx-auto ${winner.isMe ? 'text-amber-300 animate-pulse' : 'text-slate-500'}`} />
                <h3 className="text-xl font-bold">{winner.isMe ? '🏆 VICTORY!' : `${winner.name} won`}</h3>
                <Badge className="bg-amber-600 text-base px-4 py-1">+{reward} $CsBv1</Badge>
                <div className="flex gap-2">
                  <Button onClick={() => selected && startRace(selected)} className="flex-1 bg-gradient-to-r from-sky-500 to-cyan-500">Race Again</Button>
                  <Button onClick={reset} variant="outline" className="flex-1">Pick Bull</Button>
                </div>
              </div>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}

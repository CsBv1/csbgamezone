import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Calendar, Gift, Gem, Key, Trophy, Loader2, Check } from 'lucide-react';

const getDayReward = (dayOfYear: number): { type: string; amount: number; icon: string; label: string } => {
  const cycle = dayOfYear % 7;
  switch (cycle) {
    case 0: return { type: 'diamonds', amount: 500, icon: '💎', label: '500 Diamonds' };
    case 1: return { type: 'diamonds', amount: 200, icon: '💎', label: '200 Diamonds' };
    case 2: return { type: 'diamonds', amount: 1000, icon: '💎', label: '1K Diamonds' };
    case 3: return { type: 'diamonds', amount: 300, icon: '💎', label: '300 Diamonds' };
    case 4: return { type: 'keys', amount: 1, icon: '🔑', label: '1 Key' };
    case 5: return { type: 'diamonds', amount: 2000, icon: '💎', label: '2K Diamonds' };
    case 6: return { type: 'bukals', amount: 1, icon: '🏆', label: '1 Bukal' };
    default: return { type: 'diamonds', amount: 100, icon: '💎', label: '100 Diamonds' };
  }
};

const getDayOfYear = (date: Date): number => {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
};

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const DailyCalendar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [claimedDates, setClaimedDates] = useState<Set<string>>(new Set());
  const [claiming, setClaiming] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear] = useState(new Date().getFullYear());

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  useEffect(() => {
    if (isOpen) fetchClaims();
  }, [isOpen]);

  const fetchClaims = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      const { data } = await supabase.from('daily_claims').select('claim_date').eq('user_id', user.id);
      if (data) setClaimedDates(new Set(data.map((d: any) => d.claim_date)));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const claimToday = async () => {
    setClaiming(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not logged in');

      const dayOfYear = getDayOfYear(today);
      const reward = getDayReward(dayOfYear);

      // Insert claim
      const { error: claimErr } = await supabase.from('daily_claims').insert({
        user_id: user.id,
        claim_date: todayStr,
        reward_type: reward.type,
        reward_amount: reward.amount,
      } as any);
      if (claimErr) {
        if (claimErr.code === '23505') { toast.error('Already claimed today!'); return; }
        throw claimErr;
      }

      // Award reward
      if (reward.type === 'diamonds') {
        const { data: d } = await supabase.from('user_diamonds').select('balance, total_earned').eq('user_id', user.id).single();
        await supabase.from('user_diamonds').update({
          balance: ((d as any)?.balance || 0) + reward.amount,
          total_earned: ((d as any)?.total_earned || 0) + reward.amount,
        }).eq('user_id', user.id);
      } else if (reward.type === 'keys') {
        const { data: k } = await supabase.from('user_keys').select('balance').eq('user_id', user.id).single();
        await supabase.from('user_keys').update({ balance: ((k as any)?.balance || 0) + reward.amount }).eq('user_id', user.id);
      } else if (reward.type === 'bukals') {
        const { data: b } = await supabase.from('user_bukals').select('balance').eq('user_id', user.id).maybeSingle();
        if (b) {
          await supabase.from('user_bukals').update({ balance: (b as any).balance + reward.amount }).eq('user_id', user.id);
        } else {
          await supabase.from('user_bukals').insert({ user_id: user.id, balance: reward.amount } as any);
        }
      }

      toast.success(`${reward.icon} Claimed ${reward.label}!`);
      setClaimedDates(prev => new Set([...prev, todayStr]));
    } catch (e) {
      console.error(e);
      toast.error('Failed to claim reward');
    } finally { setClaiming(false); }
  };

  const hasClaimed = claimedDates.has(todayStr);
  const dayOfYear = getDayOfYear(today);
  const todayReward = getDayReward(dayOfYear);

  // Build calendar grid for current month
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay();
  const calendarDays: (number | null)[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) calendarDays.push(null);
  for (let d = 1; d <= daysInMonth; d++) calendarDays.push(d);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Calendar className="w-4 h-4" />
          Daily Bonus
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gift className="w-5 h-5 text-yellow-500" />
            Daily Bonus Calendar
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-4 overflow-y-auto flex-1">
            {/* Today's reward */}
            <Card className="p-4 bg-gradient-to-br from-yellow-500/20 to-amber-500/10 border-2 border-yellow-500/50">
              <p className="text-sm text-muted-foreground mb-1">Today's Reward:</p>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-yellow-400">{todayReward.icon} {todayReward.label}</span>
                <Button
                  onClick={claimToday}
                  disabled={hasClaimed || claiming}
                  className={hasClaimed ? 'bg-green-600' : 'bg-gradient-to-r from-yellow-500 to-amber-500 text-black'}
                >
                  {claiming ? <Loader2 className="w-4 h-4 animate-spin" /> : hasClaimed ? <><Check className="w-4 h-4 mr-1" /> Claimed</> : 'Claim!'}
                </Button>
              </div>
            </Card>

            {/* Month navigation */}
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="sm" onClick={() => setCurrentMonth(m => Math.max(0, m - 1))} disabled={currentMonth === 0}>←</Button>
              <span className="font-bold text-foreground">{MONTH_NAMES[currentMonth]} {currentYear}</span>
              <Button variant="ghost" size="sm" onClick={() => setCurrentMonth(m => Math.min(11, m + 1))} disabled={currentMonth === 11}>→</Button>
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1 text-center">
              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
                <div key={d} className="text-xs font-bold text-muted-foreground py-1">{d}</div>
              ))}
              {calendarDays.map((day, i) => {
                if (day === null) return <div key={`empty-${i}`} />;
                const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const claimed = claimedDates.has(dateStr);
                const isToday = dateStr === todayStr;
                const date = new Date(currentYear, currentMonth, day);
                const doy = getDayOfYear(date);
                const reward = getDayReward(doy);
                const isPast = date < new Date(today.getFullYear(), today.getMonth(), today.getDate());

                return (
                  <div
                    key={dateStr}
                    className={`p-1 rounded text-xs transition-all ${
                      isToday ? 'ring-2 ring-yellow-400 bg-yellow-500/20 font-bold' :
                      claimed ? 'bg-green-500/20 text-green-400' :
                      isPast ? 'opacity-30' : 'bg-muted/30'
                    }`}
                    title={`${reward.label}`}
                  >
                    <div className="text-[10px]">{day}</div>
                    <div className="text-[10px]">{claimed ? '✅' : reward.icon}</div>
                  </div>
                );
              })}
            </div>

            {/* Weekly reward schedule */}
            <div className="text-xs text-muted-foreground space-y-1">
              <p className="font-semibold text-foreground">Weekly Cycle:</p>
              <div className="grid grid-cols-7 gap-1 text-center">
                {['💎500', '💎200', '💎1K', '💎300', '🔑1', '💎2K', '🏆1'].map((r, i) => (
                  <div key={i} className="p-1 rounded bg-muted/30 text-[9px]">{['Su','Mo','Tu','We','Th','Fr','Sa'][i]}<br/>{r}</div>
                ))}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

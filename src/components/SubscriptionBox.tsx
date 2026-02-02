import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Crown, Zap, Shield, Check } from "lucide-react";
import { useSubscription, SUBSCRIPTION_TIERS } from "@/hooks/useSubscription";

interface SubscriptionBoxProps {
  bullsOwned: number;
}

export function SubscriptionBox({ bullsOwned }: SubscriptionBoxProps) {
  const { subscribed, tier, bulls: subBulls, buff, loading, subscribe } = useSubscription();

  const totalBulls = bullsOwned + subBulls;
  const hasSubscription = subscribed && tier;

  return (
    <Card className="p-4 bg-gradient-to-br from-purple-900/50 to-indigo-900/50 border-purple-500/30">
      <div className="text-center mb-4">
        <h3 className="text-xl font-bold bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent flex items-center justify-center gap-2">
          <Crown className="w-5 h-5 text-yellow-400" />
          Bull Holder Status
        </h3>
        
        {/* Current status display */}
        <div className="mt-3 p-3 rounded-lg bg-black/30 border border-purple-500/20">
          <div className="flex items-center justify-center gap-4">
            <div className="text-center">
              <p className="text-sm text-purple-300">Wallet Bulls</p>
              <p className="text-2xl font-bold text-[#00D4FF]">{bullsOwned} 🐂</p>
            </div>
            {hasSubscription && (
              <>
                <div className="text-purple-400 text-2xl">+</div>
                <div className="text-center">
                  <p className="text-sm text-purple-300">Sub Bulls</p>
                  <p className="text-2xl font-bold text-yellow-400">{subBulls} 🐂</p>
                </div>
              </>
            )}
            <div className="text-purple-400 text-2xl">=</div>
            <div className="text-center">
              <p className="text-sm text-purple-300">Total</p>
              <p className="text-2xl font-bold text-green-400">{totalBulls} 🐂</p>
            </div>
          </div>

          {hasSubscription && (
            <div className="mt-2 px-3 py-1 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-full inline-block">
              <span className="text-sm font-bold text-yellow-400">
                +{buff}% Holder Buff Active! 🔥
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Subscription tiers */}
      <div className="space-y-3">
        <p className="text-sm text-center text-purple-300 mb-2">
          {totalBulls === 0 ? "Subscribe to unlock Holder Games!" : "Upgrade your holder status:"}
        </p>
        
        <div className="grid grid-cols-1 gap-2">
          {(Object.entries(SUBSCRIPTION_TIERS) as [string, typeof SUBSCRIPTION_TIERS.tier1][]).map(([key, tierInfo]) => {
            const isCurrentTier = tier === key;
            
            return (
              <div 
                key={key}
                className={`relative p-3 rounded-lg border-2 transition-all ${
                  isCurrentTier 
                    ? 'border-yellow-400 bg-yellow-500/10' 
                    : 'border-purple-500/30 bg-black/20 hover:border-purple-400/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-10 h-10 rounded-full flex items-center justify-center text-lg"
                      style={{ backgroundColor: tierInfo.color + '30', borderColor: tierInfo.color }}
                    >
                      {tierInfo.bulls === 1 ? '🐂' : tierInfo.bulls === 4 ? '🐂🐂' : '👑'}
                    </div>
                    <div>
                      <p className="font-bold text-white">{tierInfo.bulls} Bull{tierInfo.bulls > 1 ? 's' : ''} Hodl</p>
                      <p className="text-xs text-purple-300">+{tierInfo.buff}% buff on all games</p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    {isCurrentTier ? (
                      <div className="flex items-center gap-1 text-green-400">
                        <Check className="w-4 h-4" />
                        <span className="text-sm font-bold">Active</span>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => subscribe(key as 'tier1' | 'tier2' | 'tier3')}
                        disabled={loading}
                        className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500"
                      >
                        ${tierInfo.price}/mo
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Benefits */}
      <div className="mt-4 pt-3 border-t border-purple-500/20">
        <p className="text-xs text-center text-purple-400">
          <Shield className="w-3 h-3 inline mr-1" />
          Subscriptions unlock Holders Arena games + exclusive buffs!
        </p>
      </div>
    </Card>
  );
}

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, Zap, Crown, Star, Gem } from "lucide-react";

interface NFTBonusDisplayProps {
  bullsOwned: number;
  rarityBonus: number;
  highestRarity: string;
  isScanning: boolean;
  onRescan: () => void;
}

const RARITY_ICONS: Record<string, { icon: React.ReactNode; color: string }> = {
  legendary: { icon: <Crown className="w-5 h-5" />, color: "text-amber-400" },
  epic: { icon: <Gem className="w-5 h-5" />, color: "text-purple-400" },
  rare: { icon: <Star className="w-5 h-5" />, color: "text-blue-400" },
  common: { icon: <Zap className="w-5 h-5" />, color: "text-gray-400" },
  none: { icon: <Zap className="w-5 h-5" />, color: "text-gray-500" },
};

export function NFTBonusDisplay({
  bullsOwned,
  rarityBonus,
  highestRarity,
  isScanning,
  onRescan,
}: NFTBonusDisplayProps) {
  const rarityInfo = RARITY_ICONS[highestRarity] || RARITY_ICONS.none;

  if (bullsOwned === 0) {
    return (
      <Card className="p-4 bg-[#1a1a2e]/80 border-gray-600/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gray-700/50 flex items-center justify-center">
              <span className="text-2xl">🐂</span>
            </div>
            <div>
              <p className="text-sm text-gray-400">Bulls Owned</p>
              <p className="text-xl font-bold text-white">0</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onRescan}
            disabled={isScanning}
            className="border-gray-600 text-gray-400 hover:text-white"
          >
            <RefreshCw className={`w-4 h-4 mr-1 ${isScanning ? "animate-spin" : ""}`} />
            Scan
          </Button>
        </div>
        <p className="text-xs text-gray-500 mt-3">
          Connect a wallet with CSB Bulls to unlock NFT bonuses!
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-4 bg-gradient-to-br from-amber-900/30 to-orange-900/20 border-amber-500/30">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/30">
            <span className="text-3xl">🐂</span>
          </div>
          <div>
            <p className="text-sm text-amber-400">Bulls Owned</p>
            <p className="text-3xl font-bold text-white">{bullsOwned}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onRescan}
          disabled={isScanning}
          className="text-amber-400 hover:text-amber-300 hover:bg-amber-500/10"
        >
          <RefreshCw className={`w-4 h-4 ${isScanning ? "animate-spin" : ""}`} />
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-black/20 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <Zap className="w-4 h-4 text-amber-400" />
            <span className="text-xs text-amber-400">Power Bonus</span>
          </div>
          <p className="text-xl font-bold text-green-400">+{rarityBonus}%</p>
        </div>
        <div className="bg-black/20 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <span className={rarityInfo.color}>{rarityInfo.icon}</span>
            <span className="text-xs text-amber-400">Highest Rarity</span>
          </div>
          <p className={`text-lg font-bold capitalize ${rarityInfo.color}`}>
            {highestRarity}
          </p>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-amber-500/20">
        <p className="text-xs text-amber-400/80">
          🎮 Your NFT bonuses are active in all games!
        </p>
      </div>
    </Card>
  );
}

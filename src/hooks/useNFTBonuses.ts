import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface NFTBonus {
  bullsOwned: number;
  rarityBonus: number;
  highestRarity: string;
  nfts: Array<{ name: string; rarity: string }>;
}

export function useNFTBonuses(walletAddress: string | null) {
  const [nftBonus, setNftBonus] = useState<NFTBonus>({
    bullsOwned: 0,
    rarityBonus: 0,
    highestRarity: "none",
    nfts: [],
  });
  const [isScanning, setIsScanning] = useState(false);
  const [hasScanned, setHasScanned] = useState(false);
  const { toast } = useToast();

  const scanWallet = useCallback(async () => {
    if (!walletAddress || isScanning) return;

    setIsScanning(true);
    try {
      const { data, error } = await supabase.functions.invoke("scan-wallet-nfts", {
        body: { walletAddress },
      });

      if (error) throw error;

      setNftBonus({
        bullsOwned: data?.bullsOwned || 0,
        rarityBonus: data?.rarityBonus || 0,
        highestRarity: data?.highestRarity || "none",
        nfts: data?.nfts || [],
      });

      setHasScanned(true);

      // Save to database for persistence
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: existing } = await supabase
          .from("user_nft_bonuses")
          .select("id")
          .eq("user_id", user.id)
          .single();

        if (existing) {
          await supabase
            .from("user_nft_bonuses")
            .update({
              bulls_owned: data?.bullsOwned || 0,
              rarity_bonus: data?.rarityBonus || 0,
              highest_rarity: data?.highestRarity || "none",
              last_scanned_at: new Date().toISOString(),
            })
            .eq("user_id", user.id);
        } else {
          await supabase.from("user_nft_bonuses").insert({
            user_id: user.id,
            bulls_owned: data?.bullsOwned || 0,
            rarity_bonus: data?.rarityBonus || 0,
            highest_rarity: data?.highestRarity || "none",
          });
        }
      }

      if (data?.bullsOwned > 0) {
        toast({
          title: `🐂 ${data.bullsOwned} Bulls Detected!`,
          description: `+${data.rarityBonus}% bonus applied. Highest rarity: ${data.highestRarity}`,
        });
      }
    } catch (err) {
      console.error("NFT scan error:", err);
    } finally {
      setIsScanning(false);
    }
  }, [walletAddress, isScanning, toast]);

  // Load cached bonuses on mount
  useEffect(() => {
    const loadCachedBonuses = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from("user_nft_bonuses")
          .select("*")
          .eq("user_id", user.id)
          .single();

        if (data) {
          setNftBonus({
            bullsOwned: (data as any).bulls_owned || 0,
            rarityBonus: Number((data as any).rarity_bonus) || 0,
            highestRarity: (data as any).highest_rarity || "none",
            nfts: [],
          });
          setHasScanned(true);
        }
      }
    };

    loadCachedBonuses();
  }, []);

  // Auto-scan when wallet address is provided and not scanned yet
  useEffect(() => {
    if (walletAddress && !hasScanned && !isScanning) {
      scanWallet();
    }
  }, [walletAddress, hasScanned, isScanning, scanWallet]);

  return {
    ...nftBonus,
    isScanning,
    hasScanned,
    rescan: scanWallet,
  };
}

import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface WalletCsbNft {
  name: string;
  rarity: string;
  image?: string;
  assetNameHex?: string;
}

interface NFTBonus {
  bullsOwned: number;
  rarityBonus: number;
  highestRarity: string;
  csbTokens: number;
  nfts: WalletCsbNft[];
}

const EMPTY_BONUS: NFTBonus = {
  bullsOwned: 0,
  rarityBonus: 0,
  highestRarity: "none",
  csbTokens: 0,
  nfts: [],
};

const artworkCache = new Map<string, NFTBonus>();
const scansInFlight = new Map<string, Promise<NFTBonus>>();

function cacheKey(walletAddress: string) {
  return `csb_wallet_art_${walletAddress.toLowerCase()}`;
}

function readArtworkCache(walletAddress: string): NFTBonus | null {
  const memory = artworkCache.get(walletAddress);
  if (memory) return memory;
  try {
    const raw = localStorage.getItem(cacheKey(walletAddress));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as NFTBonus;
    if (!Array.isArray(parsed.nfts)) return null;
    artworkCache.set(walletAddress, parsed);
    return parsed;
  } catch {
    return null;
  }
}

function writeArtworkCache(walletAddress: string, bonus: NFTBonus) {
  artworkCache.set(walletAddress, bonus);
  try {
    localStorage.setItem(cacheKey(walletAddress), JSON.stringify(bonus));
  } catch {
    // Memory caching still keeps artwork available when storage is unavailable.
  }
}

export function useNFTBonuses(walletAddress: string | null) {
  const [nftBonus, setNftBonus] = useState<NFTBonus>(EMPTY_BONUS);
  const [isScanning, setIsScanning] = useState(false);
  const [hasScanned, setHasScanned] = useState(false);
  const { toast } = useToast();
  const scanningRef = useRef(false);

  const scanWallet = useCallback(async () => {
    if (!walletAddress || scanningRef.current) return;

    scanningRef.current = true;
    setIsScanning(true);
    try {
      let request = scansInFlight.get(walletAddress);
      if (!request) {
        request = (async () => {
          const { data, error } = await supabase.functions.invoke("scan-wallet-nfts", {
            body: { walletAddress },
          });
          if (error) throw error;
          return {
            bullsOwned: data?.bullsOwned || 0,
            rarityBonus: data?.rarityBonus || 0,
            highestRarity: data?.highestRarity || "none",
            csbTokens: data?.csbTokens || 0,
            nfts: data?.nfts || [],
          } satisfies NFTBonus;
        })();
        scansInFlight.set(walletAddress, request);
      }

      const result = await request;
      writeArtworkCache(walletAddress, result);
      setNftBonus(result);

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
              bulls_owned: result.bullsOwned,
              rarity_bonus: result.rarityBonus,
              highest_rarity: result.highestRarity,
              csb_tokens: result.csbTokens,
              last_scanned_at: new Date().toISOString(),
            })
            .eq("user_id", user.id);
        } else {
          await supabase.from("user_nft_bonuses").insert({
            user_id: user.id,
            bulls_owned: result.bullsOwned,
            rarity_bonus: result.rarityBonus,
            highest_rarity: result.highestRarity,
            csb_tokens: result.csbTokens,
          } as any);
        }
      }

      if (result.bullsOwned > 0) {
        toast({
          title: `🐂 ${result.bullsOwned} Bull${result.bullsOwned > 1 ? 's' : ''} Detected!`,
          description: `+${result.rarityBonus}% bonus applied (10% per bull)`,
        });
      }
    } catch (err) {
      console.error("NFT scan error:", err);
    } finally {
      scansInFlight.delete(walletAddress);
      scanningRef.current = false;
      setIsScanning(false);
    }
  }, [walletAddress, toast]);

  // Load cached bonuses on mount
  useEffect(() => {
    if (!walletAddress) {
      setNftBonus(EMPTY_BONUS);
      setHasScanned(false);
      return;
    }

    const cachedArtwork = readArtworkCache(walletAddress);
    if (cachedArtwork) setNftBonus(cachedArtwork);

    const loadCachedBonuses = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from("user_nft_bonuses")
          .select("*")
          .eq("user_id", user.id)
          .single();

        if (data) {
          setNftBonus((current) => ({
            bullsOwned: (data as any).bulls_owned || 0,
            rarityBonus: Number((data as any).rarity_bonus) || 0,
            highestRarity: (data as any).highest_rarity || "none",
            csbTokens: Number((data as any).csb_tokens) || 0,
            nfts: current.nfts,
          }));
          // Do NOT mark as scanned: cached rows carry no NFT artwork,
          // so we still need a live scan to render bull images.
        }
      }
    };

    loadCachedBonuses();
  }, [walletAddress]);

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

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { WalletCsbNft } from "@/hooks/useNFTBonuses";

export interface HeldCsbBull {
  nft_id: string;
  nft_name: string;
  rarity: string;
  level: number;
  image?: string;
}

/**
 * Returns CSB bulls from csbv1_nft_power filtered to those CURRENTLY in the wallet.
 * Renames to "Bull #N" and attaches wallet image.
 */
export function useHeldCsbBulls(
  userId: string | null | undefined,
  walletNfts: WalletCsbNft[]
) {
  const [bulls, setBulls] = useState<HeldCsbBull[]>([]);
  const walletSignature = useMemo(
    () => walletNfts
      .map((nft) => `${(nft.assetNameHex || "").toLowerCase()}:${nft.image || ""}`)
      .sort()
      .join("|"),
    [walletNfts],
  );

  useEffect(() => {
    if (!userId) {
      setBulls([]);
      return;
    }
    (async () => {
      const { data: existingData } = await supabase
        .from("csbv1_nft_power" as any)
        .select("*")
        .eq("user_id", userId)
        .order("nft_id");

      const existingIds = new Set(((existingData || []) as any[]).map((row) => String(row.nft_id).toLowerCase()));
      const missing = walletNfts
        .filter((nft) => nft.assetNameHex && !existingIds.has(`csb_${nft.assetNameHex}`.toLowerCase()))
        .map((nft) => ({
          user_id: userId,
          nft_id: `csb_${nft.assetNameHex}`,
          nft_name: nft.name || "CSB Bull",
          rarity: "legendary",
          level: 1,
        }));
      if (missing.length > 0) {
        await supabase.from("csbv1_nft_power" as any).insert(missing);
      }

      const { data } = missing.length > 0
        ? await supabase.from("csbv1_nft_power" as any).select("*").eq("user_id", userId).order("nft_id")
        : { data: existingData };
      const rows = ((data || []) as any[]).filter((r) => r.nft_id?.startsWith("csb_"));
      const heldIds = new Set(
        walletNfts.filter((w) => w.assetNameHex).map((w) => `csb_${w.assetNameHex}`.toLowerCase())
      );
      const filtered = heldIds.size > 0 ? rows.filter((r) => heldIds.has(String(r.nft_id).toLowerCase())) : rows;
      const merged: HeldCsbBull[] = filtered.map((r, idx) => {
        const match = walletNfts?.find(
          (w) => w.assetNameHex && String(r.nft_id).toLowerCase() === `csb_${w.assetNameHex}`.toLowerCase()
        );
        const num = (r.nft_name || "").match(/(\d+)\s*$/)?.[1] || String(idx + 1);
        return { ...r, rarity: "legendary", image: match?.image, nft_name: `Bull #${num}` };
      });
      setBulls((current) => merged.map((bull) => ({
        ...bull,
        image: bull.image || current.find((item) => item.nft_id === bull.nft_id)?.image,
      })));
    })();
  }, [userId, walletSignature]);

  return bulls;
}

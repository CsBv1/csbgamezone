import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

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
  walletNfts: Array<{ name: string; assetNameHex?: string; image?: string }>
) {
  const [bulls, setBulls] = useState<HeldCsbBull[]>([]);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      const { data } = await supabase
        .from("csbv1_nft_power" as any)
        .select("*")
        .eq("user_id", userId)
        .order("nft_id");
      const rows = ((data || []) as any[]).filter((r) => r.nft_id?.startsWith("csb_"));
      const heldIds = new Set(
        (walletNfts || []).filter((w) => w.assetNameHex).map((w) => `csb_${w.assetNameHex}`)
      );
      const filtered = heldIds.size > 0 ? rows.filter((r) => heldIds.has(r.nft_id)) : rows;
      const merged: HeldCsbBull[] = filtered.map((r, idx) => {
        const match = walletNfts?.find(
          (w) => w.assetNameHex && r.nft_id === `csb_${w.assetNameHex}`
        );
        const num = (r.nft_name || "").match(/(\d+)\s*$/)?.[1] || String(idx + 1);
        return { ...r, image: match?.image, nft_name: `Bull #${num}` };
      });
      setBulls(merged);
    })();
  }, [userId, walletNfts.length]);

  return bulls;
}

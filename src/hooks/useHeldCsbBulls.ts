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

function normalizeAssetId(value: unknown) {
  return String(value || "")
    .toLowerCase()
    .replace(/^csb_/, "")
    .replace(/[^a-z0-9]/g, "");
}

function normalizeName(value: unknown) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function bullNumber(value: unknown) {
  return String(value || "").match(/(?:#|bull\s*)?(\d+)\s*$/i)?.[1];
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

      const existingIds = new Set(((existingData || []) as any[]).map((row) => normalizeAssetId(row.nft_id)));
      const missing = walletNfts
        .filter((nft) => nft.assetNameHex && !existingIds.has(normalizeAssetId(nft.assetNameHex)))
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
        walletNfts.filter((w) => w.assetNameHex).map((w) => normalizeAssetId(w.assetNameHex))
      );
      const walletNames = new Set(walletNfts.map((w) => normalizeName(w.name)).filter(Boolean));
      const walletNumbers = new Set(walletNfts.map((w) => bullNumber(w.name)).filter(Boolean));
      const filtered = heldIds.size > 0
        ? rows.filter((r) => (
          heldIds.has(normalizeAssetId(r.nft_id))
          || walletNames.has(normalizeName(r.nft_name))
          || walletNumbers.has(bullNumber(r.nft_name) || "")
        ))
        : rows;
      const merged: HeldCsbBull[] = filtered.map((r, idx) => {
        const rowNumber = bullNumber(r.nft_name);
        const match = walletNfts.find((w) => (
          (w.assetNameHex && normalizeAssetId(r.nft_id) === normalizeAssetId(w.assetNameHex))
          || (w.name && normalizeName(r.nft_name) === normalizeName(w.name))
          || (rowNumber && rowNumber === bullNumber(w.name))
        )) || (filtered.length === walletNfts.length ? walletNfts[idx] : undefined);
        const num = (r.nft_name || "").match(/(\d+)\s*$/)?.[1] || String(idx + 1);
        return { ...r, rarity: "legendary", image: match?.image, nft_name: `Bull #${num}` };
      });
      setBulls((current) => merged.map((bull) => ({
        ...bull,
        image: bull.image || current.find((item) => normalizeAssetId(item.nft_id) === normalizeAssetId(bull.nft_id))?.image,
      })));
    })();
  }, [userId, walletSignature]);

  return bulls;
}

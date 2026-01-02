import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CSB_POLICY_ID = "b11c9439e1dbec97f89037e0f7bde3b2daad4ad279812ffd9d24e43e";

// Map traits to rarity bonuses
const RARITY_BONUSES: Record<string, number> = {
  "legendary": 50,
  "epic": 25,
  "rare": 10,
  "common": 0,
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { walletAddress } = await req.json();
    
    if (!walletAddress) {
      throw new Error("Wallet address is required");
    }

    console.log("Scanning wallet:", walletAddress);

    // Try multiple Koios API endpoints for better compatibility
    let assets: any[] = [];
    
    // First try: address_assets endpoint with POST
    try {
      const koiosResponse = await fetch("https://api.koios.rest/api/v1/address_assets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify({
          _addresses: [walletAddress],
        }),
      });

      if (koiosResponse.ok) {
        assets = await koiosResponse.json();
        console.log("Address assets response:", JSON.stringify(assets).slice(0, 500));
      } else {
        console.log("Address assets failed, status:", koiosResponse.status);
      }
    } catch (e) {
      console.log("Address assets endpoint failed:", e);
    }

    // Second try: use account_assets if wallet is a stake address
    if ((!assets || assets.length === 0) && walletAddress.startsWith("stake")) {
      try {
        const stakeResponse = await fetch("https://api.koios.rest/api/v1/account_assets", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json",
          },
          body: JSON.stringify({
            _stake_addresses: [walletAddress],
          }),
        });

        if (stakeResponse.ok) {
          assets = await stakeResponse.json();
          console.log("Account assets response:", JSON.stringify(assets).slice(0, 500));
        }
      } catch (e) {
        console.log("Account assets endpoint failed:", e);
      }
    }

    // Third try: Query by policy ID directly for this wallet
    if (!assets || assets.length === 0) {
      try {
        // Use address_info to get UTXOs with assets
        const infoResponse = await fetch("https://api.koios.rest/api/v1/address_info", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json",
          },
          body: JSON.stringify({
            _addresses: [walletAddress],
          }),
        });

        if (infoResponse.ok) {
          const infoData = await infoResponse.json();
          console.log("Address info response:", JSON.stringify(infoData).slice(0, 500));
          
          // Extract assets from UTXOs
          if (infoData && Array.isArray(infoData)) {
            for (const addr of infoData) {
              if (addr.utxo_set) {
                for (const utxo of addr.utxo_set) {
                  if (utxo.asset_list && utxo.asset_list.length > 0) {
                    assets.push({ asset_list: utxo.asset_list });
                  }
                }
              }
            }
          }
        }
      } catch (e) {
        console.log("Address info endpoint failed:", e);
      }
    }

    console.log("Total asset groups found:", assets?.length || 0);

    // Filter assets for CSB policy ID
    const csbNfts: Array<{ name: string; rarity: string; quantity: number }> = [];
    let highestBonus = 0;
    let highestRarity = "none";
    let totalBulls = 0;

    if (assets && Array.isArray(assets)) {
      for (const addressData of assets) {
        const assetList = addressData.asset_list || addressData.assets || [];
        
        for (const asset of assetList) {
          const policyId = asset.policy_id || asset.policyId;
          
          if (policyId === CSB_POLICY_ID) {
            const quantity = parseInt(asset.quantity || asset.amount || "1", 10);
            totalBulls += quantity;

            // Decode asset name from hex
            let assetName = "CSB Bull";
            try {
              const assetNameHex = asset.asset_name || asset.assetName || "";
              if (assetNameHex) {
                assetName = new TextDecoder().decode(
                  new Uint8Array(assetNameHex.match(/.{1,2}/g)?.map((byte: string) => parseInt(byte, 16)) || [])
                );
              }
            } catch (e) {
              console.log("Could not decode asset name:", e);
            }

            console.log("Found CSB Bull:", assetName, "quantity:", quantity);

            // Determine rarity based on asset name or default to common
            let rarity = "common";
            const lowerName = assetName.toLowerCase();
            if (lowerName.includes("legendary") || lowerName.includes("gold") || lowerName.includes("1/1")) {
              rarity = "legendary";
            } else if (lowerName.includes("epic") || lowerName.includes("diamond") || lowerName.includes("mythic")) {
              rarity = "epic";
            } else if (lowerName.includes("rare") || lowerName.includes("silver") || lowerName.includes("special")) {
              rarity = "rare";
            }

            const bonus = RARITY_BONUSES[rarity] || 0;
            if (bonus > highestBonus) {
              highestBonus = bonus;
              highestRarity = rarity;
            }

            csbNfts.push({
              name: assetName,
              rarity,
              quantity,
            });
          }
        }
      }
    }

    const result = {
      bullsOwned: totalBulls,
      rarityBonus: highestBonus,
      highestRarity: totalBulls > 0 ? highestRarity : "none",
      nfts: csbNfts.slice(0, 10),
    };

    console.log("Final scan result:", result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Wallet scan error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({
      bullsOwned: 0,
      rarityBonus: 0,
      highestRarity: "none",
      nfts: [],
      error: errorMessage,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

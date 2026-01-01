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

    // Use public Koios API to get wallet assets
    const koiosResponse = await fetch("https://api.koios.rest/api/v1/address_assets", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        _addresses: [walletAddress],
      }),
    });

    if (!koiosResponse.ok) {
      console.error("Koios API error:", koiosResponse.status);
      // Return default values if API fails
      return new Response(JSON.stringify({
        bullsOwned: 0,
        rarityBonus: 0,
        highestRarity: "none",
        nfts: [],
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const assets = await koiosResponse.json();
    console.log("Assets found:", assets?.length || 0);

    // Filter assets for CSB policy ID
    const csbNfts: Array<{ name: string; rarity: string }> = [];
    let highestBonus = 0;
    let highestRarity = "none";

    if (assets && Array.isArray(assets)) {
      for (const addressData of assets) {
        if (addressData.asset_list) {
          for (const asset of addressData.asset_list) {
            if (asset.policy_id === CSB_POLICY_ID) {
              // Decode asset name from hex
              let assetName = "CSB Bull";
              try {
                if (asset.asset_name) {
                  assetName = new TextDecoder().decode(
                    new Uint8Array(asset.asset_name.match(/.{1,2}/g)?.map((byte: string) => parseInt(byte, 16)) || [])
                  );
                }
              } catch (e) {
                console.log("Could not decode asset name");
              }

              // Determine rarity based on asset name or default to common
              let rarity = "common";
              const lowerName = assetName.toLowerCase();
              if (lowerName.includes("legendary") || lowerName.includes("gold")) {
                rarity = "legendary";
              } else if (lowerName.includes("epic") || lowerName.includes("diamond")) {
                rarity = "epic";
              } else if (lowerName.includes("rare") || lowerName.includes("silver")) {
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
              });
            }
          }
        }
      }
    }

    const result = {
      bullsOwned: csbNfts.length,
      rarityBonus: highestBonus,
      highestRarity: csbNfts.length > 0 ? highestRarity : "none",
      nfts: csbNfts.slice(0, 10), // Return first 10 NFTs for display
    };

    console.log("Scan result:", result);

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
      status: 200, // Return 200 with default values
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

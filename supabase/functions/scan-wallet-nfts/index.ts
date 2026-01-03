import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CSB_POLICY_ID = "b11c9439e1dbec97f89037e0f7bde3b2daad4ad279812ffd9d24e43e";

const RARITY_BONUSES: Record<string, number> = {
  "legendary": 50,
  "epic": 25,
  "rare": 10,
  "common": 0,
};

// Convert hex address to bech32 if needed
function tryConvertAddress(address: string): string[] {
  const addresses = [address];
  
  // If it looks like a hex address (starts with 0 or 8), also try without prefix
  if (/^[0-9a-fA-F]+$/.test(address) && address.length > 50) {
    // Try adding addr prefix patterns
    addresses.push(address);
  }
  
  return addresses;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { walletAddress } = await req.json();
    
    if (!walletAddress) {
      throw new Error("Wallet address is required");
    }

    console.log("=== NFT SCAN START ===");
    console.log("Input wallet address:", walletAddress);
    console.log("Address length:", walletAddress.length);
    console.log("Policy ID searching for:", CSB_POLICY_ID);

    let allAssets: any[] = [];
    const addressesToTry = tryConvertAddress(walletAddress);
    
    for (const addr of addressesToTry) {
      console.log("Trying address:", addr.substring(0, 30) + "...");
      
      // Method 1: address_assets
      try {
        const response = await fetch("https://api.koios.rest/api/v1/address_assets", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Accept": "application/json" },
          body: JSON.stringify({ _addresses: [addr] }),
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log("address_assets response:", JSON.stringify(data).substring(0, 1000));
          if (data && data.length > 0) {
            allAssets.push(...data);
          }
        } else {
          console.log("address_assets status:", response.status);
        }
      } catch (e) {
        console.log("address_assets error:", e);
      }

      // Method 2: address_info with UTXOs
      try {
        const response = await fetch("https://api.koios.rest/api/v1/address_info", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Accept": "application/json" },
          body: JSON.stringify({ _addresses: [addr] }),
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log("address_info response:", JSON.stringify(data).substring(0, 1000));
          
          if (data && Array.isArray(data)) {
            for (const addrInfo of data) {
              if (addrInfo.utxo_set) {
                for (const utxo of addrInfo.utxo_set) {
                  if (utxo.asset_list && utxo.asset_list.length > 0) {
                    console.log("Found UTXOs with assets:", utxo.asset_list.length);
                    allAssets.push({ asset_list: utxo.asset_list });
                  }
                }
              }
            }
          }
        }
      } catch (e) {
        console.log("address_info error:", e);
      }
    }
    
    // Method 3: Direct policy assets query
    try {
      const response = await fetch("https://api.koios.rest/api/v1/policy_asset_addresses", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify({ _asset_policy: CSB_POLICY_ID }),
      });
      
      if (response.ok) {
        const policyData = await response.json();
        console.log("policy_asset_addresses count:", policyData?.length || 0);
        
        // Check if our wallet is in the list of holders
        if (policyData && Array.isArray(policyData)) {
          for (const holder of policyData) {
            const holderAddr = holder.payment_address || holder.address || "";
            // Check if this matches our wallet (either exact or partial match)
            if (holderAddr.includes(walletAddress.substring(0, 20)) || 
                walletAddress.includes(holderAddr.substring(0, 20))) {
              console.log("Found matching holder:", holder);
              allAssets.push({ 
                asset_list: [{ 
                  policy_id: CSB_POLICY_ID, 
                  asset_name: holder.asset_name,
                  quantity: holder.quantity || "1"
                }] 
              });
            }
          }
        }
      }
    } catch (e) {
      console.log("policy_asset_addresses error:", e);
    }

    console.log("Total asset groups found:", allAssets.length);

    // Process found assets
    const csbNfts: Array<{ name: string; rarity: string; quantity: number }> = [];
    let highestBonus = 0;
    let highestRarity = "none";
    let totalBulls = 0;

    for (const addressData of allAssets) {
      const assetList = addressData.asset_list || addressData.assets || [];
      console.log("Processing asset list with", assetList.length, "items");
      
      for (const asset of assetList) {
        const policyId = asset.policy_id || asset.policyId || "";
        console.log("Checking asset policy:", policyId);
        
        if (policyId === CSB_POLICY_ID) {
          const quantity = parseInt(asset.quantity || asset.amount || "1", 10);
          totalBulls += quantity;

          let assetName = "CSB Bull";
          try {
            const assetNameHex = asset.asset_name || asset.assetName || "";
            if (assetNameHex) {
              assetName = new TextDecoder().decode(
                new Uint8Array(assetNameHex.match(/.{1,2}/g)?.map((byte: string) => parseInt(byte, 16)) || [])
              );
            }
          } catch (e) {
            console.log("Could not decode asset name");
          }

          console.log("*** FOUND CSB BULL ***:", assetName, "qty:", quantity);

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

          csbNfts.push({ name: assetName, rarity, quantity });
        }
      }
    }

    const result = {
      bullsOwned: totalBulls,
      rarityBonus: highestBonus,
      highestRarity: totalBulls > 0 ? highestRarity : "none",
      nfts: csbNfts.slice(0, 10),
    };

    console.log("=== FINAL RESULT ===", JSON.stringify(result));

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Wallet scan error:", error);
    return new Response(JSON.stringify({
      bullsOwned: 0,
      rarityBonus: 0,
      highestRarity: "none",
      nfts: [],
      error: error instanceof Error ? error.message : "Unknown error",
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

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

// Bech32 encoding implementation for Cardano addresses
const BECH32_ALPHABET = "qpzry9x8gf2tvdw0s3jn54khce6mua7l";

function bech32Polymod(values: number[]): number {
  const GEN = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];
  let chk = 1;
  for (const v of values) {
    const top = chk >> 25;
    chk = ((chk & 0x1ffffff) << 5) ^ v;
    for (let i = 0; i < 5; i++) {
      if ((top >> i) & 1) {
        chk ^= GEN[i];
      }
    }
  }
  return chk;
}

function bech32HrpExpand(hrp: string): number[] {
  const result: number[] = [];
  for (let i = 0; i < hrp.length; i++) {
    result.push(hrp.charCodeAt(i) >> 5);
  }
  result.push(0);
  for (let i = 0; i < hrp.length; i++) {
    result.push(hrp.charCodeAt(i) & 31);
  }
  return result;
}

function bech32CreateChecksum(hrp: string, data: number[]): number[] {
  const values = bech32HrpExpand(hrp).concat(data).concat([0, 0, 0, 0, 0, 0]);
  const polymod = bech32Polymod(values) ^ 1;
  const result: number[] = [];
  for (let i = 0; i < 6; i++) {
    result.push((polymod >> (5 * (5 - i))) & 31);
  }
  return result;
}

function convertBits(data: number[], fromBits: number, toBits: number, pad: boolean): number[] {
  let acc = 0;
  let bits = 0;
  const result: number[] = [];
  const maxv = (1 << toBits) - 1;
  for (const value of data) {
    acc = (acc << fromBits) | value;
    bits += fromBits;
    while (bits >= toBits) {
      bits -= toBits;
      result.push((acc >> bits) & maxv);
    }
  }
  if (pad) {
    if (bits > 0) {
      result.push((acc << (toBits - bits)) & maxv);
    }
  }
  return result;
}

function hexToBytes(hex: string): number[] {
  const bytes: number[] = [];
  for (let i = 0; i < hex.length; i += 2) {
    bytes.push(parseInt(hex.substring(i, i + 2), 16));
  }
  return bytes;
}

function hexToBech32(hexAddress: string): string | null {
  try {
    const bytes = hexToBytes(hexAddress);
    if (bytes.length === 0) return null;
    
    // Determine prefix based on first byte
    const firstByte = bytes[0];
    let hrp = "addr";
    
    // Mainnet addresses start with 0x0, 0x1, 0x2, 0x3 (base), 0x4, 0x5 (pointer), 0x6, 0x7 (enterprise), 0x8 (bootstrap)
    // Testnet adds 1 to the network nibble
    if ((firstByte & 0x0F) === 0) {
      hrp = "addr"; // mainnet
    } else if ((firstByte & 0x0F) === 1) {
      hrp = "addr_test"; // testnet
    }
    
    const data5bit = convertBits(bytes, 8, 5, true);
    const checksum = bech32CreateChecksum(hrp, data5bit);
    const combined = data5bit.concat(checksum);
    
    let result = hrp + "1";
    for (const c of combined) {
      result += BECH32_ALPHABET[c];
    }
    
    return result;
  } catch (e) {
    console.log("bech32 conversion error:", e);
    return null;
  }
}

// Extract stake address from full address (for account-based queries)
function extractStakeKeyHash(hexAddress: string): string | null {
  try {
    // For Shelley base addresses, stake key hash is the last 28 bytes
    if (hexAddress.length >= 114) {
      return hexAddress.substring(58); // Skip first 29 bytes (58 hex chars)
    }
    return null;
  } catch (e) {
    return null;
  }
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
    console.log("Policy ID:", CSB_POLICY_ID);

    let allAssets: any[] = [];
    
    // Determine address formats to try
    const addressesToTry: string[] = [];
    
    // If it starts with addr, it's already bech32
    if (walletAddress.startsWith("addr")) {
      addressesToTry.push(walletAddress);
      console.log("Address is bech32 format");
    } else {
      // It's hex, convert to bech32
      const bech32Addr = hexToBech32(walletAddress);
      if (bech32Addr) {
        addressesToTry.push(bech32Addr);
        console.log("Converted to bech32:", bech32Addr);
      }
      // Also try the raw hex
      addressesToTry.push(walletAddress);
    }

    for (const addr of addressesToTry) {
      console.log("Trying address:", addr.substring(0, 40) + "...");
      
      // Method 1: address_assets endpoint
      try {
        const response = await fetch("https://api.koios.rest/api/v1/address_assets", {
          method: "POST",
          headers: { 
            "Content-Type": "application/json", 
            "Accept": "application/json" 
          },
          body: JSON.stringify({ _addresses: [addr] }),
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log("address_assets count:", data?.length || 0);
          if (data && data.length > 0) {
            for (const item of data) {
              if (item.asset_list) {
                allAssets.push({ asset_list: item.asset_list });
              }
            }
          }
        }
      } catch (e) {
        console.log("address_assets error:", e);
      }

      // Method 2: address_info with UTXOs
      try {
        const response = await fetch("https://api.koios.rest/api/v1/address_info", {
          method: "POST",
          headers: { 
            "Content-Type": "application/json", 
            "Accept": "application/json" 
          },
          body: JSON.stringify({ _addresses: [addr] }),
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log("address_info has data:", data?.length > 0);
          
          if (data && Array.isArray(data)) {
            for (const addrInfo of data) {
              if (addrInfo.utxo_set) {
                for (const utxo of addrInfo.utxo_set) {
                  if (utxo.asset_list && utxo.asset_list.length > 0) {
                    console.log("Found assets in UTXOs:", utxo.asset_list.length);
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
      
      // If we found assets, no need to try other address formats
      if (allAssets.length > 0) break;
    }
    
    // Method 3: Check all policy holders and match by address substring
    // This is our fallback if direct queries fail
    if (allAssets.length === 0) {
      console.log("Trying policy_asset_addresses fallback...");
      try {
        const response = await fetch("https://api.koios.rest/api/v1/policy_asset_addresses", {
          method: "POST",
          headers: { 
            "Content-Type": "application/json", 
            "Accept": "application/json" 
          },
          body: JSON.stringify({ _asset_policy: CSB_POLICY_ID }),
        });
        
        if (response.ok) {
          const policyData = await response.json();
          console.log("Total policy holders:", policyData?.length || 0);
          
          if (policyData && Array.isArray(policyData)) {
            // Get the bech32 version if we have hex
            const searchAddrs = addressesToTry.map(a => a.toLowerCase());
            
            for (const holder of policyData) {
              const holderAddr = (holder.payment_address || "").toLowerCase();
              
              // Check if any of our addresses match this holder
              for (const searchAddr of searchAddrs) {
                // Match if addresses are the same or share significant overlap
                if (holderAddr === searchAddr || 
                    holderAddr.includes(searchAddr.substring(5, 30)) ||
                    searchAddr.includes(holderAddr.substring(5, 30))) {
                  console.log("*** MATCH FOUND ***:", holder.asset_name);
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
        }
      } catch (e) {
        console.log("policy_asset_addresses error:", e);
      }
    }

    console.log("Total asset groups found:", allAssets.length);

    // Process found assets
    const csbNfts: Array<{ name: string; rarity: string; quantity: number }> = [];
    let highestBonus = 0;
    let highestRarity = "none";
    let totalBulls = 0;

    for (const addressData of allAssets) {
      const assetList = addressData.asset_list || [];
      
      for (const asset of assetList) {
        const policyId = asset.policy_id || "";
        
        if (policyId === CSB_POLICY_ID) {
          const quantity = parseInt(asset.quantity || "1", 10);
          totalBulls += quantity;

          let assetName = "CSB Bull";
          try {
            const assetNameHex = asset.asset_name || "";
            if (assetNameHex) {
              assetName = new TextDecoder().decode(
                new Uint8Array(assetNameHex.match(/.{1,2}/g)?.map((byte: string) => parseInt(byte, 16)) || [])
              );
            }
          } catch (e) {
            // Keep default name
          }

          console.log("*** FOUND CSB BULL ***:", assetName, "qty:", quantity);

          // All CSB Bulls from this collection are Legendary by default
          const rarity = "legendary";

          const bonus = RARITY_BONUSES[rarity] || 0;
          if (bonus > highestBonus) {
            highestBonus = bonus;
            highestRarity = rarity;
          }

          csbNfts.push({ name: assetName, rarity, quantity });
        }
      }
    }

    // Calculate total bonus based on quantity owned
    // Base bonus + (5% per additional bull)
    const quantityBonus = Math.min(totalBulls * 5, 50); // Cap at 50%
    const finalBonus = highestBonus + quantityBonus;

    const result = {
      bullsOwned: totalBulls,
      rarityBonus: finalBonus,
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

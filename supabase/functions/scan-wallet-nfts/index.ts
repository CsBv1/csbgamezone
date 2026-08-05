import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CSB_POLICY_ID = "b11c9439e1dbec97f89037e0f7bde3b2daad4ad279812ffd9d24e43e";
// Real $CsB fungible token (policy + asset name hex "CSB")
const CSB_TOKEN_POLICY_ID = "52419331e752bc3a7c6ee74d76f1169df1535d77d07da382c62b0bab";
const CSB_TOKEN_ASSET_NAME = "435342";

// Simple bonus: 10% per bull owned
const BONUS_PER_BULL = 10;

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
    
    // Header byte: high nibble = address type, low nibble = network id (1 = mainnet, 0 = testnet)
    if ((firstByte & 0x0F) === 1) {
      hrp = "addr"; // mainnet
    } else {
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

// Decode a bech32 string back to raw bytes (no checksum verification needed here)
function bech32ToBytes(addr: string): number[] | null {
  try {
    const pos = addr.lastIndexOf("1");
    if (pos < 1) return null;
    const dataPart = addr.slice(pos + 1).toLowerCase();
    const data5: number[] = [];
    for (let i = 0; i < dataPart.length - 6; i++) {
      const v = BECH32_ALPHABET.indexOf(dataPart[i]);
      if (v === -1) return null;
      data5.push(v);
    }
    return convertBits(data5, 5, 8, false);
  } catch {
    return null;
  }
}

function bytesToBech32(bytes: number[], hrp: string): string {
  const data5bit = convertBits(bytes, 8, 5, true);
  const checksum = bech32CreateChecksum(hrp, data5bit);
  let result = hrp + "1";
  for (const c of data5bit.concat(checksum)) result += BECH32_ALPHABET[c];
  return result;
}

// Derive the stake (reward) address from any base address, so we can query the
// WHOLE account (all payment/change addresses) instead of a single address.
function toStakeAddress(address: string): string | null {
  try {
    let bytes: number[] | null;
    if (address.startsWith("stake")) return address;
    if (address.startsWith("addr")) bytes = bech32ToBytes(address);
    else bytes = hexToBytes(address);
    if (!bytes || bytes.length < 57) return null;
    const network = bytes[0] & 0x0f; // 1 = mainnet
    const stakeHash = bytes.slice(bytes.length - 28);
    const header = 0xe0 | network; // reward address, key hash
    return bytesToBech32([header, ...stakeHash], network === 1 ? "stake" : "stake_test");
  } catch {
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
            const flat: any[] = [];
            for (const item of data) {
              if (item.asset_list) {
                allAssets.push({ source: "address_assets", asset_list: item.asset_list });
              } else if (item.policy_id) {
                // Koios v1 returns a flat list of assets (one row per asset)
                flat.push(item);
              }
            }
            if (flat.length > 0) {
              allAssets.push({ source: "address_assets", asset_list: flat });
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
                    allAssets.push({ source: "address_info", asset_list: utxo.asset_list });
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
    const csbNfts: Array<{ name: string; rarity: string; quantity: number; assetNameHex: string; image?: string }> = [];
    let totalBulls = 0;
    const tokensBySource: Record<string, number> = {};
    const seenAssetHex = new Set<string>();

    for (const addressData of allAssets) {
      const assetList = addressData.asset_list || [];
      const source = addressData.source || "other";
      
      for (const asset of assetList) {
        const policyId = asset.policy_id || "";
        
        if (policyId === CSB_TOKEN_POLICY_ID && (asset.asset_name || "") === CSB_TOKEN_ASSET_NAME) {
          tokensBySource[source] = (tokensBySource[source] || 0) + (parseInt(asset.quantity || "0", 10) || 0);
          continue;
        }

        if (policyId === CSB_POLICY_ID) {
          const assetNameHex = asset.asset_name || "";
          if (seenAssetHex.has(assetNameHex)) continue;
          seenAssetHex.add(assetNameHex);

          const quantity = parseInt(asset.quantity || "1", 10);
          totalBulls += quantity;

          let assetName = "CSB Bull";
          try {
            if (assetNameHex) {
              assetName = new TextDecoder().decode(
                new Uint8Array(assetNameHex.match(/.{1,2}/g)?.map((byte: string) => parseInt(byte, 16)) || [])
              );
            }
          } catch (e) {
            // Keep default name
          }

          console.log("*** FOUND CSB BULL ***:", assetName, "qty:", quantity);
          csbNfts.push({ name: assetName, rarity: "holder", quantity, assetNameHex });
        }
      }
    }

    // Same wallet can be reported by multiple Koios endpoints - take the best single source
    const csbTokens = Math.max(0, ...Object.values(tokensBySource), 0);

    // Fetch metadata (image) for each unique NFT via Koios asset_info
    if (csbNfts.length > 0) {
      try {
        const assetList = csbNfts.map((n) => [CSB_POLICY_ID, n.assetNameHex]);
        const metaRes = await fetch("https://api.koios.rest/api/v1/asset_info", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Accept": "application/json" },
          body: JSON.stringify({ _asset_list: assetList }),
        });
        if (metaRes.ok) {
          const metaData = await metaRes.json();
          if (Array.isArray(metaData)) {
            for (const m of metaData) {
              const nft = csbNfts.find((n) => n.assetNameHex === m.asset_name);
              if (!nft) continue;
              // Try CIP-25 metadata: minting_tx_metadata.721.<policy>.<assetname>.image
              let img: any = m?.minting_tx_metadata?.["721"]?.[CSB_POLICY_ID]?.[nft.name]?.image;
              if (!img) {
                // Some assets store under hex name
                img = m?.minting_tx_metadata?.["721"]?.[CSB_POLICY_ID]?.[nft.assetNameHex]?.image;
              }
              if (Array.isArray(img)) img = img.join("");
              if (typeof img === "string") {
                if (img.startsWith("ipfs://")) img = `https://ipfs.io/ipfs/${img.slice(7)}`;
                nft.image = img;
              }
            }
          }
        }
      } catch (e) {
        console.log("asset_info metadata error:", e);
      }
    }

    // Calculate total bonus: 10% per bull owned
    const finalBonus = totalBulls * BONUS_PER_BULL;

    const result = {
      bullsOwned: totalBulls,
      rarityBonus: finalBonus,
      highestRarity: totalBulls > 0 ? "holder" : "none",
      csbTokens,
      nfts: csbNfts.slice(0, 50).map((n) => ({ name: n.name, rarity: n.rarity, quantity: n.quantity, image: n.image, assetNameHex: n.assetNameHex })),
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
      csbTokens: 0,
      nfts: [],
      error: error instanceof Error ? error.message : "Unknown error",
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

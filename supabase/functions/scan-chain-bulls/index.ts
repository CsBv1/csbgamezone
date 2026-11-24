import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import bs58 from "npm:bs58@6";

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const RPC: Record<string, string> = {
  solana: Deno.env.get("SOLANA_RPC_URL") ?? "https://api.mainnet-beta.solana.com",
  ethereum: Deno.env.get("ETHEREUM_RPC_URL") ?? "https://eth.llamarpc.com",
  base: Deno.env.get("BASE_RPC_URL") ?? "https://mainnet.base.org",
};
const MPL_CORE = "CoREENxT6tW1HoK8ypY1SxRMZTcVPm7R94rH4PZNhX7d";

async function rpc(url: string, method: string, params: unknown[]) {
  const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }) });
  const j = await r.json();
  if (j.error) throw new Error(j.error.message);
  return j.result;
}

async function countEvm(chain: string, owner: string, contract: string) {
  const data = "0x70a08231" + owner.replace(/^0x/, "").toLowerCase().padStart(64, "0");
  const res = await rpc(RPC[chain], "eth_call", [{ to: contract, data }, "latest"]);
  return Number(BigInt(res || "0x0"));
}

async function countSolana(owner: string, collection: string) {
  bs58.decode(owner); bs58.decode(collection);
  const res = await rpc(RPC.solana, "getProgramAccounts", [MPL_CORE, {
    encoding: "base64", dataSlice: { offset: 0, length: 0 },
    filters: [{ memcmp: { offset: 0, bytes: "2" } }, { memcmp: { offset: 1, bytes: owner } }, { memcmp: { offset: 34, bytes: collection } }],
  }]);
  return Array.isArray(res) ? res.length : 0;
}

async function countBitcoin(addresses: string[], parentId: string) {
  let n = 0;
  for (const a of addresses) {
    const r = await fetch(`https://api.hiro.so/ordinals/v1/inscriptions?address=${encodeURIComponent(a)}&limit=60`);
    if (!r.ok) continue;
    const j = await r.json();
    for (const i of j.results ?? []) {
      if (i.id === parentId || i.parent === parentId || (Array.isArray(i.parent_refs) && i.parent_refs.includes(parentId))) n++;
    }
  }
  return n;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  const { data: u } = token ? await admin.auth.getUser(token) : { data: { user: null } };
  const uid = u.user?.id;
  if (!uid) return json({ error: "Sign in required" }, 401);

  const [{ data: ids }, { data: cols }] = await Promise.all([
    admin.from("wallet_identities").select("chain,address,extra_address").eq("user_id", uid),
    admin.from("bull_collections").select("chain,collection_id,name"),
  ]);
  const wallets = (ids ?? []).filter((w) => w.chain !== "cardano");
  const results: { chain: string; address: string; collection: string; count: number }[] = [];
  for (const w of wallets) {
    for (const c of (cols ?? []).filter((c) => c.chain === w.chain)) {
      let count = 0;
      try {
        if (w.chain === "solana") count = await countSolana(w.address, c.collection_id);
        else if (w.chain === "bitcoin") count = await countBitcoin([w.address, w.extra_address].filter(Boolean) as string[], c.collection_id);
        else count = await countEvm(w.chain, w.address, c.collection_id);
      } catch (e) { console.error("scan failed", w.chain, e); }
      results.push({ chain: w.chain, address: w.address, collection: c.name, count });
    }
  }
  const total = results.reduce((s, r) => s + r.count, 0);
  const { data: existing } = await admin.from("user_nft_bonuses").select("id").eq("user_id", uid).maybeSingle();
  if (existing) await admin.from("user_nft_bonuses").update({ other_chain_bulls: total }).eq("user_id", uid);
  else if (total > 0) await admin.from("user_nft_bonuses").insert({ user_id: uid, other_chain_bulls: total, bulls_owned: 0 });
  return json({ wallets: (ids ?? []).map((w) => ({ chain: w.chain, address: w.address })), results, total, collectionsConfigured: (cols ?? []).length });
});

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3";
import nacl from "npm:tweetnacl@1.0.3";
import bs58 from "npm:bs58@6";
import { verifyMessage, getAddress } from "npm:viem@2";
import { verifyCip30SignData } from "./cip8.ts";
import { verifyBitcoinMessage } from "./btc.ts";

const CHAINS = ["cardano", "solana", "ethereum", "base", "bitcoin"] as const;
type Chain = (typeof CHAINS)[number];

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

function validAddress(chain: Chain, a: string) {
  if (chain === "cardano") return /^[0-9a-f]{58,120}$/.test(a);
  if (chain === "solana") { try { return bs58.decode(a).length === 32; } catch { return false; } }
  if (chain === "bitcoin") return /^(bc1q[02-9ac-hj-np-z]{38,58}|bc1p[02-9ac-hj-np-z]{58}|[13][1-9A-HJ-NP-Za-km-z]{25,34})$/.test(a);
  return /^0x[0-9a-f]{40}$/.test(a);
}
function normalize(chain: Chain, a: string) {
  a = a.trim();
  return chain === "solana" || chain === "bitcoin" ? a : a.toLowerCase();
}
const hex = (b: Uint8Array) => Array.from(b).map((x) => x.toString(16).padStart(2, "0")).join("");

async function callerId(req: Request): Promise<string | null> {
  const auth = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!auth) return null;
  const { data } = await admin.auth.getUser(auth);
  return data.user?.id ?? null;
}

const Base = z.object({ chain: z.enum(CHAINS), address: z.string().min(20).max(130), link: z.boolean().optional() });
const Confirm = Base.extend({
  nonce: z.string().regex(/^[0-9a-f]{48}$/),
  signature: z.string().min(64).max(4000),
  key: z.string().max(400).optional(),
  walletName: z.string().max(40).optional(),
  nickname: z.string().max(30).optional(),
  extraAddress: z.string().max(130).optional(),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const body = await req.json();
    const action = body?.action;

    if (action === "request") {
      const p = Base.safeParse(body);
      if (!p.success) return json({ error: "Invalid request" }, 400);
      const chain = p.data.chain;
      const address = normalize(chain, p.data.address);
      if (!validAddress(chain, address)) return json({ error: `Invalid ${chain} wallet address` }, 400);
      let linkUser: string | null = null;
      if (p.data.link) {
        linkUser = await callerId(req);
        if (!linkUser) return json({ error: "Sign in first to add another wallet" }, 401);
      }
      const nonce = hex(crypto.getRandomValues(new Uint8Array(24)));
      const issued = new Date().toISOString();
      const expires = new Date(Date.now() + 5 * 60_000).toISOString();
      const message = `CsB Game Zone wants you to sign in with your ${chain} wallet:\n${address}\n\n${linkUser ? "Link this wallet to your player account." : "Sign in to CsB Game Zone."} This creates no transaction and costs no fee.\n\nNonce: ${nonce}\nIssued At: ${issued}\nExpiration Time: ${expires}`;
      const { error } = await admin.from("wallet_login_challenges").insert({
        chain, address, nonce, message, link_user_id: linkUser, expires_at: expires,
      });
      if (error) throw error;
      return json({ nonce, message });
    }

    if (action === "confirm") {
      const p = Confirm.safeParse(body);
      if (!p.success) return json({ error: "Invalid request" }, 400);
      const chain = p.data.chain;
      const address = normalize(chain, p.data.address);
      const { data: ch } = await admin.from("wallet_login_challenges")
        .select("id, message, expires_at, consumed_at, link_user_id")
        .eq("chain", chain).eq("address", address).eq("nonce", p.data.nonce).maybeSingle();
      if (!ch || ch.consumed_at) return json({ error: "Unknown or already used sign in request" }, 400);
      if (new Date(ch.expires_at).getTime() < Date.now()) return json({ error: "Sign in request expired, try again" }, 400);
      const { data: used } = await admin.from("wallet_login_challenges")
        .update({ consumed_at: new Date().toISOString() }).eq("id", ch.id).is("consumed_at", null).select("id");
      if (!used?.length) return json({ error: "Sign in request already used" }, 400);

      let valid = false;
      try {
        if (chain === "cardano") {
          if (!p.data.key) throw new Error("missing key");
          verifyCip30SignData({
            addressHex: address,
            payloadHex: hex(new TextEncoder().encode(ch.message)),
            signatureHex: p.data.signature,
            keyHex: p.data.key,
          });
          valid = true;
        } else if (chain === "solana") {
          const sig = Uint8Array.from(atob(p.data.signature), (c) => c.charCodeAt(0));
          valid = nacl.sign.detached.verify(new TextEncoder().encode(ch.message), sig, bs58.decode(address));
        } else if (chain === "bitcoin") {
          valid = verifyBitcoinMessage(address, ch.message, p.data.signature);
        } else {
          valid = await verifyMessage({ address: getAddress(address), message: ch.message, signature: p.data.signature as `0x${string}` });
        }
      } catch (_e) { valid = false; }
      if (!valid) return json({ error: "The wallet signature does not match" }, 401);

      const { data: identity } = await admin.from("wallet_identities")
        .select("user_id").eq("chain", chain).eq("address", address).maybeSingle();
      const extra = p.data.extraAddress && chain === "bitcoin" && validAddress("bitcoin", p.data.extraAddress) ? p.data.extraAddress : null;

      if (ch.link_user_id) {
        if (identity && identity.user_id !== ch.link_user_id) return json({ error: "This wallet already belongs to another player" }, 409);
        await admin.from("wallet_identities").upsert({ user_id: ch.link_user_id, chain, address, extra_address: extra, verified_at: new Date().toISOString() }, { onConflict: "chain,address" });
        return json({ linked: true });
      }

      // One-time password, rotated on every verified signature, so only the wallet owner can sign in.
      const password = hex(crypto.getRandomValues(new Uint8Array(32)));
      let userId = identity?.user_id ?? null;
      if (!userId && chain === "cardano") {
        const { data: prof } = await admin.from("profiles").select("id").ilike("wallet_address", address).limit(1).maybeSingle();
        userId = prof?.id ?? null;
      }
      let email: string;
      if (userId) {
        const { data: u, error } = await admin.auth.admin.updateUserById(userId, { password });
        if (error || !u.user?.email) return json({ error: "Could not load your account" }, 500);
        email = u.user.email;
      } else {
        email = chain === "cardano" ? `${address}@cardano.wallet` : `${chain}-${address.toLowerCase()}@${chain}.wallet`;
        const nick = (p.data.nickname || "").trim().slice(0, 30) || `Bull ${address.slice(-4)}`;
        const { data: created, error } = await admin.auth.admin.createUser({
          email, password, email_confirm: true, user_metadata: { wallet_address: address, wallet_chain: chain, username: nick },
        });
        if (error) throw error;
        userId = created.user!.id;
        await admin.from("profiles").upsert({
          id: userId, username: nick,
          ...(chain === "cardano" ? { wallet_address: address, wallet_name: (p.data.walletName || "Cardano").slice(0, 40), connected_at: new Date().toISOString() } : {}),
        }, { onConflict: "id" });
      }
      await admin.from("wallet_identities").upsert({ user_id: userId, chain, address, extra_address: extra, verified_at: new Date().toISOString() }, { onConflict: "chain,address" });
      return json({ email, password });
    }
    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    console.error("wallet-login error", e);
    return json({ error: "Wallet sign in failed" }, 500);
  }
});

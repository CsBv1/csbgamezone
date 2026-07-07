import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const WEBHOOK = Deno.env.get("DISCORD_WEBHOOK_URL")!;

const BRAND = 0x00e5ff; // cyan
const GOLD = 0xf5b301;
const PURPLE = 0xa855f7;

type Embed = {
  title?: string;
  description?: string;
  color?: number;
  fields?: { name: string; value: string; inline?: boolean }[];
  footer?: { text: string };
  timestamp?: string;
  url?: string;
};

async function post(content: string | null, embeds: Embed[] = []) {
  const res = await fetch(WEBHOOK, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: "CSB Game Zone Herald",
      content,
      embeds,
    }),
  });
  if (!res.ok) throw new Error(`Discord webhook failed: ${res.status} ${await res.text()}`);
}

// --- Content generators ---

const GAME_ZONE_URL = "https://csbgamezone.lovable.app";

const DAILY_EVENTS = [
  { day: 0, name: "🐂 Sunday Stampede", desc: "2x rewards in Bull Stampede all day. Bring the herd!", path: "/games/bull-stampede" },
  { day: 1, name: "⛏️ Mining Monday", desc: "Diamond Mines & Bull Mine drops boosted +50%.", path: "/games/diamond-mines" },
  { day: 2, name: "🏟️ Tourney Tuesday", desc: "PvP tournaments in Bull Arena. Winner takes the crown.", path: "/games/bull-arena" },
  { day: 3, name: "🔮 Rune Wednesday", desc: "Rune Power claims give bonus multipliers. Stack your runes.", path: "/csb" },
  { day: 4, name: "⚔️ Throwdown Thursday", desc: "Boss Raid HP reduced 20%. Coordinate & strike!", path: "/csb/boss-raid" },
  { day: 5, name: "🎰 Fortune Friday", desc: "Wheel of Fortune & Bonanza Spin bonus multipliers.", path: "/games/wheel-of-fortune" },
  { day: 6, name: "🏆 Season Saturday", desc: "Holders Season points x2. Climb the leaderboard!", path: "/games/holders-arena" },
];

const GAMES_HIGHLIGHT = [
  "🐂 Bull Arena — 1v1 PvP for holders",
  "🏰 Bull Siege — wave defense",
  "⛏️ Bull Mine & Diamond Mines — idle farming",
  "🎲 Dice Duel — luck & strategy",
  "🌌 Bull World — 3D multiplayer hub",
  "👑 Bull Kingdom — build your empire",
  "🏁 Bull Sprint / Relay / Race Day — racing modes",
  "🛡️ Chain Defender — tower defense",
  "…and 60+ more games unlocked by holding Bulls!",
];

async function sendDaily() {
  const now = new Date();
  const dow = now.getUTCDay();
  const event = DAILY_EVENTS[dow];
  const dateStr = now.toUTCString().slice(0, 16);

  await post(null, [
    {
      title: `📅 Daily Bulletin — ${dateStr}`,
      description: "Welcome back, Bull Hodlers! Here's what's happening today in **CSB Game Zone**.",
      color: BRAND,
      url: "https://csbgamezone.lovable.app",
      fields: [
        { name: "Today's Event", value: `**${event.name}**\n${event.desc}` },
        { name: "🎁 Daily Bonus", value: "Claim your daily reward on the Dashboard. Rune Power claim resets every 2h." },
        { name: "🪙 Mint Launchpad", value: "[csb-mint.netlify.app](https://csb-mint.netlify.app)", inline: true },
        { name: "🥩 Stake Platform", value: "[stakecsb.lovable.app](https://stakecsb.lovable.app)", inline: true },
      ],
      footer: { text: "CSB Game Zone • Built by Nick G, founder of Cardano Stake Bulls" },
      timestamp: now.toISOString(),
    },
  ]);
}

async function sendJourney() {
  // The build story, posted as a sequence of embeds.
  await post("📖 **How we built CSB Game Zone — the build journey**", []);

  const steps: Embed[] = [
    {
      title: "Step 1 — The Vision",
      description:
        "Nick G, founder of **Cardano Stake Bulls**, wanted a game zone where CNFT Bull holders get real utility: play games with their bulls, earn on-chain-flavored rewards, and hang out with the community.",
      color: BRAND,
    },
    {
      title: "Step 2 — Foundations with Lovable",
      description:
        "We started on **Lovable** (React + Vite + TypeScript + Tailwind + shadcn/ui) — the whole app is built by chatting with the AI. Design system, routing, pages and components all scaffolded in the browser.",
      color: BRAND,
    },
    {
      title: "Step 3 — Lovable Cloud (Backend)",
      description:
        "Enabled **Lovable Cloud** for the backend: Postgres database with Row-Level Security, Auth, Edge Functions, and secrets management — no server to babysit.",
      color: PURPLE,
    },
    {
      title: "Step 4 — Cardano Wallet Login",
      description:
        "Integrated CIP-30 wallets (Eternl, Nami, VESPR, Lace…) with a custom `handle_wallet_auth` function so holders sign in with their wallet, not email.",
      color: PURPLE,
    },
    {
      title: "Step 5 — NFT Detection & Buffs",
      description:
        "Used **Koios API** to scan wallets for the CSB Bulls policy `b11c9439…`. Each bull = +10% reward buff. Rarity → multipliers in-game.",
      color: GOLD,
    },
    {
      title: "Step 6 — The Games",
      description:
        "Built 60+ games: Bull Arena, Bull Siege, Diamond Mines, Bull Kingdom, Bull World (3D hub), Chain Defender, Dice Duel, Bull Race, Boss Raid, and full **Holders-only** advanced games — playable only if you hold a Bull.",
      color: BRAND,
    },
    {
      title: "Step 7 — Economy",
      description:
        "Currency hierarchy: **Credits → Diamonds → Bukals → Keys → Bulls**. Plus **Rune Power** (formerly CsBv1) as the web3 game-zone token. Daily calendar, upgrades, missions, NFT power leveling.",
      color: GOLD,
    },
    {
      title: "Step 8 — Multiplayer & Realtime",
      description:
        "Supabase Realtime powers **game_rooms** — Crash, Bull Stampede maze, Bull World hub chat, floating emote bubbles, live leaderboards, weekly holder seasons.",
      color: PURPLE,
    },
    {
      title: "Step 9 — Payments & Subscriptions",
      description:
        "**Stripe** integration for holder tiers ($5 / $15 / $30 = 1 / 4 / 10 bull-equivalents). **Resend** for welcome & weekly subscriber emails. Cron via `pg_cron` + `pg_net`.",
      color: GOLD,
    },
    {
      title: "Step 10 — Ecosystem",
      description:
        "🪙 **Mint Launchpad** → https://csb-mint.netlify.app\n🥩 **Stake Platform** → https://stakecsb.lovable.app\n🎮 **Game Zone** → https://csbgamezone.lovable.app\n💬 Discord, X, Merch & Library linked from the Dashboard.",
      color: BRAND,
    },
    {
      title: "Step 11 — Security Hardening",
      description:
        "RLS everywhere, `authenticated`-only policies on user data, security-definer functions with locked search_path, dependency upgrades, extensions moved out of `public`. Ongoing scans keep it tight.",
      color: PURPLE,
    },
    {
      title: "Step 12 — Now: Daily Discord Herald",
      description:
        "This bot! Automated **daily events + announcements** posted straight to Discord via webhook, so the community always knows what's live.\n\n🐂 *Made by Cardano Stake Bulls founder Nick G — built with Lovable.*",
      color: GOLD,
      footer: { text: "Continue the journey → csbgamezone.lovable.app" },
    },
  ];

  // Discord allows up to 10 embeds per message.
  for (let i = 0; i < steps.length; i += 5) {
    await post(null, steps.slice(i, i + 5));
    await new Promise((r) => setTimeout(r, 400));
  }

  await post(null, [
    {
      title: "🎮 Games you can play right now",
      description: GAMES_HIGHLIGHT.join("\n"),
      color: BRAND,
      footer: { text: "Hold a CSB Bull to unlock the holders-only games!" },
    },
  ]);
}

async function sendEvent(title: string, description: string) {
  await post(null, [
    {
      title: `🚨 ${title}`,
      description,
      color: GOLD,
      timestamp: new Date().toISOString(),
      footer: { text: "CSB Game Zone" },
    },
  ]);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    if (!WEBHOOK) throw new Error("DISCORD_WEBHOOK_URL not configured");

    let type = "daily";
    let title = "";
    let description = "";
    let content = "";

    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      type = body.type || "daily";
      title = body.title || "";
      description = body.description || "";
      content = body.content || "";
    } else {
      const url = new URL(req.url);
      type = url.searchParams.get("type") || "daily";
    }

    switch (type) {
      case "daily":
        await sendDaily();
        break;
      case "journey":
        await sendJourney();
        break;
      case "event":
        await sendEvent(title || "Event", description || "");
        break;
      case "custom":
        await post(content || null, []);
        break;
      default:
        throw new Error(`Unknown type: ${type}`);
    }

    return new Response(JSON.stringify({ ok: true, type }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("discord-announce error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
    const { data: claims, error: authErr } = await sb.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (authErr || !claims?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Sign in to chat with the Game Master" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const body = await req.json();
    const message = String(body?.message ?? "").slice(0, 1000);
    const context = String(body?.context ?? "").slice(0, 200).replace(/[\r\n`]/g, " ");
    const bullsOwned = Math.max(0, Math.min(10000, Math.floor(Number(body?.bullsOwned) || 0)));
    const rarityBonus = Math.max(0, Math.min(10000, Number(body?.rarityBonus) || 0));
    if (!message.trim()) {
      return new Response(JSON.stringify({ error: "Message is required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `You are the CSB Game Master, the official AI assistant for Cardano Stake Bulls gaming platform. You're friendly, enthusiastic about crypto gaming, and love helping players succeed!

Your key responsibilities:
1. Explain game mechanics for all games (Maze, Slots, Crash, Roulette, Bull World, etc.)
2. Suggest best upgrades and strategies based on player's progress
3. Announce events, bonuses, and special features
4. Guide new gamers through the platform

Key platform info:
- Players earn diamonds 💎 by winning games
- Credits are used to play games
- Keys 🔑 unlock Bull World
- Bulls NFT holders get special bonuses (${bullsOwned || 0} bulls owned, ${rarityBonus || 0}% bonus)
- The policy ID for CSB Bulls is: b11c9439e1dbec97f89037e0f7bde3b2daad4ad279812ffd9d24e43e

Keep responses concise (2-3 sentences max) and helpful. Use emojis sparingly. If the user owns Bulls NFTs, acknowledge their holder status!`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `[Player context, untrusted: ${context || "dashboard"}]\n${message}` }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Service temporarily unavailable." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || "I'm here to help! Ask me anything about the games.";

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Game Master error:", error);
    return new Response(JSON.stringify({ error: "Something went wrong" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, context, bullsOwned, rarityBonus } = await req.json();
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

Player context: ${context || 'New player on dashboard'}

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
          { role: "user", content: message }
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
    const errorMessage = error instanceof Error ? error.message : "Something went wrong";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

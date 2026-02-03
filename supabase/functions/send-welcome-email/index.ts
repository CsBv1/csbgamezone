import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface WelcomeEmailRequest {
  email: string;
  tier: string;
  bulls: number;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, tier, bulls }: WelcomeEmailRequest = await req.json();

    if (!email) {
      throw new Error("Email is required");
    }

    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const tierName = tier === 'tier3' ? 'Ultimate' : tier === 'tier2' ? 'Premium' : 'Starter';
    const buffPercent = bulls * 10;

    const emailHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Cardano Stake Bulls</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="text-align: center; padding: 40px 20px; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%); border-radius: 16px 16px 0 0;">
      <h1 style="color: #fbbf24; margin: 0; font-size: 32px;">CARDANO STAKE BULLS</h1>
      <p style="color: #00d4ff; margin-top: 10px; font-size: 18px;">Welcome to the Herd!</p>
    </div>
    
    <div style="background: linear-gradient(180deg, #0f3460 0%, #1a1a2e 100%); padding: 40px 30px; color: #ffffff;">
      <h2 style="color: #fbbf24; margin-top: 0;">Your ${tierName} Subscription is Active!</h2>
      
      <div style="background: rgba(251, 191, 36, 0.1); border: 2px solid #fbbf24; border-radius: 12px; padding: 20px; margin: 20px 0; text-align: center;">
        <p style="color: #fbbf24; font-size: 24px; margin: 0; font-weight: bold;">
          +${bulls} Bull${bulls > 1 ? 's' : ''} Added to Your Account!
        </p>
        <p style="color: #a0aec0; margin-top: 10px;">
          Enjoy +${buffPercent}% buff on all game rewards!
        </p>
      </div>

      <h3 style="color: #00d4ff;">What's Unlocked For You:</h3>
      <ul style="color: #e2e8f0; line-height: 2;">
        <li><strong>Bull World</strong> - Multiplayer virtual hub with live players</li>
        <li><strong>Holders Arena</strong> - Exclusive RPG and arcade games</li>
        <li><strong>14+ Strategy Games</strong> - Earn Keys with holder boost</li>
        <li><strong>Enhanced Rewards</strong> - +${buffPercent}% buff on all winnings</li>
        <li><strong>Leaderboard Priority</strong> - Compete with fellow holders</li>
      </ul>

      <h3 style="color: #00d4ff;">Latest Platform Updates:</h3>
      <ul style="color: #e2e8f0; line-height: 2;">
        <li>Bull Sprint, Relay and Obstacle Rush - New race games!</li>
        <li>100+ Casino-style games available</li>
        <li>Real-time multiplayer Diamond collecting</li>
        <li>Credit to Diamond to Key economy system</li>
      </ul>

      <h3 style="color: #00d4ff;">About Cardano Stake Bulls:</h3>
      <p style="color: #e2e8f0; line-height: 1.8;">
        Cardano Stake Bulls (CSB) is a play-to-earn NFT collection on the Cardano blockchain. 
        Each Bull NFT provides permanent holder benefits, including gameplay buffs, exclusive game access, 
        and staking rewards. Your subscription gives you the same benefits as holding ${bulls} Bull${bulls > 1 ? 's' : ''}!
      </p>

      <div style="background: rgba(0, 212, 255, 0.1); border: 1px solid #00d4ff; border-radius: 12px; padding: 20px; margin: 20px 0;">
        <h4 style="color: #00d4ff; margin-top: 0;">Pro Tips:</h4>
        <ul style="color: #e2e8f0; line-height: 1.8; margin: 0;">
          <li>Visit Bull World daily to collect free diamonds</li>
          <li>Play strategy games to earn Keys</li>
          <li>Swap 1M credits for 1 Bukal trophy token</li>
          <li>Join multiplayer races for bonus rewards</li>
        </ul>
      </div>

      <p style="color: #a0aec0; font-size: 14px; margin-top: 30px;">
        Want even more bulls? Consider upgrading your tier or 
        <a href="https://www.jpg.store/collection/cardanostakebulls" style="color: #fbbf24;">getting real NFTs on JPG.Store</a>!
      </p>
    </div>
    
    <div style="background: #0a0a0a; padding: 30px; text-align: center; border-radius: 0 0 16px 16px; border-top: 1px solid #333;">
      <a href="https://csbgamezone.lovable.app" style="display: inline-block; background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%); color: #000; padding: 15px 30px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px;">
        Start Playing Now
      </a>
      
      <div style="margin-top: 20px;">
        <a href="https://x.com/AdaStakebulls" style="color: #00d4ff; text-decoration: none; margin: 0 10px;">Twitter</a>
        <a href="https://discord.gg/cardanostakebulls" style="color: #00d4ff; text-decoration: none; margin: 0 10px;">Discord</a>
        <a href="https://www.jpg.store/collection/cardanostakebulls" style="color: #00d4ff; text-decoration: none; margin: 0 10px;">JPG.Store</a>
      </div>
      
      <p style="color: #666; font-size: 12px; margin-top: 20px;">
        2024 Cardano Stake Bulls. All rights reserved.<br>
        You are receiving this because you subscribed to a Bull Holder tier.
      </p>
    </div>
  </div>
</body>
</html>`;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Cardano Stake Bulls <onboarding@resend.dev>",
        to: [email],
        subject: `Welcome to the Bull Herd! Your ${tierName} Subscription is Active`,
        html: emailHtml,
      }),
    });

    if (!res.ok) {
      const error = await res.text();
      throw new Error(`Failed to send email: ${error}`);
    }

    const data = await res.json();
    console.log("Welcome email sent successfully:", data);

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-welcome-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);

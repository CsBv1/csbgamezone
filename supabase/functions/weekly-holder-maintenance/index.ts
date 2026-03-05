import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const getWeekStartUtc = (date = new Date()) => {
  const utc = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = (utc.getUTCDay() + 6) % 7;
  utc.setUTCDate(utc.getUTCDate() - day);
  utc.setUTCHours(0, 0, 0, 0);
  return utc;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is missing");
    if (!resendKey) throw new Error("RESEND_API_KEY is missing");

    const now = new Date();
    const nowIso = now.toISOString();

    // 1) Close expired active seasons
    await supabaseAdmin
      .from("holder_seasons" as any)
      .update({ is_active: false })
      .eq("is_active", true)
      .lte("ends_at", nowIso);

    // 2) Ensure active weekly season exists
    let { data: activeSeason } = await supabaseAdmin
      .from("holder_seasons" as any)
      .select("id, name, starts_at, ends_at, weekly_summary")
      .eq("is_active", true)
      .gt("ends_at", nowIso)
      .order("starts_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!activeSeason) {
      const weekStart = getWeekStartUtc(now);
      const weekEnd = new Date(weekStart);
      weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);

      const weekLabel = `${weekStart.getUTCFullYear()}-W${String(Math.ceil((((weekStart.getTime() - Date.UTC(weekStart.getUTCFullYear(), 0, 1)) / 86400000) + 1) / 7)).padStart(2, "0")}`;

      const { data: insertedSeason, error: seasonInsertError } = await supabaseAdmin
        .from("holder_seasons" as any)
        .insert({
          name: `Season ${weekLabel}`,
          starts_at: weekStart.toISOString(),
          ends_at: weekEnd.toISOString(),
          is_active: true,
          weekly_summary: "Weekly holders season is live. Earn points by winning diamonds.",
        })
        .select("id, name, starts_at, ends_at, weekly_summary")
        .single();

      if (seasonInsertError) throw seasonInsertError;
      activeSeason = insertedSeason;
    }

    // 3) Self-heal player economy rows once a week
    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("id");

    const profileIds = (profiles || []).map((profile: any) => profile.id);

    if (profileIds.length > 0) {
      await Promise.all([
        supabaseAdmin.from("user_credits").upsert(
          profileIds.map((id) => ({ user_id: id, balance: 500 })),
          { onConflict: "user_id", ignoreDuplicates: true },
        ),
        supabaseAdmin.from("user_diamonds").upsert(
          profileIds.map((id) => ({ user_id: id, balance: 0, total_earned: 0 })),
          { onConflict: "user_id", ignoreDuplicates: true },
        ),
        supabaseAdmin.from("user_keys").upsert(
          profileIds.map((id) => ({ user_id: id, balance: 0 })),
          { onConflict: "user_id", ignoreDuplicates: true },
        ),
      ]);
    }

    // 4) Weekly subscriber update email
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    const subscriberEmails = new Set<string>();
    let startingAfter: string | undefined;
    let hasMore = true;

    while (hasMore) {
      const subscriptions = await stripe.subscriptions.list({
        status: "active",
        limit: 100,
        starting_after: startingAfter,
        expand: ["data.customer"],
      });

      for (const subscription of subscriptions.data) {
        const customer = subscription.customer;
        if (customer && typeof customer !== "string" && customer.email) {
          subscriberEmails.add(customer.email);
        }
      }

      hasMore = subscriptions.has_more;
      if (hasMore && subscriptions.data.length > 0) {
        startingAfter = subscriptions.data[subscriptions.data.length - 1].id;
      }
    }

    const weeklySummary = (activeSeason as any)?.weekly_summary || "New holder-only content and reward balancing updates are live.";

    let sentCount = 0;
    for (const email of subscriberEmails) {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${resendKey}`,
        },
        body: JSON.stringify({
          from: "Cardano Stake Bulls <onboarding@resend.dev>",
          to: [email],
          subject: `Weekly Holder Update • ${(activeSeason as any)?.name || "Current Season"}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 620px; margin: 0 auto; padding: 24px; background: #ffffff; color: #111827;">
              <h1 style="margin: 0 0 12px; font-size: 24px;">Weekly Holder Update</h1>
              <p style="margin: 0 0 16px; color: #4b5563;">Your holder subscription includes weekly platform updates and season progress.</p>
              <div style="border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; margin-bottom: 16px;">
                <h2 style="margin: 0 0 8px; font-size: 18px;">${(activeSeason as any)?.name || "Current Season"}</h2>
                <p style="margin: 0; color: #374151;">${weeklySummary}</p>
              </div>
              <p style="margin: 0 0 16px; color: #374151;">This week's automation also runs a backend health check to keep wallets and season systems in sync.</p>
              <a href="https://csbgamezone.lovable.app" style="display: inline-block; text-decoration: none; background: #111827; color: #ffffff; padding: 10px 16px; border-radius: 8px;">Open Game Zone</a>
            </div>
          `,
        }),
      });

      if (response.ok) sentCount += 1;
    }

    return new Response(
      JSON.stringify({
        success: true,
        season: (activeSeason as any)?.name,
        checked_profiles: profileIds.length,
        active_subscribers: subscriberEmails.size,
        emails_sent: sentCount,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

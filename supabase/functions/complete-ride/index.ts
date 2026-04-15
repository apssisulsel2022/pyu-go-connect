import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const Schema = z.object({ ride_id: z.string().uuid() });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify JWT and get user
    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = user.id;

    const body = await req.json();
    const parsed = Schema.safeParse(body);
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error.flatten().fieldErrors }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { ride_id } = parsed.data;

    // Get ride
    const { data: ride, error: rideErr } = await supabaseAdmin.from("rides").select("*").eq("id", ride_id).single();
    if (rideErr || !ride) {
      return new Response(JSON.stringify({ error: "Ride not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (ride.status !== "in_progress") {
      return new Response(JSON.stringify({ error: "Ride harus berstatus in_progress" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!ride.driver_id) {
      return new Response(JSON.stringify({ error: "No driver assigned" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify caller is the assigned driver
    const { data: driverRecord } = await supabaseAdmin
      .from("drivers")
      .select("id")
      .eq("id", ride.driver_id)
      .eq("user_id", userId)
      .maybeSingle();

    if (!driverRecord) {
      return new Response(JSON.stringify({ error: "Anda bukan driver yang ditugaskan untuk ride ini" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const fare = Number(ride.fare ?? 0);

    // Get commission rate from app_settings
    const { data: fareSettings } = await supabaseAdmin
      .from("app_settings")
      .select("value")
      .eq("key", "ride_fares")
      .single();

    let commissionRate = 0.2;
    if (fareSettings?.value) {
      const v = fareSettings.value as any;
      if (v.commission_rate !== undefined) {
        commissionRate = Number(v.commission_rate);
      }
    }

    // Also check payment_settings for default commission
    const { data: paySettings } = await supabaseAdmin
      .from("payment_settings")
      .select("commission_rate")
      .eq("is_default", true)
      .maybeSingle();
    if (paySettings?.commission_rate) {
      commissionRate = Number(paySettings.commission_rate);
    }

    const commissionAmount = Math.round(fare * commissionRate);
    const netEarning = fare - commissionAmount;

    // Mark ride as completed
    await supabaseAdmin.from("rides").update({ status: "completed" }).eq("id", ride_id);

    // Mark driver as available
    await supabaseAdmin.from("drivers").update({ status: "available" }).eq("id", ride.driver_id);

    // Notify user via Push Notification (New Implementation)
    try {
      await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-push-notification`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: ride.rider_id, // ride.rider_id is from rides table
          title: "Perjalanan Selesai!",
          body: `Terima kasih telah menggunakan PYU GO. Total biaya: Rp ${fare.toLocaleString("id-ID")}.`,
          data: { 
            ride_id: ride.id,
            action: "RIDE_COMPLETED",
            fare: String(fare)
          },
          priority: "high"
        })
      });
    } catch (pushErr) {
      console.error("Failed to send push notification to rider:", pushErr);
    }

    // Create driver_earnings record
    await supabaseAdmin.from("driver_earnings").insert({
      driver_id: ride.driver_id,
      ride_id: ride_id,
      gross_fare: fare,
      commission_rate: commissionRate,
      commission_amount: commissionAmount,
      net_earning: netEarning,
      status: "pending",
    });

    return new Response(JSON.stringify({
      success: true,
      fare,
      commission_rate: commissionRate,
      commission_amount: commissionAmount,
      net_earning: netEarning,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("complete-ride error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

interface PushRequest {
  user_id: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  priority?: "high" | "normal";
}

/**
 * Send push notification via FCM (Firebase Cloud Messaging)
 * This is a skeleton implementation that logs the notification.
 * In a real production environment, you would use a service account key
 * to authenticate with Firebase Admin SDK or REST API.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { user_id, title, body, data = {}, priority = "high" } = await req.json() as PushRequest;

    if (!user_id || !title || !body) {
      return new Response(JSON.stringify({ error: "Missing required fields: user_id, title, body" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Get user's FCM tokens from profiles/settings
    // Note: You should have a table like 'user_push_tokens' to store these
    const { data: tokens, error: tokenErr } = await supabase
      .from("user_settings")
      .select("notification_push, user_id")
      .eq("user_id", user_id)
      .single();

    if (tokenErr || !tokens?.notification_push) {
      console.log(`Push disabled or user not found for ${user_id}`);
      return new Response(JSON.stringify({ success: false, message: "Push notifications disabled for user" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Log the notification attempt (Audit Trail)
    await supabase.from("audit_logs").insert({
      action: "push_notification_sent",
      table_name: "rides",
      record_id: data.ride_id || user_id,
      new_data: { title, body, data, priority },
      changed_by: "system"
    });

    console.log(`[PUSH] To: ${user_id} | Title: ${title} | Body: ${body}`);

    // 3. Integration with Firebase (SKELETON)
    /*
    const fcmResponse = await fetch("https://fcm.googleapis.com/fcm/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `key=${Deno.env.get("FIREBASE_SERVER_KEY")}`
      },
      body: JSON.stringify({
        to: user_token, // From step 1
        notification: { title, body },
        data: data,
        priority: priority
      })
    });
    */

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Push notification processed (Logged to audit_logs)",
      details: { user_id, title } 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseAdmin = createClient(
  // @ts-ignore: Deno is available in Edge Functions
  Deno.env.get("SUPABASE_URL")!,
  // @ts-ignore: Deno is available in Edge Functions
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

interface RegisterRequest {
  action?: "register" | "confirm" | "confirm_by_email";
  email: string;
  password?: string;
  fullName?: string;
  userId?: string;
  options?: {
    phone?: string;
    license_number?: string;
    isDriver?: boolean;
    email_confirm?: boolean;
  };
}

// @ts-ignore: Deno is available in Edge Functions
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { action = "register", email, password, fullName, userId, options = {} } = (await req.json()) as RegisterRequest;

    if (!email && action !== "confirm") {
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "confirm_by_email") {
      // Find user by email first
      const { data: users, error: findError } = await supabaseAdmin.auth.admin.listUsers();
      if (findError) throw findError;
      
      const targetUser = users.users.find((u: any) => u.email === email);
      if (!targetUser) {
        throw new Error("User not found");
      }

      const { data, error } = await supabaseAdmin.auth.admin.updateUserById(targetUser.id, {
        email_confirm: true
      });
      if (error) throw error;
      
      return new Response(JSON.stringify({ success: true, data }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "confirm") {
      const { data, error } = await supabaseAdmin.auth.admin.updateUserById(userId!, {
        email_confirm: true
      });
      if (error) throw error;
      return new Response(JSON.stringify({ success: true, data }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Default: register action
    // Check if email verification is required from app_settings
    const { data: authSetting } = await supabaseAdmin
      .from("app_settings")
      .select("value")
      .eq("key", "auth_settings")
      .maybeSingle();
    
    const settings = (authSetting?.value as any) || { email_verification_required: true };
    const emailVerificationRequired = settings.email_verification_required;

    // Use admin client to create user with optional email_confirm
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: !emailVerificationRequired || options.email_confirm === true,
      user_metadata: {
        full_name: fullName,
        phone: options.phone,
        license_number: options.license_number,
        is_driver: options.isDriver || false,
      },
    });

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ data }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error(`Error in register-user function:`, err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

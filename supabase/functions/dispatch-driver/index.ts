import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Verify caller is authenticated
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized: Missing Authorization header" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized: Invalid token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Optional: Check if user has permission to dispatch (e.g. is system or admin)
    // For now, any authenticated user can call it (usually the passenger app)


    const { ride_id } = await req.json();

    if (!ride_id) {
      return new Response(JSON.stringify({ error: "ride_id is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get ride details
    const { data: ride, error: rideErr } = await supabase
      .from("rides")
      .select("*")
      .eq("id", ride_id)
      .single();

    if (rideErr || !ride) {
      return new Response(JSON.stringify({ error: "Ride not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (ride.status !== "pending") {
      return new Response(JSON.stringify({ error: "Ride is not pending" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find available drivers with location
    // Filter by verification, and gender if service_type is bike_women
    let driverQuery = supabase
      .from("drivers")
      .select("*, vehicles!current_vehicle_id(*)")
      .eq("status", "available")
      .eq("is_verified", true)
      .not("current_lat", "is", null)
      .not("current_lng", "is", null);

    if (ride.service_type === "bike_women") {
      driverQuery = driverQuery.eq("gender", "female");
    }

    const { data: drivers, error: driverErr } = await driverQuery;

    if (driverErr || !drivers || drivers.length === 0) {
      return new Response(JSON.stringify({ error: "No available drivers", assigned: false }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Filter drivers by vehicle_type (motorcycle for bike/bike_women services, car for car)
    const isBikeService = ride.service_type === "bike" || ride.service_type === "bike_women";
    
    const compatibleDrivers = drivers.filter((d: any) => {
      if (!d.vehicles) return false;
      const vType = d.vehicles.vehicle_type;
      
      if (isBikeService) {
        // Bike and Bike Women both use motorcycles
        return vType === "motorcycle";
      } else if (ride.service_type === "car") {
        // Car service can be fulfilled by car, minicar, or suv
        return vType === "car" || vType === "minicar" || vType === "suv";
      }
      return false;
    });

    if (compatibleDrivers.length === 0) {
      const needed = isBikeService ? "motorcycle" : "car/minicar/suv";
      return new Response(JSON.stringify({ error: `No compatible ${needed} drivers available`, assigned: false }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find nearest compatible driver
    let nearest = compatibleDrivers[0];
    let minDist = Infinity;
    for (const d of compatibleDrivers) {
      const dist = haversineKm(ride.pickup_lat, ride.pickup_lng, d.current_lat!, d.current_lng!);
      if (dist < minDist) {
        minDist = dist;
        nearest = d;
      }
    }

    // Assign driver to ride - CHANGE: Status becomes 'pending' instead of 'accepted'
    // Driver must manually accept the ride in the app
    const { error: updateErr } = await supabase
      .from("rides")
      .update({ 
        driver_id: nearest.id, 
        status: "pending", // Keep it pending but with driver_id assigned
        updated_at: new Date().toISOString()
      })
      .eq("id", ride_id);

    if (updateErr) {
      return new Response(JSON.stringify({ error: "Failed to assign driver" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // DO NOT mark driver as busy yet. They are only busy once they accept.
    // Instead, we could implement a 'notified' or 'offered' state if needed,
    // but for now, the driver app will listen for rides where driver_id = their_id and status = 'pending'

    // Notify driver via Push Notification (New Implementation)
    try {
      await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-push-notification`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: nearest.user_id, // We need user_id for the driver
          title: "Order Baru Tersedia!",
          body: `Ada pesanan ${ride.service_type} di dekat Anda (Jarak: ${Math.round(minDist * 100) / 100} km).`,
          data: { 
            ride_id: ride.id,
            action: "NEW_RIDE_REQUEST",
            distance_km: String(Math.round(minDist * 100) / 100)
          },
          priority: "high"
        })
      });
    } catch (pushErr) {
      console.error("Failed to send push notification to driver:", pushErr);
    }

    return new Response(JSON.stringify({
      assigned: true,
      message: "Ride offered to driver. Waiting for acceptance.",
      driver: {
        id: nearest.id,
        full_name: nearest.full_name,
        phone: nearest.phone,
        rating: nearest.rating,
        distance_km: Math.round(minDist * 100) / 100,
      },
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

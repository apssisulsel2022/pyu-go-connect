import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

/**
 * CRON Job: Run daily at 00:00
 * Logic: Find all active reminders due in 7, 3, or 1 days
 * Multi-channel: Push, Email, (SMS skeleton)
 */
Deno.serve(async (req) => {
  try {
    const { data: reminders, error } = await supabase
      .from("vehicle_reminders")
      .select(`
        *,
        vehicles (
          plate_number,
          driver_id,
          drivers (
            full_name,
            email,
            phone,
            user_id
          )
        )
      `)
      .eq("is_active", true)
      .eq("status", "pending")
      .or(`due_date.eq.${getOffsetDate(7)},due_date.eq.${getOffsetDate(3)},due_date.eq.${getOffsetDate(1)}`);

    if (error) throw error;

    console.log(`Processing ${reminders?.length || 0} maintenance reminders...`);

    // Parallel Processing with Promise.allSettled to ensure all reminders are attempted
    const processReminder = async (rem: any) => {
      const driver = rem.vehicles.drivers;
      const daysLeft = Math.ceil((new Date(rem.due_date).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
      
      const title = "Reminder Perawatan Kendaraan";
      const body = `Halo ${driver.full_name}, kendaraan ${rem.vehicles.plate_number} memiliki jadwal ${rem.reminder_type} dalam ${daysLeft} hari (${rem.due_date}).`;

      // 1. Send Push Notification & Email in parallel
      const notifications = [
        fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-push-notification`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            user_id: driver.user_id,
            title,
            body,
            data: { type: "MAINTENANCE_REMINDER", reminder_id: rem.id }
          })
        }),
        fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-email`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            to: driver.email,
            subject: title,
            html: `<p>${body}</p>`
          })
        })
      ];

      await Promise.allSettled(notifications);

      // 2. Update last notified status
      await supabase
        .from("vehicle_reminders")
        .update({ last_notified_at: new Date().toISOString() })
        .eq("id", rem.id);
    };

    if (reminders && reminders.length > 0) {
      await Promise.allSettled(reminders.map(processReminder));
    }

    return new Response(JSON.stringify({ success: true, processed: reminders?.length }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});

function getOffsetDate(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

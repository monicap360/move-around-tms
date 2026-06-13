import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import nodemailer from "nodemailer";

export const dynamic = "force-dynamic";

const TEMPLATES: Record<string, (job: any) => string> = {
  confirmation: (j) =>
    `Hi ${j.customer_name}, your transportation with MoveAround has been confirmed!\n\nPickup: ${j.pickup_address}\nTime: ${new Date(j.pickup_time).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}\n\nWe will send you driver details shortly. Questions? Call us anytime.`,
  driver_assigned: (j) =>
    `Hi ${j.customer_name}, your driver has been assigned.\n\nDriver: ${j.assigned_driver_name || "Your driver"}\nVehicle: ${j.assigned_vehicle || "Your vehicle"}\n\nThey will meet you at ${j.pickup_address} at your scheduled time.`,
  en_route: (j) =>
    `Hi ${j.customer_name}, your driver ${j.assigned_driver_name || ""} is on the way to pick you up!\n\nPickup: ${j.pickup_address}\n\nPlease be ready at your pickup location.`,
  arrival: (j) =>
    `Hi ${j.customer_name}, your driver has arrived at ${j.pickup_address}. Please head to your vehicle.`,
  completion: (j) =>
    `Thank you for riding with MoveAround, ${j.customer_name}! We hope your trip was great. Please don't hesitate to reach out if you need anything.`,
  delay: (j) =>
    `Hi ${j.customer_name}, we want to let you know your driver is running a few minutes behind schedule. We apologize for the delay and will update you shortly.`,
  pickup_instructions: (j) =>
    `Hi ${j.customer_name}, here are your pickup instructions:\n\nLocation: ${j.pickup_address}\nTime: ${j.pickup_time ? new Date(j.pickup_time).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : "As scheduled"}\n\n${j.special_instructions ? "Special notes: " + j.special_instructions : ""}`,
};

export async function POST(req: Request) {
  const supabase = createSupabaseServerClient();
  const body = await req.json().catch(() => ({}));

  if (!body.job_id || !body.message_type) {
    return NextResponse.json({ error: "job_id and message_type are required" }, { status: 400 });
  }

  // Load job details for template rendering
  const { data: job } = await supabase
    .from("dispatch_jobs")
    .select("*, assigned_driver:assigned_driver_id(name, driver_profiles(full_name))")
    .eq("id", body.job_id)
    .single();

  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

  const jobCtx = {
    ...job,
    assigned_driver_name: (() => {
      const p = Array.isArray(job.assigned_driver?.driver_profiles) ? job.assigned_driver.driver_profiles[0] : job.assigned_driver?.driver_profiles;
      return p?.full_name || job.assigned_driver?.name || null;
    })(),
  };

  const messageBody = body.body || (TEMPLATES[body.message_type] ? TEMPLATES[body.message_type](jobCtx) : "");
  const sentTo      = body.sent_to || job.customer_phone || job.customer_email || "";
  const channel     = body.channel || (sentTo.includes("@") ? "email" : "sms");

  let deliveryStatus = "logged";

  // Attempt actual email delivery if channel is email and SMTP is configured
  if (channel === "email" && sentTo.includes("@") && process.env.GMAIL_USER) {
    try {
      const transport = nodemailer.createTransport({
        service: "gmail",
        auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
      });
      await transport.sendMail({
        from:    `"MoveAround Transportation" <${process.env.GMAIL_USER}>`,
        to:      sentTo,
        subject: body.subject || `Trip Update — ${job.job_number || job.id.slice(0,8)}`,
        text:    messageBody,
        html:    `<div style="font-family:sans-serif;max-width:560px;margin:auto;padding:24px">
          <h2 style="color:#0f172a;margin:0 0 16px">MoveAround Transportation</h2>
          ${messageBody.split("\n").map((l: string) => `<p style="margin:4px 0;color:#334155">${l}</p>`).join("")}
          <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0"/>
          <p style="color:#94a3b8;font-size:12px">MoveAround Transportation · Questions? Reply to this email or call us.</p>
        </div>`,
      });
      deliveryStatus = "sent";
    } catch {
      deliveryStatus = "failed";
    }
  }

  // Log the communication
  const { data, error } = await supabase
    .from("customer_messages")
    .insert({
      job_id:       body.job_id,
      channel,
      direction:    "outbound",
      message_type: body.message_type,
      body:         messageBody,
      sent_to:      sentTo,
      status:       deliveryStatus,
      created_by:   body.created_by || "dispatch",
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Audit trail
  await supabase.from("trip_status_history").insert({
    job_id:      body.job_id,
    from_status: null,
    to_status:   "communication_sent",
    changed_by:  body.created_by || "dispatch",
    note:        `${body.message_type} message sent to ${sentTo}`,
  });

  return NextResponse.json({ message: data, delivery_status: deliveryStatus }, { status: 201 });
}

export async function GET(req: Request) {
  const supabase = createSupabaseServerClient();
  const { searchParams } = new URL(req.url);
  const jobId = searchParams.get("job_id");
  if (!jobId) return NextResponse.json({ messages: [] });

  const { data, error } = await supabase
    .from("customer_messages")
    .select("*")
    .eq("job_id", jobId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ messages: [], error: error.message });
  return NextResponse.json({ messages: data || [] });
}

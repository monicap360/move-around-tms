import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";
import { sendEmail } from "@/lib/mailer";

export const dynamic = "force-dynamic";

// PUBLIC — a prospect starts a 7-day free trial from the marketing site.
// Captures the lead, starts the 7-day clock, emails the prospect a welcome +
// next steps, and alerts the office to provision their workspace.
const NOTIFY = "admin@ronyxlogistics.com";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}));
  const name = String(b.name || "").trim();
  const company = String(b.company || "").trim();
  const email = String(b.email || "").trim();
  if (!name || !company) return NextResponse.json({ ok: false, error: "Name and company are required." }, { status: 400 });
  if (!EMAIL_RE.test(email)) return NextResponse.json({ ok: false, error: "A valid email is required." }, { status: 400 });

  const trialEnds = new Date(Date.now() + 7 * 86400000);
  const trialEndsStr = trialEnds.toISOString().slice(0, 10);

  // Best-effort lead capture (table may not exist yet — never block the signup).
  try {
    await supabaseAdmin.from("trial_signups").insert({
      name, company, email,
      phone: String(b.phone || "").trim() || null,
      fleet_size: String(b.fleet_size || "").trim() || null,
      role: String(b.role || "").trim() || null,
      referral: String(b.referral || "").trim() || null,
      founding: !!b.founding,
      status: "new", trial_ends_at: trialEndsStr,
    });
  } catch { /* table not migrated yet — email still goes out */ }

  const pretty = trialEnds.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  // Welcome the prospect
  sendEmail({
    to: email,
    subject: "Your MoveAround TMS 7-day free trial",
    text: `Hi ${name},\n\nThanks for starting your 7-day free trial of MoveAround TMS for ${company}.\n\nWhat happens next:\n1. Our team sets up your private workspace.\n2. You'll get a login link to fill in your fleet details and customize it.\n3. Your trial runs free through ${pretty}.\n\nWe'll be in touch shortly. Questions? Just reply to this email.\n\n— MoveAround TMS`,
    html: `<div style="font-family:Inter,system-ui,sans-serif;color:#0f172a"><h2 style="margin:0 0 8px">Welcome to MoveAround TMS 🎉</h2><p>Hi <strong>${name}</strong>, thanks for starting your <strong>7-day free trial</strong> for <strong>${company}</strong>.</p><p><strong>What happens next</strong></p><ol><li>We set up your private workspace.</li><li>You get a login link to fill in your fleet details and customize it.</li><li>Your trial runs free through <strong>${pretty}</strong>.</li></ol><p>We'll be in touch shortly. Questions? Just reply to this email.</p><p style="color:#64748b">— MoveAround TMS</p></div>`,
  }).then(() => {}, () => {});

  // Alert the office to provision
  sendEmail({
    to: NOTIFY,
    subject: `New 7-day trial: ${company}`,
    text: `New free-trial signup.\n\nCompany: ${company}\nContact: ${name}\nEmail: ${email}\nPhone: ${b.phone || "—"}\nFleet size: ${b.fleet_size || "—"}\nRole: ${b.role || "—"}\nHeard via: ${b.referral || "—"}\nTrial ends: ${trialEndsStr}\n\nProvision their workspace and send their login link.`,
  }).then(() => {}, () => {});

  return NextResponse.json({ ok: true, trial_ends_at: trialEndsStr });
}

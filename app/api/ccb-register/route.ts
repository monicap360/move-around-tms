import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";
import { sendEmail } from "@/lib/mailer";

export const dynamic = "force-dynamic";

// PUBLIC — Carrier Clearance Bureau (CCB) self-registration.
// A carrier registers; if they clear the eligibility gates (188+ days of
// operating authority + Hold Harmless accepted + attestations) they become
// CERTIFIED, which grants them the authority to request COIs.
//
// Banking info is NEVER stored in CCB — it is forwarded to the owner/office and
// dropped from the clearance record.
const MIN_AUTHORITY_DAYS = 188;
const OWNER_NOTIFY = "admin@ronyxlogistics.com";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}));
  const company = String(b.company_name || "").trim();
  const email = String(b.email || "").trim();
  const authorityDate = String(b.authority_date || "").trim();

  if (!company) return NextResponse.json({ ok: false, error: "Company name is required." }, { status: 400 });
  if (!EMAIL_RE.test(email)) return NextResponse.json({ ok: false, error: "A valid email is required." }, { status: 400 });

  // ── Eligibility gates (what blocks signup) ──
  const blockers: string[] = [];
  let authorityDays = -1;
  if (!authorityDate) blockers.push("Authority grant date is required.");
  else {
    const t = new Date(authorityDate + "T00:00:00").getTime();
    if (isNaN(t)) blockers.push("Authority grant date is invalid.");
    else { authorityDays = Math.floor((Date.now() - t) / 86400000); if (authorityDays < MIN_AUTHORITY_DAYS) blockers.push(`Operating authority must be at least ${MIN_AUTHORITY_DAYS} days old (yours is ${authorityDays} day${authorityDays === 1 ? "" : "s"}).`); }
  }
  if (!b.hold_harmless) blockers.push("You must accept the Hold Harmless Agreement.");
  if (!b.attest_active) blockers.push("You must attest your operating authority is active and in good standing.");

  if (blockers.length) return NextResponse.json({ ok: false, blocked: true, blockers, authority_days: authorityDays }, { status: 200 });

  const certified = true; // passed all gates
  // Store the CCB record — WITHOUT any banking fields (best-effort; table optional).
  let recordId: string | null = null;
  try {
    const { data } = await supabaseAdmin.from("ccb_registrations").insert({
      company_name: company, email, contact_name: String(b.contact_name || "").trim() || null,
      phone: String(b.phone || "").trim() || null, mc_number: String(b.mc_number || "").trim() || null,
      dot_number: String(b.dot_number || "").trim() || null, authority_date: authorityDate,
      authority_days: authorityDays, hold_harmless: true, certified, can_request_coi: certified,
      status: "certified",
    }).select("id").single();
    recordId = data?.id || null;
  } catch { /* table not migrated yet — email still sends */ }

  // Banking info: NOT stored in CCB — forward it to the owner/office, then discard.
  const hasBanking = b.bank_name || b.bank_routing || b.bank_account;
  if (hasBanking) {
    sendEmail({
      to: OWNER_NOTIFY,
      subject: `CCB banking (forwarded, not stored) — ${company}`,
      text: `Banking details submitted during CCB registration for ${company}. CCB does NOT retain these — forwarding to the owner for payment setup, then discarding from the clearance record.\n\nBank: ${b.bank_name || "—"}\nRouting: ${b.bank_routing || "—"}\nAccount: ${b.bank_account || "—"}\nContact: ${b.contact_name || "—"} · ${email}`,
    }).then(() => {}, () => {});
  }

  // Welcome / office notify
  sendEmail({
    to: email, subject: "You're certified in the Carrier Clearance Bureau (CCB)",
    text: `${company} is CERTIFIED in the Carrier Clearance Bureau.\n\nYour operating authority (${authorityDays} days) meets the ${MIN_AUTHORITY_DAYS}-day minimum and your Hold Harmless Agreement is on file. As a certified carrier you may now request Certificates of Insurance (COIs) through CCB.\n\n— Carrier Clearance Bureau`,
  }).then(() => {}, () => {});
  sendEmail({
    to: OWNER_NOTIFY, subject: `New CCB registration (certified): ${company}`,
    text: `${company} registered and cleared CCB.\nAuthority age: ${authorityDays} days\nMC ${b.mc_number || "—"} · DOT ${b.dot_number || "—"}\nContact: ${b.contact_name || "—"} · ${email} · ${b.phone || "—"}`,
  }).then(() => {}, () => {});

  return NextResponse.json({ ok: true, certified, can_request_coi: certified, authority_days: authorityDays, id: recordId });
}

import "server-only";
import nodemailer from "nodemailer";

/**
 * Sends email over SMTP, so any provider works (Gmail, Brevo, Outlook, Resend…).
 * Configure with SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS and MAIL_FROM.
 * Without SMTP settings in development, the message is printed to the server log instead.
 */
export function mailConfigured(): boolean {
  return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

export async function sendMail(msg: { to: string; subject: string; text: string; html: string }): Promise<void> {
  if (!mailConfigured()) {
    if (process.env.NODE_ENV !== "production") {
      console.log(`\n[mail:dev] To: ${msg.to}\n[mail:dev] Subject: ${msg.subject}\n${msg.text}\n`);
      return;
    }
    throw new Error("Email is not configured (set SMTP_HOST, SMTP_USER, SMTP_PASS, MAIL_FROM)");
  }
  const port = Number(process.env.SMTP_PORT ?? 587);
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  await transport.sendMail({
    from: process.env.MAIL_FROM ?? `Project Locker <${process.env.SMTP_USER}>`,
    ...msg,
  });
}

/** The site's public address for links in emails. Never taken from the request's Host header. */
export function appUrl(): string {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  return "http://localhost:3000";
}

const escape = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export function resetEmail(name: string, link: string, minutes: number) {
  const subject = "Reset your Project Locker password";
  const text = [
    `Hi ${name},`,
    "",
    "Someone (hopefully you) asked to reset the password for your Project Locker account.",
    `Open this link within ${minutes} minutes to choose a new password:`,
    link,
    "",
    "If you didn't ask for this, ignore this email. Your password stays the same.",
    "",
    "—",
    "Seseorang telah meminta untuk menetapkan semula kata laluan akaun Project Locker anda.",
    `Buka pautan di atas dalam masa ${minutes} minit. Jika bukan anda, abaikan e-mel ini.`,
  ].join("\n");
  const html = `<!doctype html><html><body style="margin:0;background:#f4f5fb;font-family:Segoe UI,Helvetica,Arial,sans-serif;color:#1d2340">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px"><tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:16px;padding:32px;border:1px solid #e3e6f3">
      <tr><td style="font-size:13px;letter-spacing:.12em;text-transform:uppercase;color:#0891b2;font-weight:600">Project Locker</td></tr>
      <tr><td style="padding-top:14px;font-size:22px;font-weight:700">Reset your password</td></tr>
      <tr><td style="padding-top:12px;font-size:15px;line-height:1.6;color:#4a5170">Hi ${escape(name)}, someone (hopefully you) asked to reset the password for your Project Locker account. This link works once and expires in ${minutes} minutes.</td></tr>
      <tr><td style="padding-top:24px"><a href="${escape(link)}" style="display:inline-block;background:linear-gradient(90deg,#0891b2,#7c3aed);color:#ffffff;text-decoration:none;font-weight:600;padding:12px 22px;border-radius:10px">Choose a new password</a></td></tr>
      <tr><td style="padding-top:22px;font-size:13px;line-height:1.6;color:#6b7290">If the button doesn't work, copy this link:<br><span style="word-break:break-all;color:#0891b2">${escape(link)}</span></td></tr>
      <tr><td style="padding-top:22px;font-size:13px;line-height:1.6;color:#6b7290">Didn't ask for this? Ignore this email. Your password stays the same.</td></tr>
      <tr><td style="padding-top:18px;border-top:1px solid #eceef7;margin-top:18px;font-size:12.5px;line-height:1.6;color:#8a90aa">Jika anda tidak meminta untuk menetapkan semula kata laluan, abaikan e-mel ini.</td></tr>
    </table>
  </td></tr></table></body></html>`;
  return { subject, text, html };
}

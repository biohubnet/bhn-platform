import nodemailer, { type Transporter } from "nodemailer";

const HOST = process.env.SMTP_HOST;
const PORT = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587;
const USER = process.env.SMTP_USER;
const PASS = process.env.SMTP_PASS;
const FROM = process.env.SMTP_FROM ?? (USER ? `BHN Training <${USER}>` : "");

let cached: Transporter | null = null;

/** Returns true when SMTP env is configured. The send-code route uses
 *  this to give a clear error before pretending to send. */
export function mailConfigured(): boolean {
  return Boolean(HOST && USER && PASS && FROM);
}

function transporter(): Transporter {
  if (cached) return cached;
  if (!mailConfigured()) {
    throw new Error(
      "SMTP is not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM."
    );
  }
  cached = nodemailer.createTransport({
    host: HOST,
    port: PORT,
    secure: PORT === 465, // 465 → implicit TLS, 587 → STARTTLS
    auth: { user: USER!, pass: PASS! },
  });
  return cached;
}

export async function sendMail(opts: {
  to: string;
  subject: string;
  text: string;
  html?: string;
}) {
  const t = transporter();
  await t.sendMail({
    from: FROM,
    to: opts.to,
    subject: opts.subject,
    text: opts.text,
    html: opts.html,
  });
}

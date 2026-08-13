import { Resend } from "resend";

type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

export type SendEmailResult =
  | { ok: true; id: string }
  | { ok: false; skipped: true }
  | { ok: false; error: string };

function getFromAddress() {
  return process.env.RESEND_FROM ?? "Card Break HK <onboarding@resend.dev>";
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.warn("[email] RESEND_API_KEY is not set — skipping email to", input.to);
    return { ok: false, skipped: true };
  }

  const resend = new Resend(apiKey);
  const { data, error } = await resend.emails.send({
    from: getFromAddress(),
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
  });

  if (error) {
    console.error("[email] Failed to send email:", error.message);
    return { ok: false, error: error.message };
  }

  return { ok: true, id: data?.id ?? "unknown" };
}

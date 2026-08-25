// Shared between server/index.js (local dev, Node) and the Netlify function
// (netlify/functions/request-reset.mjs) — both are plain Node ESM, so this
// one module covers the actual Resend API call for both environments.
import { randomUUID } from "node:crypto";

export async function sendResetEmail({ to, name, resetUrl }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM || "Ledger <onboarding@resend.dev>";

  if (!apiKey) {
    console.warn(`RESEND_API_KEY not set — skipping email send. Reset link for ${to}: ${resetUrl}`);
    return { skipped: true };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: "Reset your Ledger PIN",
      html: `
        <p>Hi ${name},</p>
        <p>Someone requested a PIN reset for your Ledger account. Click below to set a new PIN:</p>
        <p><a href="${resetUrl}">${resetUrl}</a></p>
        <p>This link expires in 30 minutes. If you didn't request this, you can ignore this email.</p>
      `,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Resend API error ${res.status}: ${body}`);
  }
  return { skipped: false };
}

export function makeResetToken() {
  return randomUUID().replace(/-/g, "") + randomUUID().replace(/-/g, "");
}

export const RESET_TOKEN_TTL_MS = 30 * 60 * 1000;

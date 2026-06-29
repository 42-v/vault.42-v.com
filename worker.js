// vault42 — serves the static site, and handles the contact form inline at
// POST /contact: verifies Cloudflare Turnstile, then emails the inquiry via
// Email Routing. No email addresses live in this file or the repo — all secrets.
import { EmailMessage } from "cloudflare:email";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/contact") {
      if (request.method === "OPTIONS") return new Response(null, { status: 204 });
      if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405);
      return handleContact(request, env);
    }
    return env.ASSETS.fetch(request);
  },
};

async function handleContact(request, env) {
  let body;
  try { body = await request.json(); } catch { return json({ error: "bad_json" }, 400); }

  // honeypot — bots fill hidden fields; accept silently, send nothing
  if (body.website || body.url || body._gotcha) return json({ ok: true }, 200);

  // Cloudflare Turnstile (skips only if no secret configured yet)
  const ip = request.headers.get("CF-Connecting-IP") || "";
  const token = String(body["cf-turnstile-response"] || body.turnstile || "");
  if (!(await verifyTurnstile(token, env.TURNSTILE_SECRET, ip))) {
    return json({ error: "turnstile_failed" }, 403);
  }

  const clean = (v, n) => String(v ?? "").replace(/[\r\n]+/g, " ").trim().slice(0, n);
  const name = clean(body.name, 120);
  const email = clean(body.email, 200);
  const subject = clean(body.subject, 160);
  const message = String(body.message ?? "").trim().slice(0, 5000);

  if (!name || !message || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return json({ error: "missing_or_invalid_fields" }, 422);
  }

  const raw = [
    `From: vault42 contact <${env.FROM_ADDR}>`,
    `To: ${env.TO_ADDR}`,
    `Reply-To: ${encodeHeader(name)} <${email}>`,
    `Subject: ${encodeHeader("[vault42] " + (subject || "inquiry") + " — " + name)}`,
    `Message-ID: <${crypto.randomUUID()}@42-v.com>`,
    `MIME-Version: 1.0`,
    `Content-Type: text/plain; charset=utf-8`,
    ``,
    `From:    ${name} <${email}>`,
    `Subject: ${subject || "(none)"}`,
    `IP:      ${ip || "?"} (${request.cf?.country || "??"})`,
    ``,
    message,
    ``,
    `— sent via vault.42-v.com contact form`,
  ].join("\r\n");

  try {
    await env.CONTACT_MAILER.send(new EmailMessage(env.FROM_ADDR, env.TO_ADDR, raw));
  } catch (e) {
    return json({ error: "delivery_failed" }, 502);
  }
  return json({ ok: true }, 200);
}

async function verifyTurnstile(token, secret, ip) {
  if (!secret) return true;            // not configured yet → don't block submissions
  if (!token) return false;
  const form = new FormData();
  form.append("secret", secret);
  form.append("response", token);
  if (ip) form.append("remoteip", ip);
  try {
    const r = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body: form });
    const data = await r.json();
    return data.success === true;
  } catch { return false; }
}

// RFC 2047 encoded-word for header values that contain non-ASCII (e.g. em-dash, accents)
function encodeHeader(s) {
  if (/^[\x00-\x7F]*$/.test(s)) return s;
  const bytes = new TextEncoder().encode(s);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return "=?UTF-8?B?" + btoa(bin) + "?=";
}

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

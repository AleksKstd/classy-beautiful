/**
 * Signed admin session tokens: `<expiresAtMs>.<nonce>.<hmac>`.
 * Uses Web Crypto only, so it runs both in the Node runtime (server actions)
 * and in the Edge runtime (middleware).
 */

export const ADMIN_SESSION_COOKIE = "cb_admin_session";
export const ADMIN_SESSION_MAX_AGE_SECONDS = 60 * 60 * 12; // 12 hours

const encoder = new TextEncoder();

function getSecret(): string | null {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret || secret.length < 32) {
    console.error("ADMIN_SESSION_SECRET is missing or shorter than 32 characters - admin login disabled");
    return null;
  }
  return secret;
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function sign(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  return toBase64Url(new Uint8Array(signature));
}

/** Length-independent constant-time string comparison. */
export function safeEqual(a: string, b: string): boolean {
  const len = Math.max(a.length, b.length);
  let diff = a.length ^ b.length;
  for (let i = 0; i < len; i++) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return diff === 0;
}

export async function createSessionToken(now: number = Date.now()): Promise<string | null> {
  const secret = getSecret();
  if (!secret) return null;
  const expiresAt = now + ADMIN_SESSION_MAX_AGE_SECONDS * 1000;
  const nonce = toBase64Url(crypto.getRandomValues(new Uint8Array(16)));
  const payload = `${expiresAt}.${nonce}`;
  return `${payload}.${await sign(secret, payload)}`;
}

export async function verifySessionToken(
  token: string | undefined | null,
  now: number = Date.now()
): Promise<boolean> {
  if (!token) return false;
  const secret = getSecret();
  if (!secret) return false;

  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [expiresAt, nonce, signature] = parts;
  if (!/^\d+$/.test(expiresAt) || Number(expiresAt) <= now) return false;

  const expected = await sign(secret, `${expiresAt}.${nonce}`);
  return safeEqual(signature, expected);
}

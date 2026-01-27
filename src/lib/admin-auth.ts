import { cookies } from "next/headers";

// Hardcoded credentials (hashed with SHA256)
// Username: CvetiAdm
// Password: CBCveti356-
const ADMIN_USERNAME_HASH = "dda2370d659fd2aa3d659dce95e83d40a895876acc66f85f66bd8e83e1f3e792"; // SHA256 of "CvetiAdm"
const ADMIN_PASSWORD_HASH = "a0a2cd364a68209106a3177b0163b70ea9e283dfb86394042c5a56d272b8ae3f"; // SHA256 of "CBCveti356-"

const ADMIN_SESSION_COOKIE = "cb_admin_session";
const SESSION_SECRET = "cb_admin_secret_key_2026"; // In production, use env variable

/**
 * Hash a string using SHA256
 */
async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Verify admin credentials
 */
export async function verifyAdminCredentials(
  username: string,
  password: string
): Promise<boolean> {
  const usernameHash = await sha256(username);
  const passwordHash = await sha256(password);

  return (
    usernameHash === ADMIN_USERNAME_HASH &&
    passwordHash === ADMIN_PASSWORD_HASH
  );
}

/**
 * Create admin session
 */
export async function createAdminSession(): Promise<void> {
  const sessionToken = await sha256(SESSION_SECRET + Date.now().toString());
  const cookieStore = await cookies();
  
  cookieStore.set(ADMIN_SESSION_COOKIE, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24, // 24 hours
    path: "/",
  });
}

/**
 * Check if user is authenticated as admin
 */
export async function isAdminAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(ADMIN_SESSION_COOKIE);
  return !!sessionToken;
}

/**
 * Destroy admin session
 */
export async function destroyAdminSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_SESSION_COOKIE);
}

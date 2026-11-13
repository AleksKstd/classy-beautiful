import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyPassword } from "./password";
import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_MAX_AGE_SECONDS,
  createSessionToken,
  safeEqual,
  verifySessionToken,
} from "./session";

export async function checkAdminCredentials(username: string, password: string): Promise<boolean> {
  const expectedUser = process.env.ADMIN_USERNAME;
  const passwordHash = process.env.ADMIN_PASSWORD_HASH;
  if (!expectedUser || !passwordHash) {
    console.error("ADMIN_USERNAME / ADMIN_PASSWORD_HASH are not set - admin login disabled");
    return false;
  }
  // Always run the (slow) hash check so timing does not reveal valid usernames.
  const passwordOk = await verifyPassword(password, passwordHash);
  return safeEqual(username, expectedUser) && passwordOk;
}

export async function startAdminSession(): Promise<boolean> {
  const token = await createSessionToken();
  if (!token) return false;
  (await cookies()).set(ADMIN_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: ADMIN_SESSION_MAX_AGE_SECONDS,
    path: "/",
  });
  return true;
}

export async function endAdminSession(): Promise<void> {
  (await cookies()).delete(ADMIN_SESSION_COOKIE);
}

export async function isAdminAuthenticated(): Promise<boolean> {
  return verifySessionToken((await cookies()).get(ADMIN_SESSION_COOKIE)?.value);
}

/** Call first in every admin-only server action, page and route. */
export async function requireAdmin(): Promise<void> {
  if (!(await isAdminAuthenticated())) {
    redirect("/admin");
  }
}

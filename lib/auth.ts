import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "@/lib/env";

const COOKIE_NAME = "kq_admin";
const COOKIE_MAX_AGE = 60 * 60 * 8; // 8h

function sign(value: string): string {
  return createHmac("sha256", env.adminSessionSecret()).update(value).digest("hex");
}

function safeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
}

export async function loginWithPassword(password: string): Promise<boolean> {
  const expected = env.adminPassword();
  if (password.length !== expected.length) return false;
  const ok = timingSafeEqual(Buffer.from(password), Buffer.from(expected));
  if (!ok) return false;

  const issuedAt = Date.now().toString();
  const sig = sign(issuedAt);
  const value = `${issuedAt}.${sig}`;
  const jar = await cookies();
  jar.set(COOKIE_NAME, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });
  return true;
}

export async function logout() {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
}

export async function isAdmin(): Promise<boolean> {
  const jar = await cookies();
  const c = jar.get(COOKIE_NAME);
  if (!c) return false;
  const [issuedAt, sig] = c.value.split(".");
  if (!issuedAt || !sig) return false;
  const ageMs = Date.now() - Number(issuedAt);
  if (!Number.isFinite(ageMs) || ageMs < 0 || ageMs > COOKIE_MAX_AGE * 1000) return false;
  try {
    return safeEqualHex(sig, sign(issuedAt));
  } catch {
    return false;
  }
}

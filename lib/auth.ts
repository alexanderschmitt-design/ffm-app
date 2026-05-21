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

export async function loginWithPassword(
  boothSlug: string,
  password: string,
): Promise<boolean> {
  const expected = env.boothPassword(boothSlug);
  if (!expected) return false;
  if (password.length !== expected.length) return false;
  const ok = timingSafeEqual(Buffer.from(password), Buffer.from(expected));
  if (!ok) return false;

  const issuedAt = Date.now().toString();
  const payload = `${boothSlug}.${issuedAt}`;
  const sig = sign(payload);
  const value = `${payload}.${sig}`;
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

// Returns the booth slug of the currently authenticated admin, or null.
export async function adminBoothSlug(): Promise<string | null> {
  const jar = await cookies();
  const c = jar.get(COOKIE_NAME);
  if (!c) return null;
  const parts = c.value.split(".");
  if (parts.length !== 3) return null;
  const [slug, issuedAt, sig] = parts;
  if (!slug || !issuedAt || !sig) return null;
  const ageMs = Date.now() - Number(issuedAt);
  if (!Number.isFinite(ageMs) || ageMs < 0 || ageMs > COOKIE_MAX_AGE * 1000) {
    return null;
  }
  try {
    const ok = safeEqualHex(sig, sign(`${slug}.${issuedAt}`));
    return ok ? slug : null;
  } catch {
    return null;
  }
}

// Convenience: any booth admin is logged in. For booth-scoped checks use
// adminBoothSlug() and compare to the booth you want to allow.
export async function isAdmin(): Promise<boolean> {
  return (await adminBoothSlug()) !== null;
}

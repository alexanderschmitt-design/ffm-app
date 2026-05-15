import { NextResponse } from "next/server";
import { logout } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  await logout();
  const url = new URL("/admin/login", req.url);
  return NextResponse.redirect(url, { status: 303 });
}

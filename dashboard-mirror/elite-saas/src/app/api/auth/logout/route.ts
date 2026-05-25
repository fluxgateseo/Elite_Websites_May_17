import { NextResponse } from "next/server";
import { logout } from "@/lib/auth";

export async function POST(): Promise<Response> {
  await logout();
  const host = process.env.DASHBOARD_HOSTNAME ?? "app.chefconnect.it";
  return NextResponse.redirect(`https://${host}/login`, 303);
}

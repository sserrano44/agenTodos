import { NextResponse } from "next/server";

import { getOAuthProtectedResourceMetadata } from "@/lib/auth/oauth";

export async function GET() {
  return NextResponse.json(getOAuthProtectedResourceMetadata());
}

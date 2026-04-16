import { NextResponse } from "next/server";

import { getOAuthAuthorizationServerMetadata } from "@/lib/auth/oauth";

export async function GET() {
  return NextResponse.json(getOAuthAuthorizationServerMetadata());
}

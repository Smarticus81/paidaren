import { NextResponse } from "next/server";
import { getJWKS } from "@/lib/lti/keys";

export async function GET() {
  const jwks = await getJWKS();
  return NextResponse.json(jwks);
}

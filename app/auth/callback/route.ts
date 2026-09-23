import { NextResponse } from "next/server";
import { createClient } from "../../../lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  if (!code) return NextResponse.redirect(new URL("/?auth_error=cancelled", url.origin));

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return NextResponse.redirect(new URL("/?auth_error=failed", url.origin));
  } catch {
    return NextResponse.redirect(new URL("/?auth_error=failed", url.origin));
  }

  // Keep the destination fixed to this app; never redirect to a URL from the request.
  return NextResponse.redirect(new URL("/reading", url.origin));
}

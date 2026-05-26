import { type EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Handles email confirmation links sent by Supabase Auth.
//
// The Supabase email template should point to:
//   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup&next=/
//
// On success the user lands on `next` (default "/") with a fresh session cookie.
// On failure they go to /entrar with an error code.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/";

  if (token_hash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) {
      const redirectTo = new URL(next, request.url);
      return NextResponse.redirect(redirectTo);
    }
  }

  const fallback = new URL("/entrar", request.url);
  fallback.searchParams.set("erro", "link_invalido");
  return NextResponse.redirect(fallback);
}

import { createClient } from "@supabase/supabase-js";

// Service-role client. Bypasses RLS — only call from server-side code paths
// that have already performed their own authorization check (e.g. the admin
// score-entry server action, after verifying the caller admins at least one
// pool). Never expose to the browser.
export function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}

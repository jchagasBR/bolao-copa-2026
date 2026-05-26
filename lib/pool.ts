import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

const ACTIVE_POOL_COOKIE = "active_pool_id";

export async function readActivePoolId(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(ACTIVE_POOL_COOKIE)?.value ?? null;
}

export async function listMyPools(): Promise<
  { id: string; name: string; member_count: number }[]
> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  // pool_member + pool tables don't exist yet (Phase 2 schema work).
  // Once they do, this query reads the caller's memberships scoped by RLS.
  return [];
}

export async function assertMember(
  poolId: string,
  userId: string,
): Promise<void> {
  const supabase = await createClient();
  // Will read pool_member once Phase 2 lands the schema.
  void supabase;
  void poolId;
  void userId;
}

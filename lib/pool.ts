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

  // The pool_member + pool tables exist (Phase 2 migrations). No pool data
  // is created yet — Phase 3 wires /boloes/criar and /boloes/entrar. This
  // helper returns [] until then, which renders the dashboard empty state.
  return [];
}

export async function assertMember(
  poolId: string,
  userId: string,
): Promise<void> {
  const supabase = await createClient();
  // The pool_member table exists; Phase 3 wires the SELECT here and the
  // call sites in pool-scoped server actions.
  void supabase;
  void poolId;
  void userId;
}

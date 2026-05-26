import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export const ACTIVE_POOL_COOKIE = "active_pool_id";

export type Pool = {
  id: string;
  name: string;
  invite_code: string;
  admin_id: string;
};

export type PoolListItem = {
  id: string;
  name: string;
  invite_code: string;
  is_admin: boolean;
  member_count: number;
};

// Read the active pool id from the cookie. Returns null when the cookie is
// missing — the layout / page should then fall back to the user's first
// membership (or redirect to /boloes/entrar when they have none).
export async function readActivePoolId(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(ACTIVE_POOL_COOKIE)?.value ?? null;
}

export async function setActivePoolCookie(poolId: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_POOL_COOKIE, poolId, {
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365, // 1 year
  });
}

// Returns the pools the caller belongs to, with member counts. Order: most
// recently joined first. RLS scopes the result to memberships of the caller.
export async function listMyPools(): Promise<PoolListItem[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("pool_member")
    .select(
      "joined_at, pool:pool_id (id, name, invite_code, admin_id, members:pool_member(count))",
    )
    .eq("user_id", user.id)
    .order("joined_at", { ascending: false });

  if (error || !data) return [];

  type Row = {
    joined_at: string;
    pool: {
      id: string;
      name: string;
      invite_code: string;
      admin_id: string;
      members: { count: number }[];
    } | null;
  };

  return (data as unknown as Row[])
    .filter((row): row is Row & { pool: NonNullable<Row["pool"]> } => row.pool !== null)
    .map((row) => ({
      id: row.pool.id,
      name: row.pool.name,
      invite_code: row.pool.invite_code,
      is_admin: row.pool.admin_id === user.id,
      member_count: row.pool.members[0]?.count ?? 0,
    }));
}

// Throws when the user isn't a member of the given pool. Server actions that
// mutate pool-scoped data MUST call this before writing.
export async function assertMember(poolId: string, userId: string): Promise<void> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pool_member")
    .select("pool_id")
    .eq("pool_id", poolId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error("Não foi possível verificar a participação no bolão.");
  }
  if (!data) {
    throw new Error("Você não participa deste bolão.");
  }
}

// Generates a single COPA-XXXX invite code (4 uppercase alphanumeric chars).
// Uniqueness is enforced by the DB unique constraint; the create flow retries
// on conflict.
const INVITE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
export function generateInviteCode(): string {
  const arr = new Uint32Array(4);
  crypto.getRandomValues(arr);
  let suffix = "";
  for (let i = 0; i < 4; i++) {
    suffix += INVITE_CHARS[arr[i] % INVITE_CHARS.length];
  }
  return `COPA-${suffix}`;
}

"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { assertMember, setActivePoolCookie } from "@/lib/pool";

export async function switchPool(poolId: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/entrar");
  }

  await assertMember(poolId, user.id);
  await setActivePoolCookie(poolId);
  redirect("/jogos");
}

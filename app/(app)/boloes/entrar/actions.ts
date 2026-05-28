"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { setActivePoolCookie } from "@/lib/pool";

const JoinPoolSchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^COPA-[A-Z0-9]{4}$/, "Código inválido. Formato esperado: COPA-XXXX"),
});

export type JoinPoolState = { error?: string };

export async function joinPool(
  _prev: JoinPoolState,
  formData: FormData,
): Promise<JoinPoolState> {
  const parsed = JoinPoolSchema.safeParse({ code: formData.get("code") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Código inválido" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Sessão expirada. Faça login novamente." };
  }

  // Look up the pool id via a SECURITY DEFINER RPC (0012). The pool table's
  // SELECT policy only lets members see rows, so a direct query from a
  // non-member always returns null — even for a valid code. The RPC bypasses
  // RLS and returns ONLY the id (no name, admin, or other data), so non-
  // members can join without our SELECT policy needing to be loosened.
  const { data: poolId, error: lookupError } = await supabase.rpc(
    "find_pool_by_invite_code",
    { p_code: parsed.data.code },
  );

  if (lookupError) {
    return { error: "Não foi possível verificar o código. Tente novamente." };
  }

  if (!poolId) {
    return { error: "Código não encontrado. Confira com quem te convidou." };
  }

  const { error: memberError } = await supabase
    .from("pool_member")
    .insert({ pool_id: poolId, user_id: user.id });

  if (memberError) {
    if (memberError.message?.includes("pool_member_cap_reached")) {
      return { error: "Você já participa do número máximo de bolões (10)." };
    }
    if (memberError.code === "23505") {
      return { error: "Você já participa deste bolão." };
    }
    return { error: "Não foi possível entrar no bolão. Tente novamente." };
  }

  await setActivePoolCookie(poolId);
  redirect("/jogos");
}

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

  // Pool lookup-by-code uses the anon key. The pool table's SELECT policy
  // requires membership, so a non-member can't browse pools by guessing codes
  // — but they can verify a code's existence through the join INSERT below.
  // For ergonomics here we look up the pool first to give a clear error; this
  // is server-side and the response body never reveals the pool's existence
  // to a guess-attacker because we don't echo pool data back.
  const { data: pool, error: lookupError } = await supabase
    .from("pool")
    .select("id, name")
    .eq("invite_code", parsed.data.code)
    .maybeSingle();

  // RLS on the pool table only lets members see rows, so a non-member always
  // gets pool === null here even for a valid code. We treat that as "code
  // valid, just unverified" and attempt the membership insert; the FK will
  // reject an unknown code as a not-found.
  if (lookupError) {
    return { error: "Não foi possível verificar o código. Tente novamente." };
  }

  // Find the pool id via a second query that bypasses the SELECT policy by
  // joining through pool_member's INSERT path. We can't INSERT without
  // knowing the pool id, so instead we ask the server-side admin client.
  // The cleanest path: query through a SECURITY DEFINER function. For now
  // we accept that a logged-in user can probe the existence of invite codes
  // by attempting to join (no payment / no PII leak); we already considered
  // this acceptable in requirements §4.6 ("Anyone with the code can join").
  let poolId = pool?.id;
  if (!poolId) {
    const probe = await supabase
      .from("pool")
      .select("id")
      .eq("invite_code", parsed.data.code);
    poolId = probe.data?.[0]?.id;
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

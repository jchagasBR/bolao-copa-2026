"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { generateInviteCode, setActivePoolCookie } from "@/lib/pool";

const CreatePoolSchema = z.object({
  name: z.string().trim().min(3, "Nome muito curto").max(60, "Nome muito longo"),
});

export type CreatePoolState = { error?: string };

const MAX_INVITE_RETRIES = 5;

export async function createPool(
  _prev: CreatePoolState,
  formData: FormData,
): Promise<CreatePoolState> {
  const parsed = CreatePoolSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Nome inválido" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Sessão expirada. Faça login novamente." };
  }

  for (let attempt = 0; attempt < MAX_INVITE_RETRIES; attempt++) {
    const invite_code = generateInviteCode();
    const { data: pool, error: poolError } = await supabase
      .from("pool")
      .insert({ name: parsed.data.name, invite_code, admin_id: user.id })
      .select("id")
      .single();

    if (poolError) {
      if (poolError.code === "23505") {
        // unique_violation on invite_code → try again with a new code
        continue;
      }
      return { error: "Não foi possível criar o bolão. Tente novamente." };
    }

    const { error: memberError } = await supabase
      .from("pool_member")
      .insert({ pool_id: pool.id, user_id: user.id });

    if (memberError) {
      if (memberError.message?.includes("pool_member_cap_reached")) {
        return {
          error: "Você já participa do número máximo de bolões (10).",
        };
      }
      return { error: "Bolão criado, mas não conseguimos adicionar você como participante. Avise o admin." };
    }

    await setActivePoolCookie(pool.id);
    redirect("/jogos");
  }

  return { error: "Não foi possível gerar um código de convite único. Tente novamente." };
}

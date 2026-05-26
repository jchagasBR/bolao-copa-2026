"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const UpdateSchema = z
  .object({
    password: z.string().min(8, "A senha precisa ter ao menos 8 caracteres"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas não conferem",
    path: ["confirmPassword"],
  });

export type UpdatePasswordState = { error?: string };

export async function updatePassword(
  _prev: UpdatePasswordState,
  formData: FormData,
): Promise<UpdatePasswordState> {
  const parsed = UpdateSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Senha inválida" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      error:
        "Sessão expirada. Solicite um novo link de recuperação em /recuperar.",
    };
  }

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) {
    return { error: "Não foi possível atualizar a senha. Tente novamente." };
  }

  redirect("/");
}

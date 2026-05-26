"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const SignUpSchema = z.object({
  name: z.string().trim().min(2, "Nome muito curto").max(80),
  email: z.string().email("Email inválido"),
  password: z.string().min(8, "A senha precisa ter ao menos 8 caracteres"),
});

export type SignUpState = { error?: string };

export async function signUp(
  _prev: SignUpState,
  formData: FormData,
): Promise<SignUpState> {
  const parsed = SignUpSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { name: parsed.data.name },
      emailRedirectTo: `${process.env.APP_URL ?? "http://localhost:3000"}/auth/confirm`,
    },
  });

  if (error) {
    return { error: traduzErro(error.message) };
  }

  redirect("/cadastro/verifique-email");
}

function traduzErro(msg: string): string {
  const lower = msg.toLowerCase();
  if (lower.includes("already registered") || lower.includes("user already"))
    return "Já existe uma conta com este email. Tente entrar.";
  if (lower.includes("password")) return "Senha inválida.";
  return "Não foi possível criar a conta. Tente novamente.";
}

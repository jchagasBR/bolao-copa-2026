"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const SignInSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(1, "Informe a senha"),
});

export type SignInState = { error?: string };

export async function signIn(
  _prev: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const parsed = SignInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return { error: traduzErro(error.message) };
  }

  redirect("/");
}

function traduzErro(msg: string): string {
  const lower = msg.toLowerCase();
  if (lower.includes("invalid login") || lower.includes("invalid credentials"))
    return "Email ou senha incorretos.";
  if (lower.includes("email not confirmed"))
    return "Confirme seu email antes de entrar. Verifique sua caixa de entrada.";
  return "Não foi possível entrar. Tente novamente.";
}

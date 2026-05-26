import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { UpdatePasswordForm } from "./form";

export const metadata = {
  title: "Redefinir senha — Bolão Copa 2026",
};

export default async function RedefinirPage() {
  // The /auth/confirm route handler runs verifyOtp({ type: 'recovery' }) before
  // redirecting here, so a successful click on the email link leaves the user
  // with an authenticated session in cookies. If we don't see one, the user
  // either landed here directly or the recovery token expired — send them
  // back to /recuperar to request a fresh link.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/recuperar?erro=sessao_invalida");
  }

  return (
    <main className="flex-1 flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold tracking-tight">Nova senha</h1>
          <p className="text-sm text-muted-foreground">
            Escolha uma nova senha. Depois você volta logado direto pra sua
            conta.
          </p>
        </div>

        <UpdatePasswordForm />

        <p className="text-center text-sm text-muted-foreground">
          <Link
            href="/entrar"
            className="underline-offset-4 hover:underline"
          >
            ← Voltar pro login
          </Link>
        </p>
      </div>
    </main>
  );
}

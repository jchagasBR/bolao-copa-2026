import Link from "next/link";
import { RequestResetForm } from "./form";

export const metadata = {
  title: "Recuperar senha — Bolão Copa 2026",
};

export default function RecuperarPage() {
  return (
    <main className="flex-1 flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold tracking-tight">Recuperar senha</h1>
          <p className="text-sm text-muted-foreground">
            Vamos te enviar um link pra escolher uma nova senha.
          </p>
        </div>

        <RequestResetForm />

        <p className="text-center text-sm text-muted-foreground">
          Lembrou a senha?{" "}
          <Link
            href="/entrar"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Entrar
          </Link>
        </p>
      </div>
    </main>
  );
}

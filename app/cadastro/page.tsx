import Link from "next/link";
import { SignUpForm } from "./form";

export const metadata = {
  title: "Criar conta — Bolão Copa 2026",
};

export default function CadastroPage() {
  return (
    <main className="flex-1 flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold tracking-tight">Criar conta</h1>
          <p className="text-sm text-muted-foreground">
            Cadastre-se para entrar no bolão do seu grupo.
          </p>
        </div>

        <SignUpForm />

        <p className="text-center text-sm text-muted-foreground">
          Já tem conta?{" "}
          <Link href="/entrar" className="font-medium text-foreground underline-offset-4 hover:underline">
            Entrar
          </Link>
        </p>
      </div>
    </main>
  );
}

import Link from "next/link";
import { SignInForm } from "./form";

export const metadata = {
  title: "Entrar — Bolão Copa 2026",
};

export default function EntrarPage() {
  return (
    <main className="flex-1 flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold tracking-tight">Entrar</h1>
          <p className="text-sm text-muted-foreground">
            Use seu email e senha para acessar seus bolões.
          </p>
        </div>

        <SignInForm />

        <p className="text-center text-sm text-muted-foreground">
          Ainda não tem conta?{" "}
          <Link href="/cadastro" className="font-medium text-foreground underline-offset-4 hover:underline">
            Criar conta
          </Link>
        </p>
      </div>
    </main>
  );
}

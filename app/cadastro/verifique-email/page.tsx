import Link from "next/link";

export const metadata = {
  title: "Confirme seu email — Bolão Copa 2026",
};

export default function VerifiqueEmailPage() {
  return (
    <main className="flex-1 flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-md space-y-6 text-center">
        <h1 className="text-2xl font-bold tracking-tight">Confirme seu email</h1>
        <p className="text-muted-foreground">
          Enviamos um link de confirmação para o email cadastrado. Clique no link para
          ativar sua conta.
        </p>
        <p className="text-sm text-muted-foreground">
          Não recebeu? Verifique a pasta de spam ou{" "}
          <Link href="/cadastro" className="font-medium text-foreground underline-offset-4 hover:underline">
            tente novamente
          </Link>
          .
        </p>
        <p className="pt-4">
          <Link href="/entrar" className="text-sm font-medium underline-offset-4 hover:underline">
            Voltar para o login
          </Link>
        </p>
      </div>
    </main>
  );
}

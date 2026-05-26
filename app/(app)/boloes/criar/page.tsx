import Link from "next/link";
import { CreatePoolForm } from "./form";

export const metadata = {
  title: "Criar bolão — Bolão Copa 2026",
};

export default function CriarBolaoPage() {
  return (
    <main className="mx-auto max-w-md px-4 py-10 space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">Criar bolão</h1>
        <p className="text-sm text-muted-foreground">
          Você vira admin do bolão. Depois é só compartilhar o código de convite
          com a galera.
        </p>
      </div>

      <CreatePoolForm />

      <p className="text-sm text-muted-foreground">
        <Link href="/" className="underline-offset-4 hover:underline">
          ← Voltar
        </Link>
      </p>
    </main>
  );
}

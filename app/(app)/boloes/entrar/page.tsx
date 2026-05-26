import Link from "next/link";
import { JoinPoolForm } from "./form";

export const metadata = {
  title: "Entrar em bolão — Bolão Copa 2026",
};

export default function EntrarBolaoPage() {
  return (
    <main className="mx-auto max-w-md px-4 py-10 space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">Entrar em bolão</h1>
        <p className="text-sm text-muted-foreground">
          Digite o código que o admin te enviou (formato <code>COPA-XXXX</code>).
        </p>
      </div>

      <JoinPoolForm />

      <p className="text-sm text-muted-foreground">
        <Link href="/" className="underline-offset-4 hover:underline">
          ← Voltar
        </Link>
      </p>
    </main>
  );
}

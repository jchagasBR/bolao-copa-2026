import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listMyPools } from "@/lib/pool";

export const metadata = {
  title: "Meus bolões — Bolão Copa 2026",
};

export default async function DashboardPage() {
  const pools = await listMyPools();

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 space-y-8">
      <section className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">Meus bolões</h1>
        <p className="text-sm text-muted-foreground">
          Crie um bolão para seu grupo ou entre em um com um código de convite.
        </p>
      </section>

      {pools.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Você ainda não está em nenhum bolão</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Comece criando um bolão para seus amigos ou aceite um convite com o código
              que alguém te enviou.
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <Link href="/boloes/criar" className={buttonVariants()}>
                Criar bolão
              </Link>
              <Link
                href="/boloes/entrar"
                className={buttonVariants({ variant: "outline" })}
              >
                Entrar em bolão
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {pools.map((pool) => (
            <li key={pool.id}>
              <Card>
                <CardHeader>
                  <CardTitle>{pool.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {pool.member_count} participante(s)
                  </p>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

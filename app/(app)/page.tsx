import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PoolCard } from "@/components/pool-card";
import { listMyPools, readActivePoolId } from "@/lib/pool";

export const metadata = {
  title: "Meus bolões — Bolão Copa 2026",
};

export default async function DashboardPage() {
  const pools = await listMyPools();
  const activeId = await readActivePoolId();

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
              Comece criando um bolão para seus amigos ou aceite um convite com o
              código que alguém te enviou.
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
        <>
          <ul className="grid gap-3 sm:grid-cols-2">
            {pools.map((pool) => (
              <li key={pool.id}>
                <PoolCard pool={pool} isActive={pool.id === activeId} />
              </li>
            ))}
          </ul>

          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            <Link
              href="/boloes/criar"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              + Criar outro bolão
            </Link>
            <Link
              href="/boloes/entrar"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              + Entrar em outro bolão
            </Link>
          </div>
        </>
      )}
    </main>
  );
}

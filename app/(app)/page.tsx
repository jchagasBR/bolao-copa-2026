import Link from "next/link";
import { Users, Crown } from "lucide-react";
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
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <span className="truncate">{pool.name}</span>
                      {pool.is_admin && (
                        <span
                          title="Você é o admin"
                          className="inline-flex items-center text-amber-600 dark:text-amber-400"
                        >
                          <Crown className="h-4 w-4" aria-hidden />
                        </span>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <p className="flex items-center gap-1.5 text-muted-foreground">
                      <Users className="h-3.5 w-3.5" aria-hidden />
                      {pool.member_count} participante
                      {pool.member_count === 1 ? "" : "s"}
                    </p>
                    {pool.is_admin && (
                      <p className="text-xs text-muted-foreground">
                        Código: <code className="font-mono">{pool.invite_code}</code>
                      </p>
                    )}
                  </CardContent>
                </Card>
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

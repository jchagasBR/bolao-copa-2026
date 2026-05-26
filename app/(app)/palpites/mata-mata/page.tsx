import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LocalTime } from "@/components/local-time";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Palpites — Mata-mata — Bolão Copa 2026",
};

export default async function PalpitesMataMataPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("first_r32_kickoff")
    .select("t")
    .maybeSingle<{ t: string }>();
  const firstR32 = data?.t ?? null;

  return (
    <main className="mx-auto max-w-md px-4 py-6 space-y-6">
      <p className="text-sm">
        <Link
          href="/palpites"
          className="text-muted-foreground underline-offset-4 hover:underline"
        >
          ← Palpites
        </Link>
      </p>

      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Mata-mata</h1>
        <p className="text-sm text-muted-foreground">
          O preenchimento da chave abre depois que termina a fase de grupos.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Aguardando classificados</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            A chave começa em <strong>32 jogos</strong> (R32). Os classificados
            (2 por grupo + 8 melhores 3os) só são conhecidos após o fim da fase
            de grupos, em 27 de junho.
          </p>
          {firstR32 && (
            <p>
              Prazo do palpite: até o início do primeiro R32 —{" "}
              <LocalTime
                utc={firstR32}
                options={{
                  day: "2-digit",
                  month: "long",
                  hour: "2-digit",
                  minute: "2-digit",
                }}
              />
              .
            </p>
          )}
          <p className="pt-2">
            <strong>Pontuação:</strong> +3 pts por acertar quem chega ao R16,
            +5 pts até QF, +8 pts até SF, +12 pts até a final.
          </p>
        </CardContent>
      </Card>
    </main>
  );
}

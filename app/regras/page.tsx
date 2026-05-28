import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = {
  title: "Regras do bolão — Bolão Copa 2026",
  description:
    "Como os pontos são calculados, prazos pra palpitar e desempate no ranking.",
};

export default function RegrasPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-8 space-y-8">
      <header className="space-y-2">
        <p className="text-xs">
          <Link
            href="/"
            className="text-muted-foreground underline-offset-4 hover:underline"
          >
            ← Voltar
          </Link>
        </p>
        <h1 className="text-3xl font-bold tracking-tight">Regras do bolão</h1>
        <p className="text-sm text-muted-foreground">
          Tudo o que importa pra você ganhar pontos. Tem dúvida? Manda no grupo.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">1. Pontos por jogo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>Os pontos olham o <strong>placar do tempo regulamentar</strong> — pênaltis e prorrogação só contam pro bônus de campeão.</p>
          <div className="overflow-hidden rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold">Acertou…</th>
                  <th className="px-3 py-2 text-right font-semibold tabular-nums">Pontos</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                <tr>
                  <td className="px-3 py-2">Placar exato (dois números certos)</td>
                  <td className="px-3 py-2 text-right font-semibold tabular-nums">10</td>
                </tr>
                <tr>
                  <td className="px-3 py-2">Vencedor + diferença de gols</td>
                  <td className="px-3 py-2 text-right font-semibold tabular-nums">7</td>
                </tr>
                <tr>
                  <td className="px-3 py-2">Só o vencedor (ou só o empate)</td>
                  <td className="px-3 py-2 text-right font-semibold tabular-nums">5</td>
                </tr>
                <tr>
                  <td className="px-3 py-2">Resultado errado</td>
                  <td className="px-3 py-2 text-right font-semibold tabular-nums text-muted-foreground">0</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground">
            <strong>Exemplo —</strong> jogo real: Brasil 2-1 Argentina.<br />
            Palpite <span className="font-mono">2-1</span> → 10 pts · palpite <span className="font-mono">3-2</span> → 7 pts · palpite <span className="font-mono">1-0</span> → 5 pts · palpite <span className="font-mono">0-1</span> → 0 pts.
          </p>
          <p className="text-xs text-muted-foreground">
            Empate vs empate com diferenças diferentes (ex: palpite 1-1, real 4-4) também
            valem 7 pontos — vencedor certo (nenhum) + diferença certa (0).
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">2. Bônus além dos jogos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>Esses entram no seu total <strong>quando a fase acabar</strong>:</p>
          <ul className="space-y-1.5">
            <li className="flex items-baseline justify-between gap-3 border-b pb-1.5">
              <span>1º lugar do grupo</span>
              <span className="font-semibold tabular-nums">+5</span>
            </li>
            <li className="flex items-baseline justify-between gap-3 border-b pb-1.5">
              <span>2º lugar do grupo</span>
              <span className="font-semibold tabular-nums">+3</span>
            </li>
            <li className="flex items-baseline justify-between gap-3 border-b pb-1.5">
              <span>Time que chegou nas oitavas (R16)</span>
              <span className="font-semibold tabular-nums">+3</span>
            </li>
            <li className="flex items-baseline justify-between gap-3 border-b pb-1.5">
              <span>Time que chegou nas quartas</span>
              <span className="font-semibold tabular-nums">+5</span>
            </li>
            <li className="flex items-baseline justify-between gap-3 border-b pb-1.5">
              <span>Time que chegou na semi</span>
              <span className="font-semibold tabular-nums">+8</span>
            </li>
            <li className="flex items-baseline justify-between gap-3 border-b pb-1.5">
              <span>Time que chegou na final</span>
              <span className="font-semibold tabular-nums">+12</span>
            </li>
            <li className="flex items-baseline justify-between gap-3">
              <span><strong>Campeão</strong></span>
              <span className="font-semibold tabular-nums">+20</span>
            </li>
          </ul>
          <p className="text-xs text-muted-foreground">
            Bônus de mata-mata (R16/quartas/semi/final) ainda não estão implementados —
            entram quando a fase de grupos terminar e os jogos seguintes ganharem times definidos.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">3. Prazos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p><strong>Palpite de jogo:</strong> até o apito inicial daquele jogo. Depois disso, o palpite trava e fica como leitura.</p>
          <p><strong>Palpite de grupos e campeão:</strong> até o início do primeiro jogo da Copa.</p>
          <p><strong>Palpite de mata-mata:</strong> até o início do primeiro jogo das oitavas (R32).</p>
          <p className="text-xs text-muted-foreground">
            Horários aparecem no fuso do seu navegador. Emails de lembrete mostram o
            horário de Brasília como referência.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">4. Não palpitei. E agora?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>Quem não palpitou num jogo ganha <strong>0</strong> ali. Sem multa, sem desconto — só zero mesmo.</p>
          <p>A gente manda um email no dia anterior a cada jogo pra quem ainda não palpitou. Dá pra desativar no <Link href="/perfil" className="font-medium underline-offset-4 hover:underline">seu perfil</Link>.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">5. Desempate no ranking</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>Em caso de empate em pontos, a ordem é:</p>
          <ol className="ml-5 list-decimal space-y-1">
            <li>Quem tem mais placares cravados (exatos).</li>
            <li>Quem tem mais vencedores certos.</li>
          </ol>
          <p>
            Se ainda assim houver empate <strong>ao final do bolão</strong>,{" "}
            <strong>o título é dividido</strong> — vocês são campeões juntos.
            Não existe desempate por ordem alfabética nem nada do tipo.
          </p>
          <p className="text-xs text-muted-foreground">
            Durante a Copa, o ranking mostra os empatados em ordem alfabética só
            pra ficar estável visualmente; isso não significa que um tá &quot;na
            frente&quot; do outro.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">6. Bolões e códigos de convite</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>Quem cria o bolão vira o <strong>admin</strong> daquele bolão.</p>
          <p>O código de convite tem formato <span className="font-mono">COPA-XXXX</span>. Qualquer pessoa com o código pode entrar (sem limite por convite).</p>
          <p>Cada pessoa pode participar de até <strong>10 bolões</strong> ao mesmo tempo. Tentou entrar no 11º e foi barrado? Sai de um pra entrar em outro.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">7. Quem entra o placar dos jogos?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>Não tem API de futebol no MVP. Qualquer admin de qualquer bolão digita o resultado quando o jogo acaba — o placar é a mesma realidade pra todo mundo.</p>
          <p>Pra jogos do mata-mata que terminam empatados (pênaltis ou pênaltis após prorrogação), o admin marca quem avançou. Isso só conta pro bônus de campeão — o palpite do jogo continua sendo julgado pelo placar do tempo regulamentar.</p>
        </CardContent>
      </Card>

      <p className="text-center text-xs text-muted-foreground">
        Dúvida que essa página não respondeu? Pergunta pro admin do seu bolão.
      </p>
    </main>
  );
}

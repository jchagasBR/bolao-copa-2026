import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <main className="flex-1 flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="max-w-xl space-y-6">
        <p className="text-sm uppercase tracking-widest text-muted-foreground">
          FIFA World Cup 2026
        </p>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
          Bolão Copa 2026
        </h1>
        <p className="text-lg text-muted-foreground">
          O bolão privado do seu grupo de amigos. Palpite nos jogos, dispute o
          ranking e zoe os colegas — sem dinheiro envolvido, só orgulho.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
          <Button size="lg" disabled>
            Criar conta
          </Button>
          <Button size="lg" variant="outline" disabled>
            Entrar
          </Button>
        </div>
        <p className="text-xs text-muted-foreground pt-8">
          Em construção. Lançamento antes do primeiro jogo: 11/06/2026.
        </p>
      </div>
    </main>
  );
}

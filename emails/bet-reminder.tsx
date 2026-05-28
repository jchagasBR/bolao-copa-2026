import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

export type BetReminderProps = {
  recipientName: string;
  homeTeam: string;
  awayTeam: string;
  stageLabel: string;
  kickoffSaoPaulo: string;
  hoursUntilKickoff: number;
  matchUrl: string;
};

// React Email template for the prediction-reminder email. PT-BR copy. Server-
// rendered to HTML by `render()` at send time. Emails can't know the recipient's
// browser TZ, so we always show São Paulo time labeled "(horário de Brasília)"
// plus a relative phrase. The CTA opens the app where times render locally.
export function BetReminderEmail({
  recipientName,
  homeTeam,
  awayTeam,
  stageLabel,
  kickoffSaoPaulo,
  hoursUntilKickoff,
  matchUrl,
}: BetReminderProps) {
  const preview = `${homeTeam} × ${awayTeam} começa em ~${hoursUntilKickoff}h — você ainda não palpitou.`;
  return (
    <Html lang="pt-BR">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={body}>
        <Container style={container}>
          <Heading style={h1}>Bolão Copa 2026</Heading>
          <Text style={greeting}>
            Oi, {recipientName}! Você ainda não palpitou nesse jogo:
          </Text>

          <Section style={matchCard}>
            <Text style={stage}>{stageLabel}</Text>
            <Heading as="h2" style={teams}>
              {homeTeam} <span style={vs}>×</span> {awayTeam}
            </Heading>
            <Text style={kickoffLine}>
              {kickoffSaoPaulo} <span style={tzLabel}>(horário de Brasília)</span>
            </Text>
            <Text style={relativeLine}>Começa em ~{hoursUntilKickoff}h.</Text>
          </Section>

          <Section style={ctaWrap}>
            <Button href={matchUrl} style={cta}>
              Palpitar agora
            </Button>
          </Section>

          <Hr style={hr} />

          <Text style={footer}>
            Depois do início do jogo, palpites são bloqueados. Não palpitou = 0
            pontos.
          </Text>
          <Text style={footerSmall}>
            Recebeu esse email por engano ou quer parar de receber lembretes?
            Desative em &quot;Perfil&quot; no app.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

const body: React.CSSProperties = {
  backgroundColor: "#f6f6f7",
  fontFamily:
    "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
  margin: 0,
  padding: 0,
};

const container: React.CSSProperties = {
  maxWidth: "560px",
  margin: "0 auto",
  padding: "32px 24px",
  backgroundColor: "#ffffff",
};

const h1: React.CSSProperties = {
  fontSize: "18px",
  fontWeight: 600,
  color: "#171717",
  margin: "0 0 24px 0",
};

const greeting: React.CSSProperties = {
  fontSize: "15px",
  color: "#171717",
  margin: "0 0 16px 0",
  lineHeight: 1.5,
};

const matchCard: React.CSSProperties = {
  backgroundColor: "#fafafa",
  border: "1px solid #e5e5e5",
  borderRadius: "8px",
  padding: "20px",
  margin: "0 0 24px 0",
};

const stage: React.CSSProperties = {
  fontSize: "11px",
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  color: "#737373",
  margin: "0 0 8px 0",
};

const teams: React.CSSProperties = {
  fontSize: "22px",
  fontWeight: 700,
  color: "#171717",
  margin: "0 0 12px 0",
  lineHeight: 1.2,
};

const vs: React.CSSProperties = {
  color: "#a3a3a3",
  fontWeight: 400,
};

const kickoffLine: React.CSSProperties = {
  fontSize: "14px",
  color: "#171717",
  margin: "0 0 4px 0",
};

const tzLabel: React.CSSProperties = {
  color: "#737373",
  fontSize: "12px",
};

const relativeLine: React.CSSProperties = {
  fontSize: "13px",
  color: "#737373",
  margin: 0,
};

const ctaWrap: React.CSSProperties = {
  margin: "0 0 24px 0",
};

const cta: React.CSSProperties = {
  display: "inline-block",
  backgroundColor: "#171717",
  color: "#ffffff",
  padding: "12px 24px",
  borderRadius: "6px",
  fontSize: "14px",
  fontWeight: 600,
  textDecoration: "none",
};

const hr: React.CSSProperties = {
  border: "none",
  borderTop: "1px solid #e5e5e5",
  margin: "24px 0",
};

const footer: React.CSSProperties = {
  fontSize: "13px",
  color: "#525252",
  margin: "0 0 12px 0",
  lineHeight: 1.5,
};

const footerSmall: React.CSSProperties = {
  fontSize: "12px",
  color: "#a3a3a3",
  margin: 0,
  lineHeight: 1.5,
};

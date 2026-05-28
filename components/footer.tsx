import Link from "next/link";

// Global footer. Renders on every page via the root layout. On (app) pages
// with the fixed mobile bottom-nav, it sits below the nav on mobile (so users
// reach /regras via the link in /perfil instead). On public pages and on
// desktop, it's the canonical entry point to the rules.
export function Footer() {
  return (
    <footer className="mt-auto border-t bg-background">
      <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-2 px-4 py-4 text-xs text-muted-foreground sm:flex-row">
        <p>
          Bolão Copa 2026 — Ouça o podcast{" "}
          <a
            href="https://open.spotify.com/show/033hn0HlURd4EGGxTbuGSS?si=db4817cc6edf44bb"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium underline-offset-4 hover:text-foreground hover:underline"
          >
            Futebol Futebol Clube
          </a>
        </p>
        <nav>
          <Link
            href="/regras"
            className="font-medium underline-offset-4 hover:text-foreground hover:underline"
          >
            Regras do bolão
          </Link>
        </nav>
      </div>
    </footer>
  );
}

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Admin — Bolão Copa 2026",
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/entrar");
  }

  // Per architecture.md §2.4 / §6: any user who admins at least one pool may
  // edit any match score, because match data is global. Non-admins get a 404
  // — there is no admin-area landing page to show them.
  const { data: ownsAnyPool } = await supabase
    .from("pool")
    .select("id")
    .eq("admin_id", user.id)
    .limit(1)
    .maybeSingle();

  if (!ownsAnyPool) {
    notFound();
  }

  return (
    <>
      <header className="border-b bg-muted/40">
        <div className="mx-auto max-w-3xl flex h-12 items-center justify-between px-4">
          <Link href="/" className="text-sm font-semibold tracking-tight">
            ← Sair do admin
          </Link>
          <span className="text-xs uppercase tracking-wider text-muted-foreground">
            Admin
          </span>
        </div>
      </header>
      <div className="flex-1">{children}</div>
    </>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PoolSwitcher } from "@/components/pool-switcher";
import { UserMenu } from "@/components/user-menu";
import { MobileNav } from "@/components/mobile-nav";

export default async function AppLayout({
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

  const { data: profile } = await supabase
    .from("profile")
    .select("name")
    .eq("id", user.id)
    .maybeSingle();

  const displayName = profile?.name ?? user.email ?? "Você";

  return (
    <>
      <header className="border-b">
        <div className="mx-auto max-w-5xl flex h-14 items-center justify-between px-4 gap-4">
          <Link href="/" className="font-semibold tracking-tight">
            Bolão Copa 2026
          </Link>
          <div className="flex items-center gap-3">
            <PoolSwitcher pools={[]} />
            <UserMenu name={displayName} />
          </div>
        </div>
      </header>

      <div className="flex-1 pb-16 md:pb-0">{children}</div>

      <MobileNav />
    </>
  );
}

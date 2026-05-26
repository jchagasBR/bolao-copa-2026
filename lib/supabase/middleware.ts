import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATH_PREFIXES = ["/entrar", "/cadastro", "/recuperar", "/auth"];
const ACTIVE_POOL_COOKIE = "active_pool_id";

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const onAuthPage = pathname === "/entrar" || pathname === "/cadastro";

  if (!user && !isPublicPath(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/entrar";
    return NextResponse.redirect(url);
  }

  if (user && onAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  // Set a default active_pool_id when the cookie is missing — the user's most
  // recently joined pool. Skipped on the auth pages and the /boloes/* flow
  // (the join action sets the cookie itself).
  if (user && !request.cookies.get(ACTIVE_POOL_COOKIE) && !isPublicPath(pathname)) {
    const { data: membership } = await supabase
      .from("pool_member")
      .select("pool_id, joined_at")
      .eq("user_id", user.id)
      .order("joined_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (membership?.pool_id) {
      response.cookies.set(ACTIVE_POOL_COOKIE, membership.pool_id, {
        path: "/",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 365,
      });
    }
  }

  return response;
}

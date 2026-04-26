import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function middleware(request: NextRequest) {
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
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const { data: { user } } = await supabase.auth.getUser();
  const pathname = request.nextUrl.pathname;

  const isLoginPage = pathname === '/login';
  const isAuthRoute = pathname.startsWith('/api/auth');

  // Se não tem user e não está na página de login/auth → manda pra login
  if (!user && !isLoginPage && !isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // Se está logado mas na página de login → redireciona pra dashboard
  if (user && isLoginPage) {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    return NextResponse.redirect(url);
  }

  // Página pública: aceitar convite (não exige sessão)
  const isAcceptInvite = pathname === '/accept-invite';

  // Se está logado, verifica se é admin (qualquer perfil admin*)
  if (user && !isLoginPage && !isAuthRoute && !isAcceptInvite) {
    const { data: userRow } = await supabase
      .from('users')
      .select('role, is_active')
      .eq('id', user.id)
      .single();

    const ADMIN_ROLES = ['admin', 'admin_financial', 'admin_support'];
    const isActiveAdmin = !!userRow && userRow.is_active && ADMIN_ROLES.includes(userRow.role);

    if (!isActiveAdmin) {
      await supabase.auth.signOut();
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('error', 'not_admin');
      return NextResponse.redirect(url);
    }

    // Gating por rota — só super-admin acessa /team e /users
    if (userRow.role !== 'admin' && (pathname === '/team' || pathname.startsWith('/team/') ||
                                      pathname === '/users' || pathname.startsWith('/users/'))) {
      const url = request.nextUrl.clone();
      url.pathname = '/';
      url.searchParams.set('error', 'forbidden');
      return NextResponse.redirect(url);
    }
    // Financeiro não acessa /support nem /errors nem /invites
    if (userRow.role === 'admin_financial' &&
        (pathname.startsWith('/support') || pathname.startsWith('/errors') ||
         pathname.startsWith('/invites'))) {
      const url = request.nextUrl.clone();
      url.pathname = '/costs';
      return NextResponse.redirect(url);
    }
    // Suporte não acessa /costs nem /ai-costs (mas acessa /invites)
    if (userRow.role === 'admin_support' &&
        (pathname.startsWith('/costs') || pathname.startsWith('/ai-costs'))) {
      const url = request.nextUrl.clone();
      url.pathname = '/support';
      return NextResponse.redirect(url);
    }
  }

  // Permite /accept-invite mesmo sem estar logado
  if (!user && isAcceptInvite) {
    return response;
  }

  return response;
}

export const config = {
  matcher: [
    // Roda em tudo, exceto arquivos estáticos e APIs do Next
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

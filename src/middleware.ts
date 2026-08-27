import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";

/**
 * Protege todas as rotas.
 *
 * Diferente do sistema de referência, `/api/assets` NÃO é público: lá o
 * Chromium que gerava o PDF precisava abrir as imagens sem cookie. Aqui as
 * referências visuais só são lidas pelo navegador de quem está logado e pelo
 * servidor, que fala com o banco diretamente.
 */
const PUBLIC_PATHS = ["/login", "/api/auth/login"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const user = token ? await verifySessionToken(token) : null;

  if (isPublic) {
    if (pathname === "/login" && user) {
      return NextResponse.redirect(new URL("/projetos", request.url));
    }
    return NextResponse.next();
  }

  if (!user) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }
    const login = new URL("/login", request.url);
    login.searchParams.set("next", pathname);
    return NextResponse.redirect(login);
  }

  return NextResponse.next();
}

export const config = {
  // Arquivos estáticos ficam fora do middleware — inclusive as fontes, que de
  // outro modo seriam redirecionadas para o login.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp|avif|ico|woff2?|ttf|otf)$).*)",
  ],
};

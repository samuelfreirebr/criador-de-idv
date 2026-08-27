import { AppShell } from "@/components/AppShell";
import { SidebarProjetos } from "@/components/SidebarProjetos";
import { listarProjetos } from "@/lib/queries";

/**
 * Toda tela autenticada é dinâmica: depende do cookie de sessão e lê o banco.
 * Sem esta linha o build tentaria pré-renderizar a lista de projetos e falharia
 * por não ter banco no ambiente de compilação.
 */
export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const projetos = await listarProjetos();
  return <AppShell sidebar={<SidebarProjetos projetos={projetos} />}>{children}</AppShell>;
}

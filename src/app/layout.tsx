import type { Metadata } from "next";
import { Archivo, Inter } from "next/font/google";
import "./globals.css";

/*
 * As fontes são baixadas em tempo de build e servidas pelo próprio app — nada
 * de CDN em produção. A Archivo entra por causa do itálico verdadeiro: o
 * logotipo depende dele, e um itálico sintetizado pelo navegador inclina a
 * letra normal e distorce a espessura dos traços.
 */
const interface_ = Inter({
  subsets: ["latin"],
  variable: "--fonte-interface",
  display: "swap",
});

const display = Archivo({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  style: ["normal", "italic"],
  variable: "--fonte-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: "IDPRO",
  description: "Gerador de ideias e prompts de identidade visual.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${interface_.variable} ${display.variable}`}>
      <body>{children}</body>
    </html>
  );
}

"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Aviso, Button, Input, Label, Spinner } from "@/components/ui";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      const resposta = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, senha }),
      });
      // Ler como texto antes de tentar o JSON: uma resposta de erro do próprio
      // Next vem em HTML, e `resposta.json()` estouraria direto no `catch`
      // abaixo — que culparia a rede por um problema de servidor.
      const bruto = await resposta.text();
      let json: { error?: string } = {};
      try {
        json = JSON.parse(bruto) as { error?: string };
      } catch {
        if (!resposta.ok) {
          setErro(`O servidor respondeu ${resposta.status} sem detalhar o motivo. Veja o terminal onde o app está rodando.`);
          return;
        }
      }
      if (!resposta.ok) {
        setErro(json.error ?? "Não foi possível entrar.");
        return;
      }
      // `refresh` antes de navegar: sem ele o layout ainda renderiza com a
      // sessão anterior (ausente) e a primeira tela pisca vazia.
      router.replace(params.get("next") || "/projetos");
      router.refresh();
    } catch {
      setErro("Falha de conexão. Tente de novo.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={enviar} className="space-y-4">
      <div>
        <Label>E-mail</Label>
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          autoFocus
          required
        />
      </div>
      <div>
        <Label>Senha</Label>
        <Input
          type="password"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          autoComplete="current-password"
          required
        />
      </div>
      {erro ? <Aviso>{erro}</Aviso> : null}
      <Button type="submit" variant="primaria" className="w-full" disabled={enviando}>
        {enviando ? <Spinner /> : null}
        Entrar
      </Button>
    </form>
  );
}

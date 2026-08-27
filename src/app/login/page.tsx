import { Suspense } from "react";
import { Logo } from "@/components/Logo";
import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="mb-10 text-center">
          <Logo tamanho="lg" />
          <p className="mt-4 text-sm leading-relaxed text-ink-400">
            Ideias e prompts de identidade visual,
            <br />
            do briefing ao gerador de imagem.
          </p>
        </div>
        {/* `useSearchParams` obriga a uma fronteira de Suspense para que a
            casca da página continue podendo ser gerada estaticamente. */}
        <Suspense fallback={<div className="h-64" />}>
          <LoginForm />
        </Suspense>
      </div>
      <div className="fio-marca mt-16 h-px w-full max-w-sm opacity-60" aria-hidden />
    </main>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { Icon } from "@/blocos/_shared/icons";

export function LogoutButton() {
  const router = useRouter();

  async function sair() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={sair}
      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-ink-400 transition hover:bg-ink-850 hover:text-ink-50"
    >
      <Icon name="sair" size={16} />
      Sair
    </button>
  );
}

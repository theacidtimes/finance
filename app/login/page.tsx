"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);

  const entrar = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
    setLoading(false);
    if (error) {
      toast.error("E-mail ou senha inválidos.");
      return;
    }
    router.replace("/");
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center px-5">
      <form onSubmit={entrar} className="w-full max-w-sm">
        <div className="flex items-baseline gap-3 mb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo_acid_tight.png" alt="ACID" className="h-8 w-auto" />
          <span className="font-display text-2xl leading-none uppercase tracking-[0.18em] font-light">
            Finance
          </span>
        </div>

        <label className="block text-xs uppercase tracking-widest text-neutral-400 mb-1">E-mail</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          className="w-full mb-4 rounded-md bg-neutral-900 border border-neutral-700 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-acid"
        />

        <label className="block text-xs uppercase tracking-widest text-neutral-400 mb-1">Senha</label>
        <input
          type="password"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          required
          autoComplete="current-password"
          className="w-full mb-6 rounded-md bg-neutral-900 border border-neutral-700 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-acid"
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-acid text-neutral-900 font-semibold py-2.5 text-sm hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "Entrando…" : "Entrar"}
        </button>

        <p className="text-xs text-neutral-500 mt-6 text-center">
          Ferramenta interna — acesso por convite. Operado por The Acid Times.
        </p>
      </form>
    </div>
  );
}

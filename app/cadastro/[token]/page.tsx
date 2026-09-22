import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { conviteAberto } from "@/lib/friends";
import { FriendAutocadastro } from "@/components/FriendAutocadastro";
import type { DadosAutocadastro } from "@/types";

export const dynamic = "force-dynamic";

// Link pessoal: não entra em buscador nem em prévia de rede social.
export const metadata: Metadata = {
  title: "Cadastro de fornecedor — ACID",
  robots: { index: false, follow: false },
};

function Aviso({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-5">
      <div className="max-w-md text-center space-y-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo_acid_tight.png" alt="ACID" className="h-8 w-auto mx-auto mb-6" />
        <h1 className="font-heading text-xl font-semibold">{titulo}</h1>
        <p className="text-sm text-muted-foreground">{texto}</p>
      </div>
    </div>
  );
}

export default async function CadastroFriendPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!/^[0-9a-f]{64}$/.test(token)) {
    return <Aviso titulo="Link inválido" texto="Confira o endereço ou peça um novo link à ACID." />;
  }

  const { data: convite } = await createAdminClient()
    .from("friend_invites")
    .select("status, expira_em, dados")
    .eq("token", token)
    .maybeSingle();

  if (!convite) {
    return <Aviso titulo="Link inválido" texto="Confira o endereço ou peça um novo link à ACID." />;
  }
  if (convite.status === "aprovado") {
    return (
      <Aviso
        titulo="Cadastro aprovado"
        texto="Seu cadastro já está na ACID. Para mudar algum dado, fale com quem te mandou o link."
      />
    );
  }
  if (!conviteAberto({ status: convite.status, expiraEm: convite.expira_em })) {
    return (
      <Aviso titulo="Link expirado" texto="Este link não vale mais. Peça um novo à ACID." />
    );
  }

  return (
    <FriendAutocadastro
      token={token}
      jaEnviado={convite.status === "recebido"}
      // Só o que a própria pessoa enviou por este link — para corrigir e reenviar.
      inicial={(convite.dados as DadosAutocadastro | null) ?? null}
    />
  );
}

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Permissions, Role } from "@/types";

export const dynamic = "force-dynamic";

/** Garante que o chamador está autenticado e é master. */
async function requireMaster() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: NextResponse.json({ error: "Não autenticado." }, { status: 401 }) };
  }
  const { data } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (data?.role !== "master") {
    return {
      error: NextResponse.json({ error: "Acesso restrito ao master." }, { status: 403 }),
    };
  }
  return { userId: user.id };
}

// Criar usuário
export async function POST(req: Request) {
  const gate = await requireMaster();
  if ("error" in gate) return gate.error;

  let body: {
    email?: string;
    senha?: string;
    nome?: string;
    role?: string;
    permissions?: Permissions;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const email = (body.email ?? "").trim().toLowerCase();
  const senha = body.senha ?? "";
  const nome = (body.nome ?? "").trim();
  if (!email || senha.length < 6) {
    return NextResponse.json(
      { error: "Informe e-mail e uma senha de ao menos 6 caracteres." },
      { status: 400 }
    );
  }
  const role: Role = body.role === "master" ? "master" : "gestor";
  const permissions: Permissions =
    body.permissions && typeof body.permissions === "object" ? body.permissions : {};

  let admin;
  try {
    admin = createAdminClient();
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
    user_metadata: { nome, role, permissions },
  });
  if (error || !data.user) {
    return NextResponse.json(
      { error: error?.message ?? "Falha ao criar usuário." },
      { status: 400 }
    );
  }

  // O trigger handle_new_user já cria o profile; garantimos consistência.
  await admin
    .from("profiles")
    .upsert({ id: data.user.id, email, nome, role, permissions });

  return NextResponse.json({ id: data.user.id });
}

// Trocar a senha de um usuário. O app não tem fluxo de recuperação por e-mail;
// quem esquece a senha pede a um master para redefini-la aqui.
export async function PATCH(req: Request) {
  const gate = await requireMaster();
  if ("error" in gate) return gate.error;

  let body: { id?: string; senha?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const id = (body.id ?? "").trim();
  const senha = body.senha ?? "";
  if (!id) return NextResponse.json({ error: "id obrigatório." }, { status: 400 });
  if (senha.length < 6) {
    return NextResponse.json(
      { error: "A senha precisa ter ao menos 6 caracteres." },
      { status: 400 }
    );
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }

  const { error } = await admin.auth.admin.updateUserById(id, { password: senha });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

// Apagar usuário
export async function DELETE(req: Request) {
  const gate = await requireMaster();
  if ("error" in gate) return gate.error;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id obrigatório." }, { status: 400 });
  if (id === gate.userId) {
    return NextResponse.json({ error: "Você não pode apagar a si mesmo." }, { status: 400 });
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }

  // Apagar o auth.user cascateia para o profile (on delete cascade).
  const { error } = await admin.auth.admin.deleteUser(id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
